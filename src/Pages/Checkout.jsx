import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { db } from '../../firebase'; 
// Import necessary Firestore functions
import { collection, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";

// The GOOGLE_MAPS_API_KEY and reverseGeocode function are intentionally excluded 
// to meet the requirement of not using the Google Maps Geocoding API key.

const Checkout = () => {
  const navigate = useNavigate();
  const { items, clearCart, updateCartItem } = useCart();

  const [checkoutItems, setCheckoutItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [processingPayment, setProcessingPayment] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    pincode: "",
    city: "",
    email: ""
  });
  
  const [userDataFromDB, setUserDataFromDB] = useState(null); 
  const [isFetchingUser, setIsFetchingUser] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [errors, setErrors] = useState({
    form: "",
    customization: "",
    payment: ""
  });
  const [fetchingLocation, setFetchingLocation] = useState(false);

  // 🔑 Fetch User Data from Firebase
  useEffect(() => {
    const currentUserId = localStorage.getItem('token'); 
    
    if (!currentUserId) {
      setErrors(prev => ({ ...prev, form: "You must be logged in to checkout. User ID not found." }));
      setIsFetchingUser(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        const userRef = doc(db, "users", currentUserId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          setUserDataFromDB({
            ...userData,
            userId: currentUserId,
          });

          setForm(prevForm => ({
            ...prevForm,
            name: userData.name || prevForm.name,
            email: userData.email || prevForm.email,
            phone: userData.contactNo || userData.phone || prevForm.phone, 
          }));
        } else {
          setUserDataFromDB({ userId: currentUserId });
          console.warn("User profile data not found, proceeding with form fill.");
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setErrors(prev => ({ ...prev, form: "Failed to load user information." }));
      } finally {
        setIsFetchingUser(false);
      }
    };

    fetchUserData();
  }, []); 

  // Load Razorpay script
  useEffect(() => {
    const loadRazorpayScript = () => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    loadRazorpayScript();
  }, []);

  // Load cart items
  useEffect(() => {
    const stored = sessionStorage.getItem("selectedCartItems");

    if (stored) {
      const selected = JSON.parse(stored);
      const itemsWithCustomization = selected.map(item => ({
        ...item,
        selectedColor: item.selectedColor || (item.colors ? item.colors[0] : ""),
        selectedSize: item.selectedSize || (item.sizes ? item.sizes[0] : ""),
        selectedRam: item.selectedRam || (item.rams ? item.rams[0] : "")
      }));
      setCheckoutItems(itemsWithCustomization);

      const sum = itemsWithCustomization.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0
      );
      setTotal(sum);
    } else {
      const itemsWithCustomization = items.map(item => ({
        ...item,
        selectedColor: item.selectedColor || (item.colors ? item.colors[0] : ""),
        selectedSize: item.selectedSize || (item.sizes ? item.sizes[0] : ""),
        selectedRam: item.selectedRam || (item.rams ? item.rams[0] : "")
      }));
      setCheckoutItems(itemsWithCustomization);

      const sum = itemsWithCustomization.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0
      );
      setTotal(sum);
    }
  }, [items]);

  // Validation functions
  const validateForm = () => {
    const { name, phone, address, city, pincode, email } = form;
    
    if (!userDataFromDB || !userDataFromDB.userId) return "User ID missing. Please log in again."; 
    if (!name.trim()) return "Name is required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Valid email is required";
    if (!phone.trim() || !/^\d{10}$/.test(phone)) return "Valid 10-digit phone number is required";
    if (!address.trim()) return "Address is required";
    if (!city.trim()) return "City is required";
    if (!pincode.trim() || !/^\d{6}$/.test(pincode)) return "Valid 6-digit pincode is required";
    
    return null;
  };

  const validateCustomization = () => {
    const incompleteCustomization = checkoutItems.find(item => {
      if (item.colors && !item.selectedColor) return true;
      if (item.sizes && !item.selectedSize) return true;
      if (item.rams && !item.selectedRam) return true;
      return false;
    });

    return incompleteCustomization;
  };

  // Handle customization changes
  const handleCustomizationChange = (itemId, field, value) => {
    setCheckoutItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
    
    updateCartItem(itemId, { [field]: value });
  };

  // Handle Input Change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors.form) {
      setErrors(prev => ({ ...prev, form: "" }));
    }
  };

  // Proceed to Payment
  const proceedToPayment = () => {
    const customizationError = validateCustomization();
    if (customizationError) {
      setErrors(prev => ({ ...prev, customization: "⚠️ Please select all customization options for your items!" }));
      return;
    }

    if (isFetchingUser) {
        setErrors(prev => ({ ...prev, form: "Loading user details. Please wait..." }));
        return;
    }
    if (!userDataFromDB || !userDataFromDB.userId) {
        setErrors(prev => ({ ...prev, form: "User details are not loaded. Please wait or refresh." }));
        return;
    }

    setCurrentStep(2);
    setErrors({ form: "", customization: "", payment: "" });
  };

  // Cancel Order
  const handleCancel = () => {
    sessionStorage.removeItem("selectedCartItems");
    navigate("/");
  };

  // Back to Customization
  const backToCustomization = () => {
    setCurrentStep(1);
    setErrors({ form: "", customization: "", payment: "" });
  };
  
  // 📍 MODIFIED: Handle Live Location without Reverse Geocoding API Key
  const handleLiveLocation = () => {
    if (!navigator.geolocation) {
      setErrors(prev => ({ ...prev, form: "Geolocation is not supported by your browser." }));
      return;
    }
    
    setFetchingLocation(true);
    setErrors(prev => ({ ...prev, form: "" }));

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      
      // Update form fields with coordinates and placeholder values
      setForm(prevForm => ({
        ...prevForm,
        // Setting the raw coordinates to the address field for user reference
        address: `Approximate Location: LAT ${latitude.toFixed(6)}, LNG ${longitude.toFixed(6)}`, 
        city: prevForm.city || 'Location Fetched', // Use a placeholder or existing value
        pincode: prevForm.pincode || '000000'     // Use a placeholder or existing value
      }));
      
      setErrors(prev => ({ 
          ...prev, 
          form: "✅ Location Fetched ."
      }));
      
      setFetchingLocation(false);
      
    }, (error) => {
      setFetchingLocation(false);
      let errorMessage = "Could not get location.";
      if (error.code === error.PERMISSION_DENIED) {
        errorMessage = "Location access denied. Please allow location access in your browser settings.";
      } else if (error.code === error.TIMEOUT) {
        errorMessage = "Location request timed out.";
      }
      setErrors(prev => ({ ...prev, form: `⚠️ ${errorMessage}` }));
    });
  };

  // Save Order to Firebase Firestore
  const saveOrderToFirebase = async (data, userId) => {
    try {
        // Saving the order document in the user's subcollection
        const ordersCollectionRef = collection(db, "users", userId, "orders"); 
        
        const dataWithTimestamp = {
          ...data,
          customerID: userId,
          createdAt: serverTimestamp() 
        }

        const docRef = await addDoc(ordersCollectionRef, dataWithTimestamp);
        console.log("Order successfully written to subcollection with ID: ", docRef.id);
        return true;
    } catch (e) {
        console.error("Error adding document to Firebase subcollection: ", e);
        setErrors(prev => ({ ...prev, payment: "Payment was successful, but failed to save order! Please contact support with your payment details." }));
        return false;
    }
  };

  // Create Razorpay Order (Mock function for front-end)
  const createRazorpayOrder = async (amount) => {
    return {
      id: `order_${Date.now()}`,
      currency: "INR",
      amount: amount * 100,
    };
  };

  // Verify Payment (Mock function for front-end)
  const verifyPayment = async (razorpayPaymentId, razorpayOrderId, razorpaySignature) => {
    return { success: true };
  };

  // Initialize Razorpay Payment
  const initializeRazorpayPayment = async () => {
    if (!window.Razorpay) {
      setErrors(prev => ({ ...prev, payment: "Payment gateway not loaded. Please refresh the page." }));
      return false;
    }
    
    const currentUserId = userDataFromDB?.userId;

    if (!currentUserId) {
        setErrors(prev => ({ ...prev, payment: "User not logged in. Cannot proceed with payment." }));
        return false;
    }

    try {
      const order = await createRazorpayOrder(total);
      
      const options = {
        key: "rzp_test_RD3J1sajzD89a8", // Use your actual key here in production
        amount: order.amount,
        currency: order.currency,
        name: "Your Store Name",
        description: "Order Payment",
        handler: async function (response) {
          setProcessingPayment(true);
          
          try {
            const verificationResult = await verifyPayment(
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature
            );

            if (verificationResult.success) {
              const orderData = {
                paymentId: response.razorpay_payment_id,
                orderId: `ORD-${Date.now()}`,
                razorpayOrderId: response.razorpay_order_id,
                amount: total,
                items: checkoutItems,
                customerInfo: form,
                paymentMethod: "razorpay",
                status: "confirmed",
                createdAt: new Date().toISOString()
              };

              const saved = await saveOrderToFirebase(orderData, currentUserId);
              if (!saved) {
                  setProcessingPayment(false);
                  return; 
              }

              sessionStorage.setItem("orderSuccessData", JSON.stringify(orderData));

              clearCart();
              sessionStorage.removeItem("selectedCartItems");
              
              navigate("/order-success");
            } else {
              setErrors(prev => ({ ...prev, payment: "Payment verification failed. Please try again." }));
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            setErrors(prev => ({ ...prev, payment: "Payment verification failed. Please contact support." }));
          } finally {
            setProcessingPayment(false);
          }
        },
        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phone,
        },
        notes: {
          address: `${form.address}, ${form.city} - ${form.pincode}`,
        },
        theme: {
          color: "#6366f1",
        },
        modal: {
          ondismiss: function() {
            setProcessingPayment(false);
            setErrors(prev => ({ ...prev, payment: "Payment was cancelled. Please try again." }));
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      return true;

    } catch (error) {
      console.error("Razorpay initialization error:", error);
      setErrors(prev => ({ ...prev, payment: "Failed to initialize payment. Please try again." }));
      return false;
    }
  };

  // Handle different payment methods
  const handlePayment = async () => {
    if (processingPayment) return;

    const formError = validateForm();
    if (formError) {
      setErrors(prev => ({ ...prev, form: `⚠️ ${formError}` }));
      return;
    }

    if (!paymentMethod) {
      setErrors(prev => ({ ...prev, payment: "⚠️ Please select a payment method!" }));
      return;
    }
    
    const currentUserId = userDataFromDB?.userId;

    if (!currentUserId) {
        setErrors(prev => ({ ...prev, payment: "User not logged in. Cannot proceed with payment." }));
        setProcessingPayment(false);
        return;
    }

    setProcessingPayment(true);
    setErrors({ form: "", customization: "", payment: "" });

    try {
      if (paymentMethod === "razorpay") {
        await initializeRazorpayPayment();
      } else if (paymentMethod === "cod") {
        const orderData = {
          paymentId: `COD-${Date.now()}`,
          orderId: `ORD-${Date.now()}`,
          amount: total,
          items: checkoutItems,
          customerInfo: form,
          paymentMethod: "cod",
          status: "pending",
          createdAt: new Date().toISOString()
        };

        const saved = await saveOrderToFirebase(orderData, currentUserId);
        if (!saved) {
            setProcessingPayment(false);
            return;
        }

        sessionStorage.setItem("orderSuccessData", JSON.stringify(orderData));

        alert("Order Placed Successfully! (Cash on Delivery)");
        
        clearCart();
        sessionStorage.removeItem("selectedCartItems");
        
        navigate("/order-success");
      } else {
        // Default to Razorpay if another method is selected but not explicitly handled
        await initializeRazorpayPayment(); 
      }
      
    } catch (error) {
      console.error("Payment error:", error);
      setErrors(prev => ({ ...prev, payment: "Payment failed. Please try again." }));
    } finally {
      // Ensure processingPayment is reset if COD was selected
      if (paymentMethod === "cod") {
        setProcessingPayment(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">

        {/* STEP INDICATOR */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center">
            <div className={`flex flex-col items-center ${currentStep >= 1 ? 'text-purple-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${currentStep >= 1 ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-400'}`}>
                1
              </div>
              <span className="text-sm mt-1">Customize</span>
            </div>
            <div className={`w-16 h-1 mx-2 ${currentStep >= 2 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
            <div className={`flex flex-col items-center ${currentStep >= 2 ? 'text-purple-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${currentStep >= 2 ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-400'}`}>
                2
              </div>
              <span className="text-sm mt-1">Payment</span>
            </div>
          </div>
        </div>

        {/* PAGE TITLE */}
        <h2 className="text-2xl font-bold text-center mb-6">
          {currentStep === 1 ? "Customize Your Order" : "Payment Details"}
        </h2>

        {/* ERROR MESSAGES */}
        {errors.customization && (
          <div className="mb-4 text-green-600 font-semibold text-center p-3 bg-red-50 rounded-lg">
            {errors.customization}
          </div>
        )}
        {errors.form && (
          <div className="mb-4 text-green-600 font-semibold text-center p-3 bg-red-50 rounded-lg">
            {errors.form}
          </div>
        )}
        {errors.payment && (
          <div className="mb-4 text-green-600 font-semibold text-center p-3 bg-red-50 rounded-lg">
            {errors.payment}
          </div>
        )}

        {/* STEP 1: CUSTOMIZATION */}
        {currentStep === 1 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Customize Your Items</h3>

            <div className="space-y-6 mb-6">
              {checkoutItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-lg">{item.name}</h4>
                      <p className="text-gray-600">Quantity: {item.quantity}</p>
                      <p className="text-purple-600 font-bold">
                        ₹{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* CUSTOMIZATION OPTIONS */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* COLOR SELECTION */}
                    {item.colors && item.colors.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Color
                        </label>
                        <select
                          value={item.selectedColor || ""}
                          onChange={(e) => handleCustomizationChange(item.id, 'selectedColor', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2"
                        >
                          <option value="">Select Color</option>
                          {item.colors.map((color, index) => (
                            <option key={index} value={color}>
                              {color}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* SIZE SELECTION */}
                    {item.sizes && item.sizes.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Size
                        </label>
                        <select
                          value={item.selectedSize || ""}
                          onChange={(e) => handleCustomizationChange(item.id, 'selectedSize', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2"
                        >
                          <option value="">Select Size</option>
                          {item.sizes.map((size, index) => (
                            <option key={index} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* RAM SELECTION */}
                    {item.rams && item.rams.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          RAM
                        </label>
                        <select
                          value={item.selectedRam || ""}
                          onChange={(e) => handleCustomizationChange(item.id, 'selectedRam', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2"
                        >
                          <option value="">Select RAM</option>
                          {item.rams.map((ram, index) => (
                            <option key={index} value={ram}>
                              {ram}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* SELECTED CUSTOMIZATION DISPLAY */}
                  {(item.selectedColor || item.selectedSize || item.selectedRam) && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">
                        Selected:{" "}
                        {[
                          item.selectedColor && `Color: ${item.selectedColor}`,
                          item.selectedSize && `Size: ${item.selectedSize}`,
                          item.selectedRam && `RAM: ${item.selectedRam}`
                        ].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* PROCEED TO PAYMENT BUTTON */}
            <div className="flex gap-4">
              <button
                onClick={handleCancel}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Cancel Order
              </button>
              <button
                onClick={proceedToPayment}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PAYMENT */}
        {currentStep === 2 && (
          <div>
            {/* SHIPPING FORM */}
            <h3 className="text-xl font-semibold mb-4">Shipping Information</h3>
            
            {/* LIVE LOCATION BUTTON */}
            <button
              onClick={handleLiveLocation}
              disabled={fetchingLocation}
              className={`w-full mb-6 py-2 rounded-lg font-medium transition-colors ${
                fetchingLocation
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-500 hover:bg-indigo-600'
              } text-white`}
            >
              {fetchingLocation ? 'Fetching Coordinates...' : '📍 Use Current Location (Coordinates Only)'}
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="name" className="sr-only">Full Name</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Full Name *"
                  value={form.name}
                  onChange={handleChange}
                  className="border p-3 rounded w-full"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="sr-only">Email</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Email *"
                  value={form.email}
                  onChange={handleChange}
                  className="border p-3 rounded w-full"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="sr-only">Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  placeholder="Phone Number *"
                  value={form.phone}
                  onChange={handleChange}
                  className="border p-3 rounded w-full"
                  required
                />
              </div>

              <div>
                <label htmlFor="city" className="sr-only">City</label>
                <input
                  id="city"
                  type="text"
                  name="city"
                  placeholder="City *"
                  value={form.city}
                  onChange={handleChange}
                  className="border p-3 rounded w-full"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="address" className="sr-only">Address</label>
                <input
                  id="address"
                  type="text"
                  name="address"
                  placeholder="Address *"
                  value={form.address}
                  onChange={handleChange}
                  className="border p-3 rounded w-full"
                  required
                />
              </div>

              <div>
                <label htmlFor="pincode" className="sr-only">Pincode</label>
                <input
                  id="pincode"
                  type="text"
                  name="pincode"
                  placeholder="Pincode *"
                  value={form.pincode}
                  onChange={handleChange}
                  className="border p-3 rounded w-full"
                  required
                />
              </div>
            </div>

            {/* ORDER SUMMARY WITH CUSTOMIZATION */}
            <h3 className="text-xl font-semibold mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4">
              {checkoutItems.map((item) => (
                <div
                  key={item.id}
                  className="border p-3 rounded-lg bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-gray-600 text-sm">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-bold text-purple-600">
                      ₹{(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                  
                  {/* Display selected customizations */}
                  {(item.selectedColor || item.selectedSize || item.selectedRam) && (
                    <div className="text-sm text-gray-600 bg-white p-2 rounded border">
                      <strong>Customization:</strong>{" "}
                      {[
                        item.selectedColor && `Color: ${item.selectedColor}`,
                        item.selectedSize && `Size: ${item.selectedSize}`,
                        item.selectedRam && `RAM: ${item.selectedRam}`
                      ].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* PAYMENT OPTIONS */}
            <h3 className="text-xl font-semibold mt-6 mb-3">Select Payment Method</h3>
            <div className="space-y-3 border p-4 rounded mb-4">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="payment"
                  value="razorpay"
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5"
                />
                <span className="font-medium">Razorpay (Credit/Debit Card, UPI, Net Banking)</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5"
                />
                <span className="font-medium">Cash on Delivery (COD)</span>
              </label>
            </div>

            {/* TOTAL */}
            <div className="text-right text-xl font-bold mb-6 mt-4">
              Total:{" "}
              <span className="text-purple-600">₹{total.toLocaleString()}</span>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col md:flex-row gap-4">
              <button
                onClick={backToCustomization}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Back to Customization
              </button>
              
              <button
                onClick={handlePayment}
                disabled={processingPayment}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                  processingPayment 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {processingPayment ? 'Processing...' : paymentMethod === 'cod' ? 'Place Order' : 'Pay Now'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;