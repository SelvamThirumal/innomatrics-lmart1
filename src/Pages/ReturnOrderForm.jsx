import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import emailjs from "@emailjs/browser";
import { X, Package, AlertCircle } from 'lucide-react';

const ReturnOrderModal = ({ orderData, onClose, onReturnSuccess }) => {
  const [reason, setReason] = useState('');
  const [returnItems, setReturnItems] = useState({});
  const [notes, setNotes] = useState('');
  const [returning, setReturning] = useState(false);
  const navigate = useNavigate();

  const returnReasons = [
    "Defective oeived",
    "Item no longer needed",
    "Product size/fit issue",
    "Quality not as expected",
    "Other reason"
  ];

  // Initialize qty selectors
  useEffect(() => {
    if (orderData?.items) {
      const initial = {};
      orderData.items.forEach((item, i) => (initial[i] = 0));
      setReturnItems(initial);
    }
  }, [orderData]);

  const handleQuantityChange = (index, max, value) => {
    const qty = Math.max(0, Math.min(max, parseInt(value) || 0));
    setReturnItems(prev => ({ ...prev, [index]: qty }));
  };

  // ----------------------------
  // 📧 SEND AUTO-REPLY EMAIL
  // ----------------------------
// ----------------------------
// 📧 SEND AUTO-REPLY EMAIL
// ----------------------------
const sendReturnAutoEmail = async (itemsToReturn) => {
  // Format returned items
  let itemsFormatted = "";
  itemsToReturn.forEach(item => {
    itemsFormatted += `• ${item.name}\n  Qty: ${item.returnQuantity}\n  Price: ₹${item.price}\n\n`;
  });

  // Customer email fallback
  const customerEmail =
    orderData.customerInfo?.email ||
    orderData.email ||
    "no-reply@example.com";

  console.log("📧 Sending return mail to:", customerEmail);

  // MUST MATCH TEMPLATE VARIABLES
  const emailParams = {
    to_name: orderData.customerInfo?.name || "Customer",

    // recipient (send all to avoid 422 errors)
    to_email: customerEmail,
    email: customerEmail,
    user_email: customerEmail,
    reply_to: customerEmail,

    order_id: orderData.orderId,
    amount: orderData.amount?.toFixed(2) || "0.00",
    reason: reason,
    description: notes || "No description provided",
    requested_at: new Date().toLocaleString(),
    items: itemsFormatted,
  };

  try {
    await emailjs.send(
      "service_nrnogjw",
      "template_nu122vv",
      emailParams,
      "N-iKTMZxu6PFUqOpU"
    );

    console.log("✅ Return request auto-reply sent successfully");

  } catch (error) {
    console.error("❌ Email sending failed:", error);
  }
};


  // ----------------------------
  // SUBMIT RETURN REQUEST
  // ----------------------------
  const handleReturnOrder = async () => {
    const itemsToReturn = Object.keys(returnItems)
      .filter(key => returnItems[key] > 0)
      .map(index => ({
        ...orderData.items[index],
        returnQuantity: returnItems[index],
        originalIndex: index
      }));

    if (itemsToReturn.length === 0 || !reason.trim()) {
      alert("Please select at least one item & a reason.");
      return;
    }

    setReturning(true);

    try {
      const userId = localStorage.getItem("token");
      if (!userId) return alert("User not logged in!");

      // 1️⃣ Save request
      await addDoc(collection(db, "returns"), {
        originalOrderId: orderData.id,
        orderIdDisplay: orderData.orderId,
        userId,
        customerInfo: orderData.customerInfo,
        items: itemsToReturn,
        reason,
        notes,
        status: "requested",
        requestedAt: serverTimestamp(),
      });

      // 2️⃣ Update order status
      await updateDoc(doc(db, "users", userId, "orders", orderData.id), {
        status: "returned",
        returnRequestedAt: new Date(),
      });

      // 3️⃣ Send email
      await sendReturnAutoEmail(itemsToReturn);

      // 4️⃣ UI updates
      onReturnSuccess();
      alert(`Return request for Order ${orderData.orderId} submitted successfully.`);
      setTimeout(() => navigate("/my-orders"), 1000);

    } catch (error) {
      console.error(error);
      alert("Failed to submit return request.");
    } finally {
      setReturning(false);
    }
  };

  const formatDate = (date) => {
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString("en-GB");
    } catch {
      return "N/A";
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
                <h2 className="text-2xl font-bold">Return Order</h2>
                <p className="text-gray-600">Order ID: <b>{orderData.orderId}</b></p>
              </div>
            </div>
            <button onClick={onClose} disabled={returning} className="p-2 rounded-full hover:bg-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Order Summary */}
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <p><b>Order Date:</b> {formatDate(orderData.createdAt)}</p>
            <p><b>Total Amount:</b> ₹{orderData.amount?.toFixed(2)}</p>
          </div>

          {/* Items Selection */}
          <h3 className="text-lg font-semibold mb-3">Select Items to Return</h3>
          <div className="space-y-4 mb-6">
            {orderData.items.map((item, index) => (
              <div key={index} className="border p-3 rounded-xl bg-gray-50">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">₹{item.price} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={returnItems[index] <= 0}
                      onClick={() => handleQuantityChange(index, item.quantity, returnItems[index] - 1)}
                      className="w-8 h-8 border rounded-full"
                    >−</button>

                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={returnItems[index]}
                      onChange={(e) => handleQuantityChange(index, item.quantity, e.target.value)}
                      className="w-14 border rounded text-center"
                    />

                    <button
                      disabled={returnItems[index] >= item.quantity}
                      onClick={() => handleQuantityChange(index, item.quantity, returnItems[index] + 1)}
                      className="w-8 h-8 border rounded-full"
                    >+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reason */}
          <h3 className="text-lg font-semibold mb-2">Reason for Return *</h3>
          <div className="space-y-2 mb-6">
            {returnReasons.map((r, idx) => (
              <label key={idx} className="flex items-center gap-2 p-2 border rounded-lg">
                <input type="radio" name="returnReason" value={r} checked={reason === r} onChange={(e) => setReason(e.target.value)} />
                {r}
              </label>
            ))}
          </div>

          {/* Notes */}
          <textarea
            placeholder="Additional notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border p-3 rounded-xl mb-6"
            rows="3"
          />

          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={onClose} disabled={returning} className="flex-1 border py-3 rounded-xl">
              Cancel
            </button>

            <button
              disabled={returning || !reason || Object.values(returnItems).every(q => q === 0)}
              onClick={handleReturnOrder}
              className="flex-1 bg-orange-600 text-white py-3 rounded-xl hover:bg-orange-700"
            >
              {returning ? "Submitting..." : "Submit Return Request"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ReturnOrderModal;