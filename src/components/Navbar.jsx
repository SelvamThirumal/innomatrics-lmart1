import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import logo from "../assets/newadd.png";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [selectedTotal, setSelectedTotal] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const [user, setUser] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  
  const {
    getCartItemsCount,
    items,
    removeFromCart,
    updateQuantity,
    clearCart,
    toggleSelect,
    getSelectedItems,
  } = useCart();
  
  const cartItemsCount = getCartItemsCount();

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error("Error parsing user data:", error);
        setUser(null);
        localStorage.removeItem("shouldOpenUserDropdown");
      }
    } else {
      setUser(null);
      localStorage.removeItem("shouldOpenUserDropdown");
    }
  }, [location.pathname]);

  // Calculate selected total whenever items change or cart opens
  useEffect(() => {
    if (isCartOpen) {
      const selectedItems = getSelectedItems();
      const selectedTotalAmount = selectedItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      );
      
      setSelectedTotal(selectedTotalAmount);
      setSelectedCount(selectedItems.length);
    }
  }, [items, isCartOpen, getSelectedItems]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isUserDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
        localStorage.setItem("shouldOpenUserDropdown", "false");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserDropdownOpen]);

  // Fixed cart icon click - only opens sidebar
  const handleCartIconClick = () => {
    setIsCartOpen(true);
    setIsUserDropdownOpen(false);
  };

  // User icon click handler
  const handleUserIconClick = () => {
    if (user) {
      const newState = !isUserDropdownOpen;
      setIsUserDropdownOpen(newState);
      localStorage.setItem("shouldOpenUserDropdown", newState.toString());
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("shouldOpenUserDropdown");
    setUser(null);
    setIsUserDropdownOpen(false);
    navigate("/");
  };
  
  // Handle mobile logout
  const handleMobileLogout = () => {
    handleLogout();
    setIsMenuOpen(false);
  };

  // Navigate to seller page
  const handleBecomeSeller = () => {
    navigate("/seller-registration");
  };

  // Checkout from sidebar
  const handleSidebarCheckout = () => {
    const selected = getSelectedItems();

    if (selected.length === 0) {
      alert("Please select at least one item to checkout!");
      return;
    }

    sessionStorage.setItem("selectedCartItems", JSON.stringify(selected));
    setIsCartOpen(false);
    navigate("/checkout");
  };

  // Handle quantity updates in sidebar
  const handleSidebarQuantityDecrease = (item) => {
    if (item.quantity > 1) {
      updateQuantity(item.lineItemKey || item.id, item.quantity - 1);
    }
  };

  const handleSidebarQuantityIncrease = (item) => {
    updateQuantity(item.lineItemKey || item.id, item.quantity + 1);
  };

  // Handle item removal from sidebar
  const handleSidebarRemoveItem = (itemId, itemName) => {
    if (window.confirm(`Are you sure you want to remove "${itemName}" from your cart?`)) {
      removeFromCart(itemId);
    }
  };

  return (
    <div className="bg-white sticky top-0 z-40 shadow-md">
      {/* Top Header */}
      <div className="container-responsive transition-all duration-500 bg-gradient-to-r from-blue-900 to-purple-600">
        <div className="flex justify-between items-center py-1">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="relative transform transition-transform duration-300 hover:scale-110">
              <img
                src={logo}
                alt="E-Mart Logo"
                className="w-14 h-14 sm:w-52 sm:h-20 object-contain transition-all duration-300 hover:brightness-110 hover:drop-shadow-lg cursor-pointer"
                onClick={() => navigate("/")}
              />
            </div>
          </div>

          {/* Contact and Icons - Hidden on mobile */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Become a Seller Button */}
            <button
              onClick={handleBecomeSeller}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600 transition-colors"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354l.707.707a2 2 0 010 2.828l-6.868 6.868a2 2 0 01-2.828 0l-6.868-6.868a2 2 0 010-2.828l.707-.707m18 0l.707.707a2 2 0 010 2.828l-6.868 6.868a2 2 0 01-2.828 0l-6.868-6.868a2 2 0 010-2.828l.707-.707m18 0V4m-6 0h6m-6 0l.707.707a2 2 0 010 2.828l-6.868 6.868a2 2 0 01-2.828 0l-6.868-6.868a2 2 0 010-2.828l.707-.707m-6 0l-.707-.707a2 2 0 010-2.828l6.868-6.868a2 2 0 012.828 0l6.868 6.868a2 2 0 010 2.828l-.707.707m-6 0h6m-6 0V4" />
              </svg>
              Become a Seller
            </button>

            <div className="flex space-x-3">
              {/* Home Button */}
              <button
                onClick={() => navigate("/")}
                className="w-8 h-8 border border-purple-300 rounded-full flex items-center justify-center bg-white hover:bg-gray-50 transition duration-200"
              >
                <svg
                  className="w-4 h-4 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </button>

              {/* Login Button - Shows when user is NOT logged in */}
              {!user && (
                <Link
                  to="/login"
                  className="w-8 h-8 border border-purple-300 rounded-full flex items-center justify-center bg-white hover:bg-gray-50 transition duration-200"
                >
                  <svg
                    className="w-4 h-4 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </Link>
              )}

              {/* User Icon with Dropdown - Shows ONLY when user is logged in */}
              {user && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={handleUserIconClick}
                    className="w-8 h-8 border border-purple-300 rounded-full flex items-center justify-center bg-white hover:bg-gray-50 transition duration-200 focus:outline-none"
                  >
                    <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  </button>

                  {/* User Dropdown Menu */}
                  {isUserDropdownOpen && user && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 overflow-hidden">
                      {/* Header Section */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                        <h3 className="font-bold text-gray-900 text-lg mb-1">Account</h3>
                        <p className="font-semibold text-gray-800 text-sm">{user.name}</p>
                        <p className="text-gray-600 text-xs">{user.email}</p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <button
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            localStorage.setItem("shouldOpenUserDropdown", "false");
                            setTimeout(() => {
                              navigate("/my-orders");
                            }, 100);
                          }}
                          className="w-full px-6 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center text-base font-medium border-b border-gray-100"
                        >
                          📦 My Orders
                        </button>
                        
                        <button
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            localStorage.setItem("shouldOpenUserDropdown", "false");
                            setTimeout(() => {
                              navigate("/seller-registration");
                            }, 100);
                          }}
                          className="w-full px-6 py-3 text-left text-yellow-700 hover:bg-yellow-50 flex items-center text-base font-medium border-b border-gray-100"
                        >
                          🛒 Become a Seller
                        </button>

                        <button
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            localStorage.setItem("shouldOpenUserDropdown", "false");
                            setTimeout(() => {
                              navigate("/profile");
                            }, 100);
                          }}
                          className="w-full px-6 py-3 text-left text-blue-700 hover:bg-blue-50 flex items-center text-base font-medium"
                        >
                          ⚙️ Profile Settings
                        </button>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-gray-200">
                        <button
                          onClick={handleLogout}
                          className="w-full px-6 py-3 text-left text-red-600 hover:bg-red-50 flex items-center text-base font-medium"
                        >
                          🚪 Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cart Icon */}
              <button
                onClick={handleCartIconClick}
                className="relative w-8 h-8 border border-purple-300 rounded-full flex items-center justify-center bg-white hover:bg-gray-50 transition duration-200"
              >
                <svg
                  className="w-4 h-4 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"
                  />
                </svg>
                {cartItemsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {cartItemsCount > 99 ? "99+" : cartItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Contact - Visible only on mobile */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile Become Seller Button */}
            <button
              onClick={handleBecomeSeller}
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold px-3 py-1.5 rounded-lg text-sm transition duration-200 shadow-md"
            >
              🛒 Seller
            </button>
            
            {/* Mobile Home Icon */}
            <button
              onClick={() => navigate("/")}
              className="w-8 h-8 border border-purple-300 rounded-full flex items-center justify-center bg-white hover:bg-gray-50 transition duration-200"
            >
              <svg
                className="w-4 h-4 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </button>
            
            {/* Mobile Login/User Icon */}
            {!user ? (
              <Link
                to="/login"
                className="w-8 h-8 border border-purple-300 rounded-full flex items-center justify-center bg-white hover:bg-gray-50 transition duration-200"
              >
                <svg
                  className="w-4 h-4 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </Link>
            ) : (
              <button
                onClick={() => setIsMenuOpen(true)}
                className="w-8 h-8 border border-purple-300 rounded-full flex items-center justify-center bg-white hover:bg-gray-50 transition duration-200"
              >
                <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              </button>
            )}

            {/* Mobile Cart Icon */}
            <button
              onClick={handleCartIconClick}
              className="relative w-8 h-8 border border-purple-300 rounded-full flex items-center justify-center bg-white hover:bg-gray-50 transition duration-200"
            >
              <svg
                className="w-4 h-4 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"
                />
              </svg>
              {cartItemsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  {cartItemsCount > 99 ? "99+" : cartItemsCount}
                </span>
              )}
            </button>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 bg-yellow-400 rounded-md focus:outline-none"
            >
              <svg
                className="w-5 h-5 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="border-t border-gray-200">
        <div className="container-responsive">
          <div className="flex items-center justify-between py-3">
            {/* Navigation Links - Hidden on mobile, visible on desktop */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                to="/"
                className={`text-blue-700 hover:text-purple-500 font-medium relative ${
                  location.pathname === "/" ? "active-nav-item" : ""
                }`}
              >
                Home
                {location.pathname === "/" && (
                  <span className="absolute bottom-[-8px] left-0 w-full h-[3px] bg-purple-500 rounded-full"></span>
                )}
              </Link>
              <Link
                to="/e-market"
                className={`text-blue-700 hover:text-purple-500 font-medium relative ${
                  location.pathname === "/e-market" ? "active-nav-item" : ""
                }`}
              >
                E-Store
                {location.pathname === "/e-market" && (
                  <span className="absolute bottom-[-8px] left-0 w-full h-[3px] bg-purple-500 rounded-full"></span>
                )}
              </Link>
              <Link
                to="/local-market"
                className={`text-blue-700 hover:text-purple-500 font-medium relative ${
                  location.pathname === "/local-market" ? "active-nav-item" : ""
                }`}
              >
                Local Market
                {location.pathname === "/local-market" && (
                  <span className="absolute bottom-[-8px] left-0 w-full h-[3px] bg-purple-500 rounded-full"></span>
                )}
              </Link>
              <Link
                to="/printing"
                className={`text-blue-700 hover:text-purple-500 font-medium relative ${
                  location.pathname === "/printing" ? "active-nav-item" : ""
                }`}
              >
                Printing
                {location.pathname === "/printing" && (
                  <span className="absolute bottom-[-8px] left-0 w-full h-[3px] bg-purple-500 rounded-full"></span>
                )}
              </Link>
              <Link
                to="/news-today"
                className={`text-blue-700 hover:text-purple-500 font-medium relative ${
                  location.pathname === "/news-today" ? "active-nav-item" : ""
                }`}
              >
                Market News 
                {location.pathname === "/news-today" && (
                  <span className="absolute bottom-[-8px] left-0 w-full h-[3px] bg-purple-500 rounded-full"></span>
                )}
              </Link>
              {/* Oldee Link */}
              <Link
                to="/oldee"
                className={`text-blue-700 hover:text-purple-500 font-medium relative ${
                  location.pathname === "/oldee" ? "active-nav-item" : ""
                }`}
              >
                Oldee
                {location.pathname === "/oldee" && (
                  <span className="absolute bottom-[-8px] left-0 w-full h-[3px] bg-purple-500 rounded-full"></span>
                )}
              </Link>
            </nav>

            {/* Search and Actions - Hidden on mobile */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Search Bar */}
              <div className="flex items-center bg-white border border-gray-400 rounded-lg px-3 py-2">
                <input
                  type="text"
                  placeholder="Search bar"
                  className="bg-transparent outline-none text-sm w-48 text-gray-500"
                />
                <button className="ml-2 p-1 bg-blue-400 text-white rounded hover:bg-blue-500">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              </div>

              {/* Upload and Download functionality */}
              <div className="flex items-center space-x-2">
                <label className="flex items-center text-gray-700 hover:text-purple-600 text-sm cursor-pointer transition duration-200">
                  <svg
                    className="w-4 h-4 mr-1 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Upload files
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files);
                      if (files.length > 0) {
                        try {
                          const formData = new FormData();
                          files.forEach((file) => formData.append("files", file));

                          const token = localStorage.getItem("token");
                          const headers = {};
                          if (token) {
                            headers.Authorization = `Bearer ${token}`;
                          }

                          const API_BASE_URL =
                            import.meta.env.VITE_API_URL?.replace("/api", "") ||
                            "http://localhost:5000";
                          const response = await fetch(
                            `${API_BASE_URL}/api/files/upload-multiple-public`,
                            {
                              method: "POST",
                              headers: headers,
                              body: formData,
                            }
                          );

                          if (response.ok) {
                            const result = await response.json();
                            alert(
                              `Successfully uploaded ${result.files.length} files to Cloudinary!`
                            );
                          } else {
                            const errorData = await response.json();
                            alert(
                              `Failed to upload files: ${
                                errorData.message || "Unknown error"
                              }`
                            );
                          }
                        } catch (error) {
                          console.error("Error uploading files:", error);
                          alert("Error uploading files");
                        }
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  onClick={() => navigate("/file-downloads")}
                  className="flex items-center text-gray-700 hover:text-purple-600 text-sm cursor-pointer transition duration-200"
                >
                  <svg
                    className="w-4 h-4 mr-1 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download
                </button>
              </div>

              <Link
                to="/contact"
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium text-sm transition duration-200 whitespace-nowrap inline-block text-center"
              >
                Join US
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-0 inset-x-0 p-2 transition transform origin-top-right">
          <div className="rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 bg-white divide-y-2 divide-gray-50">
            {/* Mobile Menu Header */}
            <div className="pt-5 pb-6 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <img className="h-8 w-auto" src={logo} alt="Logo" onClick={() => navigate("/")} />
                </div>
                <div className="-mr-2">
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                  >
                    <span className="sr-only">Close menu</span>
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Logged-in User Info for Mobile */}
              {user && (
                <div className="mt-4 mb-4 p-3 bg-blue-50 rounded-lg">
                  <h3 className="font-bold text-gray-900 text-lg mb-1">Hello, {user.name}</h3>
                  <p className="text-gray-600 text-sm">{user.email}</p>
                </div>
              )}
              
              <div className="mt-6">
                <nav className="grid gap-y-4">
                  {user && (
                    <>
                      <Link
                        to="/my-orders"
                        onClick={() => setIsMenuOpen(false)}
                        className="text-base font-medium text-blue-600 hover:text-blue-500 flex items-center"
                      >
                        📦 My Orders
                      </Link>
                      <Link
                        to="/seller-registration"
                        onClick={() => setIsMenuOpen(false)}
                        className="text-base font-medium text-yellow-600 hover:text-yellow-500 flex items-center"
                      >
                        🛒 Become a Seller
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setIsMenuOpen(false)}
                        className="text-base font-medium text-gray-900 hover:text-gray-700 flex items-center"
                      >
                        ⚙️ Profile Settings
                      </Link>
                    </>
                  )}
                  
                  <Link
                    to="/"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-base font-medium text-gray-900 hover:text-gray-700 flex items-center"
                  >
                    🏠 Home
                  </Link>
                  <Link
                    to="/printing"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-base font-medium text-gray-900 hover:text-gray-700 flex items-center"
                  >
                    🖨️ Printing
                  </Link>
                  <Link
                    to="/e-market"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-base font-medium text-gray-900 hover:text-gray-700 flex items-center"
                  >
                    🛒 E-Market
                  </Link>
                  <Link
                    to="/local-market"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-base font-medium text-gray-900 hover:text-gray-700 flex items-center"
                  >
                    🏪 Local Market
                  </Link>
                  <Link
                    to="/news-today"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-base font-medium text-gray-900 hover:text-gray-700 flex items-center"
                  >
                    📰 Market News
                  </Link>
                  <Link
                    to="/oldee"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-base font-medium text-gray-900 hover:text-gray-700 flex items-center"
                  >
                    👴 Oldee
                  </Link>
                </nav>
              </div>
            </div>
            
            {/* Mobile Actions Section */}
            <div className="py-6 px-5 space-y-6">
              {/* Mobile Search */}
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-transparent outline-none text-sm flex-1 text-gray-500"
                />
                <button className="ml-2 p-1 bg-blue-400 text-white rounded hover:bg-blue-500">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              </div>

              {/* Mobile Action Buttons */}
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    navigate("/contact");
                    setIsMenuOpen(false);
                  }}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium text-center"
                >
                  🤝 Join US
                </button>
                
                <div className="flex space-x-4 pt-2">
                  <label className="flex-1 flex items-center justify-center text-gray-700 hover:text-purple-600 text-sm cursor-pointer border border-gray-300 rounded-lg px-3 py-2">
                    <svg
                      className="w-4 h-4 mr-1 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    Upload
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files);
                        if (files.length > 0) {
                          try {
                            const formData = new FormData();
                            files.forEach((file) => formData.append("files", file));

                            const token = localStorage.getItem("token");
                            const headers = {};
                            if (token) {
                              headers.Authorization = `Bearer ${token}`;
                            }

                            const API_BASE_URL =
                              import.meta.env.VITE_API_BASE_URL ||
                              "http://localhost:5000";
                            const response = await fetch(
                              `${API_BASE_URL}/api/files/upload-multiple-public`,
                              {
                                method: "POST",
                                headers: headers,
                                body: formData,
                              }
                            );

                            if (response.ok) {
                              const result = await response.json();
                              alert(
                                `Successfully uploaded ${result.files.length} files to Cloudinary!`
                              );
                            } else {
                              const errorData = await response.json();
                              alert(
                                `Failed to upload files: ${
                                  errorData.message || "Unknown error"
                                }`
                              );
                            }
                          } catch (error) {
                            console.error("Error uploading files:", error);
                            alert("Error uploading files");
                          }
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    onClick={() => {
                      navigate("/file-downloads");
                      setIsMenuOpen(false);
                    }}
                    className="flex-1 flex items-center justify-center text-gray-700 hover:text-purple-600 text-sm cursor-pointer border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <svg
                      className="w-4 h-4 mr-1 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Download
                  </button>
                </div>
              </div>

              {/* Auth Buttons */}
              <div>
                {user ? (
                  <button 
                    onClick={handleMobileLogout} 
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-red-600 hover:bg-red-700"
                  >
                    🚪 Logout
                  </button>
                ) : (
                  <>
                    <Link
                      to="/register"
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 mb-3"
                    >
                      Sign up
                    </Link>
                    <p className="text-center text-base font-medium text-gray-500">
                      Existing customer?{' '}
                      <Link to="/login" className="text-indigo-600 hover:text-indigo-500" onClick={() => setIsMenuOpen(false)}>
                        Sign in
                      </Link>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsCartOpen(false)}
          ></div>
          <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              {/* Cart Header */}
              <div className="flex items-center justify-between p-4 border-b bg-purple-600">
                <h2 className="text-lg font-semibold text-white">
                  Shopping Cart ({cartItemsCount})
                </h2>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-purple-700 rounded-full transition-colors text-white focus:outline-none"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4">
                {items.length === 0 ? (
                  <div className="text-center py-8">
                    <svg
                      className="w-16 h-16 text-gray-300 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"
                      />
                    </svg>
                    <p className="text-gray-500 mb-4">Your cart is empty</p>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                      Continue Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div
                        key={item.lineItemKey || item.id}
                        className={`flex items-center space-x-3 p-3 border rounded-lg transition-all ${
                          item.selected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'border-gray-200 hover:shadow-md'
                        }`}
                      >
                        {/* Selection Checkbox */}
                        <input
                          type="checkbox"
                          checked={item.selected || false}
                          onChange={() => toggleSelect(item.lineItemKey || item.id)}
                          className="w-5 h-5 accent-purple-600 cursor-pointer"
                        />

                        {/* Product Image */}
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                        />

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {item.name}
                          </h3>
                          <p className="text-xs text-gray-600 truncate">
                            {item.description}
                          </p>
                          <p className="text-sm font-bold text-purple-600">
                            {'₹' + item.price.toLocaleString()}
                          </p>
                        </div>

                        {/* Quantity Control */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleSidebarQuantityDecrease(item)}
                            className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 12H4"
                              />
                            </svg>
                          </button>

                          <span className="w-6 text-center text-sm font-medium">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() => handleSidebarQuantityIncrease(item)}
                            className="w-6 h-6 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-colors"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                            </svg>
                          </button>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleSidebarRemoveItem(item.lineItemKey || item.id, item.name)}
                          className="p-1 text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Footer */}
              {items.length > 0 && (
                <div className="border-t p-4 space-y-4 bg-gray-50">
                  {/* Selected Items Summary */}
                  {selectedCount > 0 && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="flex justify-between items-center text-sm text-green-800">
                        <span className="font-semibold">Selected ({selectedCount}):</span>
                        <span className="font-bold text-lg">
                            {'₹' + selectedTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {/* Checkout Button */}
                    <button
                      onClick={handleSidebarCheckout}
                      disabled={selectedCount === 0}
                      className={`w-full py-3 rounded-lg font-medium transition-colors ${
                        selectedCount === 0
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                      }`}
                    >
                      {selectedCount === 0 ? 'Select Items to Checkout' : `Checkout Selected (${selectedCount})`}
                    </button>

                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-medium transition-colors"
                    >
                      Continue Shopping
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to clear your cart?")) {
                        clearCart();
                        setIsCartOpen(false);
                      }
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    Clear Cart
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;