import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase'; // Assuming correct path

const ReturnOrderForm = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [returnItems, setReturnItems] = useState({}); // { itemId: quantity, ... }
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const returnReasons = [
    "Defective or damaged product",
    "Wrong item received",
    "Item no longer needed",
    "Product size/fit issue",
    "Other"
  ];

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const docRef = doc(db, "orders", orderId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() });
          
          // Initialize return items state with 0 quantity for each item
          const initialReturn = docSnap.data().items.reduce((acc, item, index) => {
            acc[index] = 0; // Use index as a simple item ID for this context
            return acc;
          }, {});
          setReturnItems(initialReturn);

        } else {
          alert("Order not found or invalid ID.");
          navigate('/my-orders');
        }
      } catch (error) {
        console.error("Error fetching order for return:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, navigate]);

  const handleQuantityChange = (index, maxQuantity, value) => {
    const qty = Math.max(0, Math.min(maxQuantity, parseInt(value) || 0));
    setReturnItems(prev => ({
      ...prev,
      [index]: qty
    }));
  };
  
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    
    const itemsToReturn = Object.keys(returnItems)
      .filter(key => returnItems[key] > 0)
      .map(index => ({
        ...order.items[index], // Original item data
        returnQuantity: returnItems[index],
        originalIndex: index
      }));

    if (itemsToReturn.length === 0 || !reason) {
      alert("Please select at least one item and a reason for return.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create a new document in the 'returns' collection
      await addDoc(collection(db, "returns"), {
        originalOrderId: order.id,
        orderIdDisplay: order.orderId,
        customerInfo: order.customerInfo,
        items: itemsToReturn,
        reason: reason,
        notes: notes,
        status: "requested", // Initial status for return
        requestedAt: serverTimestamp(),
      });
      
      setSubmissionSuccess(true);
    } catch (error) {
      console.error("Error submitting return request:", error);
      alert("Failed to submit return request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20">Loading order details...</div>;
  }
  
  if (submissionSuccess) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-green-50">
              <div className="text-center p-8 bg-white rounded-lg shadow-xl">
                  <h2 className="text-3xl font-bold text-green-600 mb-4">Return Request Submitted!</h2>
                  <p className="text-gray-600 mb-6">Your return request for Order **{order.orderId}** has been successfully recorded.</p>
                  <p className="text-gray-600 mb-6">We will review your request and contact you soon.</p>
                  <button 
                      onClick={() => navigate('/my-orders')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                      Go to My Orders
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="container mx-auto p-4 py-12 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Return Order: {order?.orderId}</h1>
      
      <form onSubmit={handleReturnSubmit} className="bg-white p-6 shadow-xl rounded-xl">
        
        {/* Item Selection Section */}
        <h2 className="text-xl font-semibold mb-4">Items to Return</h2>
        <div className="space-y-4 mb-8 border p-4 rounded-lg">
            {order?.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <span className="font-medium">{item.name} (Max: {item.quantity || 1})</span>
                    <input
                        type="number"
                        min="0"
                        max={item.quantity || 1}
                        value={returnItems[index]}
                        onChange={(e) => handleQuantityChange(index, item.quantity || 1, e.target.value)}
                        className="w-20 p-2 border rounded-lg text-center"
                    />
                </div>
            ))}
        </div>

        {/* Reason Selection */}
        <h2 className="text-xl font-semibold mb-4">Reason for Return *</h2>
        <div className="mb-8 space-y-2">
            {returnReasons.map((r, i) => (
                <label key={i} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                    <input
                        type="radio"
                        name="returnReason"
                        value={r}
                        checked={reason === r}
                        onChange={(e) => setReason(e.target.value)}
                        className="text-orange-600 focus:ring-orange-500"
                    />
                    <span>{r}</span>
                </label>
            ))}
        </div>

        {/* Additional Notes */}
        <div className="mb-8">
            <label className="block text-sm font-medium mb-2">Additional Notes (Optional)</label>
            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Details about the condition of the item..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                rows="3"
            />
        </div>

        <button
            type="submit"
            disabled={submitting || Object.values(returnItems).every(qty => qty === 0) || !reason}
            className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
            {submitting ? 'Submitting...' : 'Submit Return Request'}
        </button>
      </form>
    </div>
  );
};

export default ReturnOrderForm;