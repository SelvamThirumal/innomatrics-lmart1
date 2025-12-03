import React from 'react';
import { useReactToPrint } from 'react-to-print';

const Invoice = ({ orderData, onClose, onCancelOrder }) => {
  const invoiceRef = React.useRef();
  
  // Function to handle printing/downloading the invoice
  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
    documentTitle: `Invoice-${orderData.orderId || 'Order'}`,
    pageStyle: `
      @page { 
        size: A4; 
        margin: 15mm; 
      }
      @media print {
        body { 
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .no-print, .no-print * {
          display: none !important;
        }
        body * {
          visibility: hidden;
        }
        #invoice-content, #invoice-content * {
          visibility: visible;
        }
        #invoice-content {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
      }
    `,
    onAfterPrint: () => console.log('Printed successfully!'),
  });

  // Utility function to format the date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      
      if (isNaN(dateObj.getTime())) return 'Invalid Date';
      
      return dateObj.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).replace(',', ' ');
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'N/A';
    }
  };

  // Handle download as PDF
  const handleDownload = () => {
    handlePrint();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header with Print/Close Buttons */}
        <div className="flex justify-between items-center p-6 border-b no-print">
          <h2 className="text-2xl font-bold">Order Details</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Print Invoice
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Invoice Content (Reference for Printing) */}
        <div id="invoice-content" ref={invoiceRef} className="p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-gray-800">
              INVOICE: {orderData.orderId || 'ORDJ4VW2L'}
            </h1>
            <p className="text-gray-600">
              <strong>Date:</strong> {formatDate(orderData.createdAt || new Date())}
            </p>
          </div>

          {/* Billing and Shipping Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-sm">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-gray-700">Billed to:</h3>
              <p className="font-medium text-gray-900">{orderData.customerInfo?.name || "Dashrath Yadav"}</p>
              <p className="text-gray-600">{orderData.customerInfo?.address || "Kamvaran Biraul Darbhanga"}</p>
              <p className="text-gray-600">{orderData.customerInfo?.pincode || "Darbhanga 848209"}</p>
              <p className="text-blue-600 mt-1">{orderData.customerInfo?.email || "innomatrictechnologies@gmail.com"}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg md:text-right">
              <h3 className="font-semibold mb-2 text-gray-700">From:</h3>
              <p className="font-medium text-gray-900">L-Mart</p>
              <p className="text-gray-600">Kamavarn Biraul, Darbhanga</p>
              <p className="text-blue-600 mt-1">support@lmart.example</p>
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
                      <td className="py-3 px-4">{item.name || "Product"}</td>
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
              <strong className="text-gray-700">Payment Method:</strong> {orderData.paymentMethod || "Razorpay"}
            </p>
            {orderData.paymentId && (
              <p className="mb-2">
                <strong className="text-gray-700">Payment ID:</strong> {orderData.paymentId}
              </p>
            )}
            <p className="mb-2">
              <strong className="text-gray-700">Order Status:</strong> 
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                (orderData.status === 'Cancelled' || orderData.status === 'cancelled') 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {orderData.status || "Confirmed"}
              </span>
            </p>
            <p className="mt-4 text-gray-600 italic">
              Thank you for your purchase! For any queries, contact support@lmart.example
            </p>
          </div>
        </div>

        {/* Action Buttons (Outside print area) */}
        <div className="p-6 border-t flex flex-col sm:flex-row justify-between gap-4 no-print">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => {
                onCancelOrder();
                onClose();
              }}
              className={`px-6 py-3 text-white rounded-lg transition-colors ${
                orderData.status === 'Cancelled' || orderData.status === 'cancelled'
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              disabled={orderData.status === 'Cancelled' || orderData.status === 'cancelled'}
            >
              {orderData.status === 'Cancelled' || orderData.status === 'cancelled' 
                ? 'Order Cancelled' 
                : 'Cancel Order'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
          <button
            onClick={handleDownload}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Download Invoice (PDF)
          </button>
        </div>
      </div>
    </div>
  );
};

export default Invoice;