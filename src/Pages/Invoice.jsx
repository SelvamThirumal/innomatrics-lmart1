import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
// Import Firebase utilities
import { doc, getDoc, updateDoc } from 'firebase/firestore'; 
//  ADJUST THIS PATH IF NECESSARY
import { db } from '../../firebase'; 
import CancelOrderModal from './CancelOrderModal';
import ReturnOrderModal from './ReturnOrderForm';

const Invoice = () => {
  // 1. Get orderId from the URL search parameters
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  const navigate = useNavigate();
  // Get User ID from localStorage
  const currentUserId = localStorage.getItem('token'); 

  // 2. State for data fetching and component status
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  
  const invoiceRef = useRef();

  // --- Utility Functions ---

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      // Handle both Firebase Timestamp objects (if not converted) and Date objects/strings
      const dateObj = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
      if (isNaN(dateObj.getTime())) return 'Invalid Date';
      return dateObj.toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      }).replace(',', ' ');
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'N/A';
    }
  };
  
  // --- PRINT LOGIC ---
  
  const triggerPrint = useReactToPrint({
    content: () => {
        if (invoiceRef.current) {
            return invoiceRef.current;
        }
        return null;
    },
    documentTitle: `Invoice-${orderData?.orderId || 'Order'}`,
    pageStyle: `
      @page { size: A4; margin: 15mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print, .no-print * { display: none !important; }
        body * { visibility: hidden; }
        #invoice-content, #invoice-content * { visibility: visible; }
        #invoice-content { position: absolute; left: 0; top: 0; width: 100%; }
      }
    `,
    onAfterPrint: () => console.log('Printed successfully!'),
  });
  
  const handleImmediatePrint = () => {
    setTimeout(() => {
        if (invoiceRef.current) {
            triggerPrint();
        } else {
            console.error("Cannot print: Invoice content reference is missing after timeout.");
        }
    }, 100); 
  };

  // --- PDF DOWNLOAD FUNCTION using html2canvas + jsPDF ---
  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) {
      alert("Invoice content not available. Please try again.");
      return;
    }

    setGeneratingPDF(true);
    
    try {
      const input = invoiceRef.current;
      
      // Create canvas from invoice content
      const canvas = await html2canvas(input, {
        scale: 2, // Better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 190; // A4 width in mm (210mm - margins)
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 10; // Start position
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if content is long
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Download the PDF with order ID in filename
      const fileName = `Invoice-${orderData?.orderId || orderData?.id || 'Order'}.pdf`;
      pdf.save(fileName);
      
      console.log('PDF generated successfully:', fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try the print option instead.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // --- Data Fetching Effect ---

  useEffect(() => {
    if (!orderId || !currentUserId) {
      setLoading(false);
      setError("Order ID or User ID is missing.");
      return;
    }
    
    const fetchOrder = async () => {
      try {
        // Construct the document reference using the user ID and order ID
        const orderDocRef = doc(db, "users", currentUserId, "orders", orderId);
        const docSnap = await getDoc(orderDocRef);

        if (docSnap.exists()) {
          setOrderData({ id: docSnap.id, ...docSnap.data() });
          setError(null);
        } else {
          setError("No order found with this ID.");
        }
      } catch (err) {
        console.error("Error fetching order:", err);
        setError("Failed to load order details.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, currentUserId]);

  // --- Order Cancellation Handler ---

  const handleCancelOrder = () => {
    // Prevent cancellation if status is final or action is in progress
    if (!orderData || ['cancelled', 'returned'].includes(orderData.status?.toLowerCase())) return;
    
    // Show the modal instead of directly cancelling
    setShowCancelModal(true);
  };
  
  // --- Order Return Handler ---
  
  const handleReturnOrder = () => {
    // Prevent return if status is final or action is in progress
    if (!orderData || ['cancelled', 'returned'].includes(orderData.status?.toLowerCase())) return;
    
    // Show the return modal
    setShowReturnModal(true);
  };

  // --- Success Handler for Cancel Modal ---
  const handleCancelSuccess = () => {
    // Update local state to reflect cancellation
    setOrderData(prev => ({ 
      ...prev, 
      status: 'cancelled',
      cancelledAt: new Date()
    }));
    
    // Close the modal
    setShowCancelModal(false);
  };

  // --- Success Handler for Return Modal ---
  const handleReturnSuccess = () => {
    // Update local state to reflect return
    setOrderData(prev => ({ 
      ...prev, 
      status: 'returned',
      returnRequestedAt: new Date()
    }));
    
    // Close the modal
    setShowReturnModal(false);
  };

  // --- Render Logic (Loading/Error States) ---

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="text-white text-xl">Loading Order Details...</div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700">{error || "Order details could not be loaded."}</p>
          <button 
            onClick={() => navigate('/my-orders')}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back to Orders
          </button>
        </div>
      </div>
    );
  }

  // Determine normalized status for display and logic
  const normalizedStatus = orderData.status?.toLowerCase() || 'confirmed';
  const isFinalStatus = ['cancelled', 'returned'].includes(normalizedStatus);
  
  return (
    <div className="container mx-auto p-4 py-12">
        {/* Cancel Order Modal */}
        {showCancelModal && (
          <CancelOrderModal
            orderData={orderData}
            onClose={() => setShowCancelModal(false)}
            onCancelSuccess={handleCancelSuccess}
          />
        )}

        {/* Return Order Modal */}
        {showReturnModal && (
          <ReturnOrderModal
            orderData={orderData}
            onClose={() => setShowReturnModal(false)}
            onReturnSuccess={handleReturnSuccess}
          />
        )}
        
        {/* Header with Print/Download/Close Buttons */}
        <div className="flex justify-between items-center pb-6 border-b mb-6 no-print">
            <h1 className="text-3xl font-bold">Invoice Details</h1>
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={handleDownloadPDF}
                    disabled={generatingPDF}
                    className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${
                      generatingPDF ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                    {generatingPDF ? 'Generating PDF...' : 'Download PDF'}
                </button>
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                    Back to Orders
                </button>
            </div>
        </div>

        {/* Invoice Content (Reference for Printing) */}
        <div id="invoice-content" ref={invoiceRef} className="p-6 border rounded-lg bg-white shadow-lg">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2 text-gray-800">
              INVOICE: {orderData.orderId || orderData.id}
            </h2>
            <p className="text-gray-600">
              <strong>Date:</strong> {formatDate(orderData.createdAt || new Date())}
            </p>
            {orderData.cancelledAt && (
              <p className="text-red-600 mt-1">
                <strong>Cancelled Date:</strong> {formatDate(orderData.cancelledAt)}
              </p>
            )}
            {orderData.returnRequestedAt && (
              <p className="text-orange-600 mt-1">
                <strong>Return Requested Date:</strong> {formatDate(orderData.returnRequestedAt)}
              </p>
            )}
          </div>

          {/* Billing and Shipping Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-sm">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-gray-700">Billed to:</h3>
              <p className="font-medium text-gray-900">{orderData.customerInfo?.name || "N/A"}</p>
              <p className="text-gray-600">{orderData.customerInfo?.address || "N/A"}</p>
              <p className="text-gray-600">{orderData.customerInfo?.pincode || "N/A"}</p>
              <p className="text-gray-600">{orderData.customerInfo?.city || "N/A"}</p>
              <p className="text-blue-600 mt-1">{orderData.customerInfo?.email || "N/A"}</p>
              <p className="text-gray-600">{orderData.customerInfo?.phone || "N/A"}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg md:text-right">
              <h3 className="font-semibold mb-2 text-gray-700">From:</h3>
              <p className="font-medium text-gray-900">L-Mart</p>
              <p className="text-gray-600">Kamavarn Biraul, Darbhanga</p>
              <p className="text-gray-600">Bihar, India - 847203</p>
              <p className="text-blue-600 mt-1">support@lmart.example.com</p>
              <p className="text-gray-600">Phone: +91 9876543210</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left py-3 px-4 font-semibold border-b border-gray-300">Item Description</th>
                  <th className="text-center py-3 px-4 font-semibold border-b border-gray-300">Quantity</th>
                  <th className="text-right py-3 px-4 font-semibold border-b border-gray-300">Price</th>
                  <th className="text-right py-3 px-4 font-semibold border-b border-gray-300">Amount</th>
                </tr>
              </thead>
              <tbody>
                {orderData.items && orderData.items.length > 0 ? (
                  orderData.items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{item.name || "Product"}</p>
                          {(item.selectedColor || item.selectedSize || item.selectedRam) && (
                            <p className="text-xs text-gray-500">
                              Customization: {[
                                item.selectedColor && `Color: ${item.selectedColor}`,
                                item.selectedSize && `Size: ${item.selectedSize}`,
                                item.selectedRam && `RAM: ${item.selectedRam}`
                              ].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">{item.quantity || 1}</td>
                      <td className="text-right py-3 px-4">₹{item.price?.toFixed(2) || "0.00"}</td>
                      <td className="text-right py-3 px-4 font-medium">
                        ₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-gray-500">
                      No items in this order
                    </td>
                  </tr>
                )}
                
                {/* Total Row */}
                <tr className="bg-gray-100 font-bold">
                  <td colSpan="3" className="text-right py-4 px-4 border-t-2 border-gray-300">
                    Total Amount
                  </td>
                  <td className="text-right py-4 px-4 border-t-2 border-gray-300 text-lg">
                    ₹{orderData.amount?.toFixed(2) || "0.00"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Details */}
          <div className="border-t border-gray-300 pt-4 text-sm">
            <p className="mb-2">
              <strong className="text-gray-700">Payment Method:</strong> {orderData.paymentMethod || "N/A"}
            </p>
            {orderData.paymentId && (
              <p className="mb-2">
                <strong className="text-gray-700">Payment ID:</strong> {orderData.paymentId}
              </p>
            )}
            {orderData.razorpayOrderId && (
              <p className="mb-2">
                <strong className="text-gray-700">Razorpay Order ID:</strong> {orderData.razorpayOrderId}
              </p>
            )}
            <p className="mb-2">
              <strong className="text-gray-700">Order Status:</strong> 
              <span className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${
                normalizedStatus === 'cancelled' ? 'bg-red-100 text-red-800' : 
                normalizedStatus === 'returned' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
              }`}>
                {orderData.status || "Confirmed"}
              </span>
            </p>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-600 italic">
                Thank you for your purchase! For any queries, contact support@lmart.example.com
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Invoice generated on: {new Date().toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons (Outside print area) */}
        <div className="p-6 border-t flex flex-col sm:flex-row justify-between gap-4 no-print">
          <div className="flex flex-col sm:flex-row gap-4">
            
            {/* Cancel Button */}
            <button
              onClick={handleCancelOrder}
              className={`px-6 py-3 text-white rounded-lg transition-colors font-medium ${
                isFinalStatus
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg'
              }`}
              disabled={isFinalStatus}
            >
              {normalizedStatus === 'cancelled' ? 'Order Cancelled' : 'Cancel Order'}
            </button>
            
            {/* Return Button */}
            <button
              onClick={handleReturnOrder}
              className={`px-6 py-3 text-white rounded-lg transition-colors font-medium ${
                isFinalStatus
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-orange-600 hover:bg-orange-700 shadow-md hover:shadow-lg'
              }`}
              disabled={isFinalStatus}
            >
              {normalizedStatus === 'returned' ? 'Return Requested' : 'Return Order'}
            </button>

            <button
              onClick={() => navigate(0)}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium shadow-md hover:shadow-lg"
            >
              Refresh Details
            </button>
          </div>
        </div>
      </div>
  );
};

export default Invoice;