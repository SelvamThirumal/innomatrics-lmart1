import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';
import ProductForm from '../components/ProductForm';
import { getProductsByCategory, deleteProduct } from '../services/productService';


const AdminDashboard = () => {
  
  const navigate = useNavigate();
  const { getAllOrders } = useOrder();

  // --- State declarations ---
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [subcategoryProducts, setSubcategoryProducts] = useState([]);
  const [stats, setStats] = useState({ totalCustomers: 0, totalOrders: 0, totalRevenue: 0, pendingOrders: 0, totalProducts: 0 });
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileStats, setFileStats] = useState({ totalFiles: 0, totalSize: 0, totalDownloads: 0 });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // ✅ Product Form state (must be declared before use)
  const [showProductForm, setShowProductForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);

  const [products, setProducts] = useState({ emart: [], localmarket: [], printing: [], news: [] });
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  


  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    
    // Get admin user data from localStorage
    const userData = localStorage.getItem('adminUser');
    if (userData) {
      setAdminUser(JSON.parse(userData));
    }
    
    fetchDashboardData();
    
    // Auto-refresh every 5 seconds for live updates
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        navigate('/admin/login');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
      
      // Fetch dashboard statistics from backend
      try {
        const statsResponse = await fetch(`${API_BASE_URL}/api/dashboard/stats`, { headers });
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }

      // Fetch orders from backend
      try {
        const ordersResponse = await fetch(`${API_BASE_URL}/api/dashboard/orders`, { headers });
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          // Convert MongoDB orders to match frontend format
          const formattedOrders = ordersData.map(order => ({
            id: order._id,
            orderId: order.orderId,
            paymentId: order.paymentId,
            status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
            orderDate: new Date(order.createdAt).toISOString().split('T')[0],
            createdAt: order.createdAt,
            items: order.items,
            total: order.total,
            amount: order.total,
            customerName: order.customerName || 'Guest Customer',
            customerEmail: order.customerEmail || 'N/A',
            customerPhone: order.customerPhone || 'N/A',
            customerAddress: order.customerAddress || 'N/A',
            customerCity: order.customerCity || 'N/A',
            customerPincode: order.customerPincode || 'N/A'
          }));
          setOrders(formattedOrders);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
      
      // Fetch files from backend
      try {
        const filesResponse = await fetch(`${API_BASE_URL}/api/files/admin/all`, { headers });
        if (filesResponse.ok) {
          const filesData = await filesResponse.json();
          setFiles(filesData.files || []);
        }
      } catch (error) {
        console.error('Error fetching files:', error);
      }

      // Fetch file stats from backend
      try {
        const fileStatsResponse = await fetch(`${API_BASE_URL}/api/files/admin/stats`, { headers });
        if (fileStatsResponse.ok) {
          const fileStatsData = await fileStatsResponse.json();
          setFileStats(fileStatsData);
        }
      } catch (error) {
        console.error('Error fetching file stats:', error);
      }

      // Fetch customers from backend
      try {
        const customersResponse = await fetch(`${API_BASE_URL}/api/dashboard/customers`, { headers });
        if (customersResponse.ok) {
          const customersData = await customersResponse.json();
          setCustomers(customersData);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
      }

      // Fetch products for all categories
      await fetchAllProducts();
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const fetchAllProducts = async () => {
    setLoadingProducts(true);
    try {
      const categories = ['emart', 'localmarket', 'printing', 'news'];
      const productPromises = categories.map(async (category) => {
        try {
          const response = await getProductsByCategory(category);
          console.log(`Fetched ${category} products:`, response); // Debug log
          return { category, products: response.data || [] };
        } catch (error) {
          console.error(`Error fetching ${category} products:`, error);
          return { category, products: [] };
        }
      });

      const results = await Promise.all(productPromises);
      const newProducts = {};
      results.forEach(({ category, products }) => {
        newProducts[category] = products;
      });
      
      console.log('All products fetched:', newProducts); // Debug log
      setProducts(newProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleDeleteProduct = async (productId, category) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(productId);
        // Refresh products for this category
        const response = await getProductsByCategory(category);
        setProducts(prev => ({
          ...prev,
          [category]: response.data || []
        }));
        alert('Product deleted successfully!');
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product. Please try again.');
      }
    }
  };



  const handleEditProduct = (product) => {
    setCurrentProduct(product);
    setEditMode(true);
    setShowProductForm(true);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE_URL}/api/dashboard/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchDashboardData(); // Refresh data
        alert('Order status updated successfully!');
      } else {
        alert('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };



  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openOrderModal = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const closeOrderModal = () => {
    setSelectedOrder(null);
    setShowOrderModal(false);
  };

  // File management functions
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem('adminToken');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('category', 'admin-upload');
      formData.append('isPublic', 'true');

      const response = await fetch(`${API_BASE_URL}/api/files/upload-multiple`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully uploaded ${result.files.length} files!`);
        fetchDashboardData(); // Refresh data
      } else {
        alert('Failed to upload files');
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error uploading files');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      event.target.value = ''; // Reset file input
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('File deleted successfully!');
        fetchDashboardData(); // Refresh data
      } else {
        alert('Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error deleting file');
    }
  };

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const token = localStorage.getItem('adminToken');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      // Show downloading notification
      const downloadingToast = document.createElement('div');
      downloadingToast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
      downloadingToast.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Downloading ${fileName}...</span>
        </div>
      `;
      document.body.appendChild(downloadingToast);

      const response = await fetch(`${API_BASE_URL}/api/files/download/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Update notification to success
        downloadingToast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
        downloadingToast.innerHTML = `
          <div class="flex items-center space-x-3">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>${fileName} downloaded successfully!</span>
          </div>
        `;
        
        // Remove notification after 3 seconds
        setTimeout(() => {
          document.body.removeChild(downloadingToast);
        }, 3000);
        
        // Update download count in the UI
        setFiles(prevFiles => 
          prevFiles.map(file => 
            file._id === fileId ? { ...file, downloadCount: (file.downloadCount || 0) + 1 } : file
          )
        );
        
      } else {
        document.body.removeChild(downloadingToast);
        alert('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
    } else if (fileType === 'application/pdf') {
      return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
    } else {
      return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
  );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex relative">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed lg:sticky top-0 left-0 z-40 w-72 lg:w-60 h-screen bg-gradient-to-b from-white/95 to-blue-50/90 backdrop-blur-md shadow-xl border-r border-blue-200/50 flex flex-col transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Dashboard</h1>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            {[
              { key: 'overview', label: 'Overview', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { key: 'customers', label: 'Customers', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' },
              { key: 'orders', label: 'Orders', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
              { key: 'products', label: 'Products', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
              { key: 'files', label: 'Files', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
            ].map((tab) => (
              <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                // Close mobile menu when tab is selected
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:shadow-md'
              }`}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Add Product Button */}
        <div className="p-4">
          <button
            onClick={() => {
              setCurrentProduct(null);
              setEditMode(false);
              setShowProductForm(true);
            }}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 font-medium text-sm transform hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Product</span>
          </button>
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200/50">
          <button
            onClick={handleLogout}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 font-medium text-sm transform hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Desktop Header */}
        <div className="hidden lg:flex bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/50 p-4 items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Dashboard</h1>
          </div>
          
          {/* Admin User Profile */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg px-3 py-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-gray-900">{adminUser?.name || 'Admin User'}</p>
                <p className="text-xs text-gray-500">{adminUser?.email || 'admin@printo.com'}</p>
              </div>
            </div>
            <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/50 p-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors touch-manipulation"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Admin Dashboard</h1>
            </div>
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-3 lg:p-6 overflow-y-auto">

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-lg p-4 border border-blue-200/50 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Total Customers</p>
                    <p className="text-xl font-bold text-blue-900 mt-1">{stats.totalCustomers}</p>
                    <div className="flex items-center mt-1">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
                      <span className="text-xs text-blue-600">Active Users</span>
                    </div>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg shadow-lg p-4 border border-emerald-200/50 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Total Orders</p>
                    <p className="text-xl font-bold text-emerald-900 mt-1">{stats.totalOrders}</p>
                    <div className="flex items-center mt-1">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
                      <span className="text-xs text-emerald-600">All Time</span>
                    </div>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-lg p-4 border border-purple-200/50 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Total Revenue</p>
                    <p className="text-xl font-bold text-purple-900 mt-1">₹{stats.totalRevenue}</p>
                    <div className="flex items-center mt-1">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
                      <span className="text-xs text-purple-600">This Month</span>
                    </div>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow-lg p-4 border border-amber-200/50 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Pending Orders</p>
                    <p className="text-xl font-bold text-amber-900 mt-1">{stats.pendingOrders}</p>
                    <div className="flex items-center mt-1">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-1"></div>
                      <span className="text-xs text-amber-600">Needs Action</span>
                    </div>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg shadow-lg p-4 border border-indigo-200/50 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Total Products</p>
                    <p className="text-xl font-bold text-indigo-900 mt-1">{stats.totalProducts}</p>
                    <div className="flex items-center mt-1">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
                      <span className="text-xs text-indigo-600">Active Products</span>
                    </div>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200/50">
              <div className="px-4 py-3 border-b border-gray-200/50">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Recent Orders</h3>
                </div>
              </div>
              <div className="overflow-x-auto -mx-3 lg:mx-0">
                <div className="min-w-[600px] lg:min-w-0 max-h-80 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200/50">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Customer Info</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Items & Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Payment Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/50 divide-y divide-gray-200/30">
                      {orders.slice(0, 5).map((order, index) => (
                        <tr key={order.id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-200">
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                {order.customerName?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 text-sm">{order.customerName}</div>
                                <div className="text-xs text-gray-500">{order.customerEmail}</div>
                                <div className="text-xs text-gray-500">{order.customerPhone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div>
                              <div className="font-bold text-base text-green-600">₹{order.total}</div>
                              <div className="text-xs text-gray-500 flex items-center mt-1">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                {order.items?.length || 0} items
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div>
                              <div className="text-gray-700 font-medium text-sm">{order.paymentDate ? new Date(order.paymentDate).toLocaleDateString() : new Date(order.createdAt).toLocaleDateString()}</div>
                              <button
                                onClick={() => openOrderModal(order)}
                                className="mt-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-md text-xs font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
                              >
                                View Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-lg border border-white/20">
            <div className="px-4 py-3 border-b border-gray-200/30">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">All Customers</h3>
              </div>
            </div>
            <div className="overflow-x-auto -mx-3 lg:mx-0">
              <div className="min-w-[700px] lg:min-w-0">
                <table className="min-w-full divide-y divide-gray-200/30">
                <thead className="bg-gradient-to-r from-green-50 to-blue-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Orders</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total Spent</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Joined</th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200/30">
                  {customers.map((customer, index) => (
                    <tr key={customer.id} className="hover:bg-gradient-to-r hover:from-green-50/50 hover:to-blue-50/50 transition-all duration-200">
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                            {customer.name?.charAt(0) || 'U'}
                          </div>
                          <div className="font-semibold text-gray-900 text-sm">{customer.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">{customer.email}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                          {customer.orderCount} orders
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-600">₹{customer.totalSpent}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-medium">{new Date(customer.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-lg border border-white/20">
            <div className="px-4 py-3 border-b border-gray-200/30">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">All Orders</h3>
              </div>
            </div>
            <div className="overflow-x-auto -mx-3 lg:mx-0">
              <div className="min-w-[800px] lg:min-w-0">
                <table className="min-w-full divide-y divide-gray-200/30">
                <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Customer Details</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Contact Info</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Address</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Items</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Payment Date</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200/30">
                  {orders.map((order, index) => (
                    <tr key={order.id} className="hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-pink-50/50 transition-all duration-200">
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                            {order.customerName?.charAt(0) || 'U'}
                          </div>
                          <div className="font-semibold text-gray-900 text-sm">{order.customerName}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div>
                          {order.customerEmail && <div className="text-xs text-gray-600 font-medium">{order.customerEmail}</div>}
                          {order.customerPhone && <div className="text-xs text-gray-600 font-medium">{order.customerPhone}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="text-xs text-gray-600">
                          {order.customerAddress && <div className="font-medium">{order.customerAddress}</div>}
                          {order.customerCity && <div className="font-medium">{order.customerCity}</div>}
                          {order.customerPincode && <div className="font-medium">PIN: {order.customerPincode}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{order.items?.length || 0} items</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {order.items?.map(item => item.name).join(', ')}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-600">₹{order.total}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {order.paymentDate ? new Date(order.paymentDate).toLocaleDateString() : new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openOrderModal(order)}
                          className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:from-purple-600 hover:to-pink-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-lg border border-white/20">

            <div className="px-4 py-3 border-b border-gray-200/30">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">All Products</h3>
                <div className="ml-auto text-sm text-gray-600 font-medium">
                  Total Products: {Object.values(products).flat().length}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto -mx-3 lg:mx-0">
              <div className="min-w-[900px] lg:min-w-0">
                <table className="min-w-full divide-y divide-gray-200/30">
                <thead className="bg-gradient-to-r from-blue-50 to-purple-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Colors</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200/30">
                  {Object.entries(products).flatMap(([category, categoryProducts]) => 
                    categoryProducts.map((product) => (
                      <tr key={`${category}-${product._id}`} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-200">
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                              {product.name?.charAt(0) || 'P'}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">{product.name}</div>
                              <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">{product.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div>
                            <div className="font-semibold text-gray-900 text-sm capitalize">{category}</div>
                            <div className="text-xs text-gray-500">{product.subcategory}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-600">₹{product.price}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex space-x-1">
                            {product.colorVariants?.layer1 && (
                              <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: product.colorVariants.layer1 }} title={product.colorVariants.layer1}></div>
                            )}
                            {product.colorVariants?.layer2 && (
                              <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: product.colorVariants.layer2 }} title={product.colorVariants.layer2}></div>
                            )}
                            {product.colorVariants?.layer3 && (
                              <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: product.colorVariants.layer3 }} title={product.colorVariants.layer3}></div>
                            )}
                            {!product.colorVariants?.layer1 && !product.colorVariants?.layer2 && !product.colorVariants?.layer3 && (
                              <span className="text-xs text-gray-500">No colors</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {product.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            
                            
                            
        
                            
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 touch-manipulation min-w-[80px]"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDeleteProduct(product._id, category)}
                              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 touch-manipulation min-w-[80px]"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="space-y-6">
            {/* File Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg shadow-lg p-4 border border-indigo-200/50 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Total Files</p>
                    <p className="text-xl font-bold text-indigo-900 mt-1">{fileStats.totalFiles}</p>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-lg p-4 border border-green-200/50 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Total Size</p>
                    <p className="text-xl font-bold text-green-900 mt-1">{formatFileSize(fileStats.totalSize)}</p>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-lg p-4 border border-orange-200/50 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Downloads</p>
                    <p className="text-xl font-bold text-orange-900 mt-1">{fileStats.totalDownloads}</p>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Downloads Section */}
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Recent Downloads</h3>
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200/30">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Files are downloaded to your browser's default download folder</p>
                    <p className="text-xs text-gray-600 mt-1">💡 Tip: You can change your browser's download settings to specify a custom folder</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white/70 p-3 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">For Chrome:</h4>
                    <p className="text-xs text-gray-600">Settings → Advanced → Downloads → Location</p>
                  </div>
                  <div className="bg-white/70 p-3 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">For Firefox:</h4>
                    <p className="text-xs text-gray-600">Settings → General → Files and Applications</p>
                  </div>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Upload Files</h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.zip,.rar"
                  />
                  <label
                    htmlFor="file-upload"
                    className={`bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                      isUploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isUploading ? 'Uploading...' : 'Choose Files'}
                  </label>
                </div>
              </div>
              {isUploading && (
                <div className="mb-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* Files List */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200/50 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200/50">
                <h3 className="text-lg font-bold text-gray-800">All Files ({files.length})</h3>
              </div>
              <div className="overflow-x-auto -mx-3 lg:mx-0">
                <div className="min-w-[800px] lg:min-w-0">
                  <table className="min-w-full divide-y divide-gray-200/50">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">File</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Size</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Downloads</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Uploaded</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200/30">
                    {files.map((file) => (
                      <tr key={file._id} className="hover:bg-gray-50/50 transition-all duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getFileIcon(file.fileType)} />
                                </svg>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{file.originalName}</div>
                              <div className="text-sm text-gray-500">{file.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            {file.fileType.split('/')[1]?.toUpperCase() || 'FILE'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatFileSize(file.fileSize)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {file.downloadCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDownloadFile(file._id, file.originalName)}
                              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 touch-manipulation min-w-[90px]"
                            >
                              Download
                            </button>
                            <button
                              onClick={() => handleDeleteFile(file._id)}
                              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 touch-manipulation min-w-[80px]"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          </div>
        )}

      {/* Order Details Model */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-auto p-4 sm:p-6 lg:p-8 shadow-2xl rounded-2xl bg-white/90 backdrop-blur-md border border-white/20">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Order Details</h3>
                </div>
                <button
                  onClick={closeOrderModal}
                  className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-3 transition-all duration-200 touch-manipulation"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4 lg:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200/30">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h4 className="font-bold text-gray-800">Order Information</h4>
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm"><span className="font-semibold text-gray-700">Order ID:</span> <span className="text-blue-600 font-medium">#{selectedOrder.id}</span></p>
                      <p className="text-sm"><span className="font-semibold text-gray-700">Payment ID:</span> <span className="text-gray-600">{selectedOrder.paymentId}</span></p>
                      <p className="text-sm"><span className="font-semibold text-gray-700">Status:</span> 
                        <span className={`ml-2 inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                          {selectedOrder.status}
                        </span>
                      </p>
                      <p className="text-sm"><span className="font-semibold text-gray-700">Total Amount:</span> <span className="text-green-600 font-bold text-lg">₹{selectedOrder.total}</span></p>
                      <p className="text-sm"><span className="font-semibold text-gray-700">Order Date:</span> <span className="text-gray-600">{selectedOrder.paymentDate ? new Date(selectedOrder.paymentDate).toLocaleDateString() : new Date(selectedOrder.createdAt).toLocaleDateString()}</span></p>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-xl border border-green-200/30">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <h4 className="font-bold text-gray-800">Customer Information</h4>
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm"><span className="font-semibold text-gray-700">Name:</span> <span className="text-gray-800 font-medium">{selectedOrder.customerName}</span></p>
                      {selectedOrder.customerEmail && <p className="text-sm"><span className="font-semibold text-gray-700">Email:</span> <span className="text-gray-600">{selectedOrder.customerEmail}</span></p>}
                      {selectedOrder.customerPhone && <p className="text-sm"><span className="font-semibold text-gray-700">Phone:</span> <span className="text-gray-600">{selectedOrder.customerPhone}</span></p>}
                      {selectedOrder.customerAddress && (
                        <div>
                          <p className="font-semibold text-gray-700 text-sm mb-1">Address:</p>
                          <div className="bg-white/60 p-3 rounded-lg text-sm text-gray-700">
                            <p>{selectedOrder.customerAddress}</p>
                            <p>{selectedOrder.customerCity}</p>
                            <p className="font-medium">PIN: {selectedOrder.customerPincode}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl border border-orange-200/30">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <h4 className="font-bold text-gray-800">Order Items</h4>
                  </div>
                  <div className="bg-white/60 rounded-xl overflow-hidden border border-orange-200/30">
                    <table className="min-w-full divide-y divide-gray-200/30">
                      <thead className="bg-gradient-to-r from-orange-100 to-red-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Item</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Quantity</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Price</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/50 divide-y divide-gray-200/30">
                        {selectedOrder.items?.map((item, index) => (
                          <tr key={index} className="hover:bg-orange-50/50 transition-all duration-200">
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">{item.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                {item.quantity}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-700">₹{item.price}</td>
                            <td className="px-6 py-4 text-sm font-bold text-green-600">₹{item.price * item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 lg:mt-8 flex justify-end">
                <button
                  onClick={closeOrderModal}
                  className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium touch-manipulation w-full sm:w-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      

      {/* Product Form Modal */}
      {showProductForm && (
        <ProductForm 
          onClose={() => {
            setShowProductForm(false);
            setEditMode(false);
            setCurrentProduct(null);
          }}
          onSubmit={async (result) => {
            setShowProductForm(false);
            setEditMode(false);
            setCurrentProduct(null);
            // Refresh products for all categories
            await fetchAllProducts();
          }}
          editMode={editMode}
          product={currentProduct}
        />
      )}
      {selectedSubcategory && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 overflow-auto max-h-[80vh]">
      <h2 className="text-xl font-bold mb-4">Details for {selectedSubcategory}</h2>
      
      {subcategoryProducts.length === 0 && (
        <p className="text-gray-600">No products found for this subcategory.</p>
      )}

      {subcategoryProducts.map(product => (
        <div key={product._id} className="mb-6 border-b pb-4">
          <h3 className="font-semibold text-lg">{product.name}</h3>
          
          {/* Colors */}
          <div className="flex space-x-2 mt-2">
            {product.colorVariants?.layer1 && (
              <div title={product.colorVariants.layer1} className="w-6 h-6 rounded-full border" style={{ backgroundColor: product.colorVariants.layer1 }}></div>
            )}
            {product.colorVariants?.layer2 && (
              <div title={product.colorVariants.layer2} className="w-6 h-6 rounded-full border" style={{ backgroundColor: product.colorVariants.layer2 }}></div>
            )}
            {product.colorVariants?.layer3 && (
              <div title={product.colorVariants.layer3} className="w-6 h-6 rounded-full border" style={{ backgroundColor: product.colorVariants.layer3 }}></div>
            )}
            {!product.colorVariants?.layer1 && !product.colorVariants?.layer2 && !product.colorVariants?.layer3 && (
              <span className="text-xs text-gray-500">No colors</span>
            )}
          </div>

          {/* Sizes with cm */}
          <div className="mt-3">
            {product.sizes && product.sizes.length > 0 ? (
              <table className="min-w-full text-sm border border-gray-300 rounded">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left px-2 py-1 font-semibold border-b border-gray-300">Size</th>
                    <th className="text-left px-2 py-1 font-semibold border-b border-gray-300">CM</th>
                  </tr>
                </thead>
                <tbody>
                  {product.sizes.map(({ size, cm }) => (
                    <tr key={size} className="border-b border-gray-300 last:border-b-0">
                      <td className="px-2 py-1">{size}</td>
                      <td className="px-2 py-1">{cm} cm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-gray-500">No sizes available</p>
            )}
          </div>
        </div>
      ))}

      <button
        onClick={() => setSelectedSubcategory(null)}
        className="mt-4 bg-gradient-to-r from-gray-600 to-gray-800 text-white px-4 py-2 rounded hover:from-gray-700 hover:to-gray-900 transition"
      >
        Close
      </button>
    </div>
  </div>
)}

      
    </div>
  </div>
  </div>
  );
};

export default AdminDashboard;