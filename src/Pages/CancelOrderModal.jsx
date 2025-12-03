import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const CancelOrderModal = ({ orderData, onClose, onCancelSuccess }) => {
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');

  const cancelReasons = [
    "Changed my mind",
    "Found better price elsewhere",
    "Order created by mistake",
    "Delivery time too long",
    "Product not required anymore",
    "Payment issue",
    "Other reason"
  ];

  const handleCancelOrder = async () => {
    if (!reason.trim()) {
      alert('Please select a cancellation reason');
      return;
    }

    setCancelling(true);
    try {
      // Update order in Firestore
      await updateDoc(doc(db, "orders", orderData.id), {
        status: "cancelled",
        cancellationReason: reason,
        additionalNotes: additionalNotes,
        cancelledAt: new Date()
      });

      onCancelSuccess();
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Failed to cancel order. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Cancel Order</h2>
          <p className="text-gray-600 mb-6">
            Are you sure you want to cancel order <strong>{orderData.orderId}</strong>?
          </p>

          {/* Cancellation Reasons */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Reason for cancellation *
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cancelReasons.map((cancelReason, index) => (
                <label key={index} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="radio"
                    name="cancellationReason"
                    value={cancelReason}
                    checked={reason === cancelReason}
                    onChange={(e) => setReason(e.target.value)}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>{cancelReason}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Please provide any additional details..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows="3"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={cancelling}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Go Back
            </button>
            <button
              onClick={handleCancelOrder}
              disabled={cancelling || !reason.trim()}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelOrderModal;