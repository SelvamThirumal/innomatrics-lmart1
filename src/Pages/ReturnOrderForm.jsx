import React, { useState } from 'react';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { X, Package, AlertCircle } from 'lucide-react';

const ReturnOrderModal = ({ orderData, onClose, onReturnSuccess }) => {
  const [reason, setReason] = useState('');
  const [returnItems, setReturnItems] = useState({});
  const [notes, setNotes] = useState('');
  const [returning, setReturning] = useState(false);
  const navigate = useNavigate();

  const returnReasons = [
    "Defective or damaged product",
    "Wrong item received",
    "Item no longer needed",
    "Product size/fit issue",
    "Quality not as expected",
    "Other reason"
  ];

  // Initialize return items
  React.useEffect(() => {
    if (orderData?.items) {
      const initialReturn = orderData.items.reduce((acc, item, index) => {
        acc[index] = 0;
        return acc;
      }, {});
      setReturnItems(initialReturn);
    }
  }, [orderData]);

  const handleQuantityChange = (index, maxQuantity, value) => {
    const qty = Math.max(0, Math.min(maxQuantity, parseInt(value) || 0));
    setReturnItems(prev => ({
      ...prev,
      [index]: qty
    }));
  };

  const handleReturnOrder = async () => {
    const itemsToReturn = Object.keys(returnItems)
      .filter(key => returnItems[key] > 0)
      .map(index => ({
        ...orderData.items[index],
        returnQuantity: returnItems[index],
        originalIndex: index
      }));

    if (itemsToReturn.length === 0 || !reason) {
      alert('Please select at least one item and a reason for return.');
      return;
    }

    setReturning(true);
    try {
      const currentUserId = localStorage.getItem('token');
      
      if (!currentUserId) {
        alert('User not authenticated');
        return;
      }

      // 1. Create return request
      await addDoc(collection(db, "returns"), {
        originalOrderId: orderData.id,
        orderIdDisplay: orderData.orderId,
        userId: currentUserId,
        customerInfo: orderData.customerInfo,
        items: itemsToReturn,
        reason: reason,
        notes: notes,
        status: "requested",
        requestedAt: serverTimestamp(),
      });

      // 2. Update order status
      const orderDocRef = doc(db, "users", currentUserId, "orders", orderData.id);
      await updateDoc(orderDocRef, {
        status: 'returned',
        returnRequestedAt: new Date(),
      });

      // Call success handler
      onReturnSuccess();
      
      // Show success message
      alert(`✅ Return request for Order ${orderData.orderId} has been submitted successfully!`);
      
      // Redirect to orders page after 2 seconds
      setTimeout(() => {
        navigate('/my-orders');
      }, 2000);

    } catch (error) {
      console.error('Error submitting return request:', error);
      alert('Failed to submit return request. Please try again.');
    } finally {
      setReturning(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const dateObj = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
      if (isNaN(dateObj.getTime())) return 'Invalid Date';
      return dateObj.toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-slideUp max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-orange-600" />
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Return Order</h2>
                <p className="text-gray-600 mt-1">Order ID: <span className="font-semibold">{orderData.orderId || orderData.id}</span></p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={returning}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Order Summary */}
          <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Order Date</p>
                <p className="font-medium">{formatDate(orderData.createdAt || new Date())}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="font-medium text-lg">₹{orderData.amount?.toFixed(2) || "0.00"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Current Status</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold mt-1 ${
                  orderData.status?.toLowerCase() === 'cancelled' ? 'bg-red-100 text-red-800' : 
                  orderData.status?.toLowerCase() === 'returned' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                }`}>
                  {orderData.status || "Confirmed"}
                </span>
              </div>
            </div>
          </div>

          {/* Items to Return */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Items to Return</h3>
            <div className="space-y-4">
              {orderData?.items?.map((item, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Price: ₹{item.price?.toFixed(2) || "0.00"} × {item.quantity || 1}
                      </p>
                      {(item.selectedColor || item.selectedSize || item.selectedRam) && (
                        <p className="text-xs text-gray-500 mt-1">
                          Customization: {[
                            item.selectedColor && `Color: ${item.selectedColor}`,
                            item.selectedSize && `Size: ${item.selectedSize}`,
                            item.selectedRam && `RAM: ${item.selectedRam}`
                          ].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Return Qty</p>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => handleQuantityChange(index, item.quantity || 1, returnItems[index] - 1)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                            disabled={returnItems[index] <= 0}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max={item.quantity || 1}
                            value={returnItems[index]}
                            onChange={(e) => handleQuantityChange(index, item.quantity || 1, e.target.value)}
                            className="w-16 p-2 border rounded-lg text-center"
                          />
                          <button
                            onClick={() => handleQuantityChange(index, item.quantity || 1, returnItems[index] + 1)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                            disabled={returnItems[index] >= (item.quantity || 1)}
                          >
                            +
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Max: {item.quantity || 1}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Return Reason */}
          <div className="mb-6">
            <label className="block text-lg font-semibold text-gray-800 mb-3">
              Reason for Return <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {returnReasons.map((returnReason, index) => (
                <label 
                  key={index} 
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    reason === returnReason 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="returnReason"
                    value={returnReason}
                    checked={reason === returnReason}
                    onChange={(e) => setReason(e.target.value)}
                    className="text-orange-600 focus:ring-orange-500 h-4 w-4"
                  />
                  <span className="text-gray-700 flex-1">{returnReason}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="mb-6">
            <label className="block text-lg font-semibold text-gray-800 mb-2">
              Additional Notes <span className="text-gray-500 font-normal text-sm">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Please provide details about the condition of items, any issues faced, or other relevant information..."
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              rows="4"
            />
          </div>

          {/* Important Note */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-800">Important Information</p>
                <ul className="text-blue-700 text-sm mt-2 space-y-1">
                  <li>• Return requests will be processed within 3-5 business days</li>
                  <li>• Items must be in original condition with all accessories</li>
                  <li>• Refunds will be issued to your original payment method</li>
                  <li>• You'll receive an email with pickup details once approved</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={returning}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all font-medium"
            >
              Go Back
            </button>
            <button
              onClick={handleReturnOrder}
              disabled={returning || !reason.trim() || Object.values(returnItems).every(qty => qty === 0)}
              className={`flex-1 px-6 py-3 text-white rounded-xl font-medium transition-all ${
                returning || !reason.trim() || Object.values(returnItems).every(qty => qty === 0)
                  ? 'bg-orange-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md hover:shadow-lg'
              }`}
            >
              {returning ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : 'Submit Return Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnOrderModal;