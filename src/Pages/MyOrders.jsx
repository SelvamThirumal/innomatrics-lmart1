import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase'; // Assuming correct path to firebase config

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // NOTE: You must have user authentication context (e.g., Firebase auth)
  // to get the current user's ID (e.g., 'currentUserId') here.
  const currentUserId = 'USER_ID_PLACEHOLDER'; // 👈 **MUST BE REPLACED WITH ACTUAL USER ID**

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      // Redirect to login or show a message
      return; 
    }
    
    const fetchOrders = async () => {
      try {
        const ordersRef = collection(db, "orders");
        // Query orders that belong to the current user, ordered by creation date
        const q = query(
          ordersRef, 
          where("customerInfo.userId", "==", currentUserId), 
          orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedOrders = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setOrders(fetchedOrders);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUserId]);

  if (loading) {
    return <div className="text-center py-20">Loading your orders...</div>;
  }
  
  if (orders.length === 0) {
    return <div className="text-center py-20">You haven't placed any orders yet.</div>;
  }

  return (
    <div className="container mx-auto p-4 py-12">
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>
      
      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-white p-6 shadow-lg rounded-xl border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-lg font-semibold">Order ID: {order.orderId}</p>
                <p className="text-gray-500">Date: {new Date(order.createdAt?.toDate()).toLocaleDateString()}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium 
                ${order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                  order.status === 'returned' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`
              }>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
            
            <p className="text-2xl font-bold text-green-600 mb-4">₹{order.amount?.toFixed(2)}</p>
            
            <div className="mt-4 flex gap-3">
              <button 
                onClick={() => navigate(`/invoice?orderId=${order.id}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Details
              </button>
              
              {/* Return button logic: Show only for Confirmed/Shipped orders */}
              {order.status === 'confirmed' && (
                <button 
                  onClick={() => navigate(`/return/${order.id}`)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Return Order
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyOrders;