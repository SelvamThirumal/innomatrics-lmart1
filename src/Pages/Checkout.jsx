import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
// ✅ UPDATED IMPORTS: Added doc, getDoc, and serverTimestamp
import { db } from '../../firebase'; 
import { collection, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore"; // ⬅️ NEW IMPORTS

const Checkout = () => {
  const navigate = useNavigate();
  const { items, clearCart, updateCartItem } = useCart();

  const [checkoutItems, setCheckoutItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentStep, setCurrentStep] = useState(1); // 1: Customization, 2: Payment
  const [processingPayment, setProcessingPayment] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    pincode: "",
    city: "",
    email: ""
  });
  
  // ✅ NEW STATE: To store the full user data fetched from DB (and userId)
  const [userDataFromDB, setUserDataFromDB] = useState(null); 
  const [isFetchingUser, setIsFetchingUser] = useState(true);

  const [paymentMethod, setPaymentMethod] = useState("");
  const [errors, setErrors] = useState({
    form: "",
    customization: "",
    payment: ""
  });

  const [fetchingLocation, setFetchingLocation] = useState(false); // State for location loading

  // 🔑 STEP 1: Fetch User Data and Pre-fill Form using userId from localStorage
  useEffect(() => {
    // Firebase UID is stored as 'token'
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
            userId: currentUserId, // Explicitly adding userId
          });

          // Pre-fill form with existing user data
          setForm(prevForm => ({
            ...prevForm,
            name: userData.name || prevForm.name,
            email: userData.email || prevForm.email,
            phone: userData.contactNo || userData.phone || prevForm.phone, 
          }));
        } else {
          setUserDataFromDB({ userId: currentUserId }); // Still set the userId even if doc is not fully populated
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

  // Load Razorpay script (no change)
  useEffect(() => {
    const loadRazorpayScript = () => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          resolve(true);
        };
        script.onerror = () => {
          resolve(false);
        };
        document.body.appendChild(script);
      });
    };

    loadRazorpayScript();
  }, []);

  // Load selected items or full cart (no change)
  useEffect(() => {
    const stored = sessionStorage.getItem("selectedCartItems");

    if (stored) {
      const selected = JSON.parse(stored);
      // Initialize customization options for each item
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

  // Validation functions (updated to check for fetched user ID)
  const validateForm = () => {
    const { name, phone, address, city, pincode, email } = form;
    
    // Check for fetched user ID
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

  // Handle customization changes (no change)
  const handleCustomizationChange = (itemId, field, value) => {
    setCheckoutItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
    
    // Also update the cart context
    updateCartItem(itemId, { [field]: value });
  };

  // Handle Input Change (no change)
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear form errors when user starts typing
    if (errors.form) {
      setErrors(prev => ({ ...prev, form: "" }));
    }
  };

  // Proceed to Payment (updated to check for user data loading)
  const proceedToPayment = () => {
    const customizationError = validateCustomization();
    if (customizationError) {
      setErrors(prev => ({ ...prev, customization: "⚠️ Please select all customization options for your items!" }));
      return;
    }

    // CRITICAL CHECK: Check if user data is loaded before proceeding
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

  // Cancel Order → Go Home + clear session selected items (no change)
  const handleCancel = () => {
    sessionStorage.removeItem("selectedCartItems");
    navigate("/");
  };

  // Back to Customization (no change)
  const backToCustomization = () => {
    setCurrentStep(1);
    setErrors({ form: "", customization: "", payment: "" });
  };
  
  // Invoice download logic (kept for reference, should be moved to OrderSuccess.jsx) (no change)
  const downloadInvoice = (invoiceData) => {
    const customizationText = invoiceData.items.map(item => {
      let customText = "";
      if (item.selectedColor) customText += `Color: ${item.selectedColor}, `;
      if (item.selectedSize) customText += `Size: ${item.selectedSize}, `;
      if (item.selectedRam) customText += `RAM: ${item.selectedRam}`;
      return customText;
    });

    const invoiceText =
      `----- INVOICE -----\n\n` +
      `Order ID: ${invoiceData.orderId}\n` +
      `Payment ID: ${invoiceData.paymentId}\n` +
      `Status: ${invoiceData.status.toUpperCase()}\n\n` +
      `Customer: ${invoiceData.customerInfo.name}\n` +
      `Email: ${invoiceData.customerInfo.email}\n` +
      `Phone: ${invoiceData.customerInfo.phone}\n` +
      `Address: ${invoiceData.customerInfo.address}, ${invoiceData.customerInfo.city} - ${invoiceData.customerInfo.pincode}\n\n` +
      `---- ORDER ITEMS ----\n` +
      invoiceData.items
        .map(
          (i, index) =>
            `${i.name} x ${i.quantity} = ₹${(i.price * i.quantity).toLocaleString()}\n` +
            `  Customization: ${customizationText[index] || 'None'}`
        )
        .join("\n") +
      `\n\nTotal: ₹${invoiceData.amount.toLocaleString()}`;

    const blob = new Blob([invoiceText], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice_${invoiceData.orderId}.txt`;
    a.click();
  };
  
  // Handle Live Location Click - MODIFIED TO USE PLACEHOLDERS (no change)
  const handleLiveLocation = () => {
    if (!navigator.geolocation) {
      setErrors(prev => ({ ...prev, form: "Geolocation is not supported by your browser." }));
      return;
    }
    
    setFetchingLocation(true);
    setErrors(prev => ({ ...prev, form: "" }));

    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      
      setFetchingLocation(false);

      // ⚠️ IMPORTANT NOTE: Reverse Geocoding (Lat/Lng -> Readable Address) requires a third-party API like Google Maps API.
      alert(`Successfully captured Coordinates: Latitude ${latitude}, Longitude ${longitude}. Please review the pre-filled fields.\n\nNOTE: To convert coordinates to a readable street address (reverse geocoding), you must integrate a service like Google Maps Geocoding API or a custom backend service.`);

      // Pre-fill fields with coordinates/placeholders
      setForm(prevForm => ({
        ...prevForm,
        address: `Coordinates: LAT ${latitude.toFixed(6)}, LNG ${longitude.toFixed(6)}`,
        city: 'Location Fetched', // Placeholder for city
        pincode: '000000' // Placeholder for pincode
      }));
      setErrors(prev => ({ ...prev, form: "Live Location coordinates captured. Reverse Geocoding API required for full address." }));
      
    }, (error) => {
      setFetchingLocation(false);
      let errorMessage = "Could not get location.";
      if (error.code === error.PERMISSION_DENIED) {
        errorMessage = "Location access denied. Please allow location access in your browser settings.";
      }
      setErrors(prev => ({ ...prev, form: `⚠️ ${errorMessage}` }));
    });
  };

  // 🔑 CRITICAL CHANGE: Save Order to Firebase Firestore (takes data AND userId)
  const saveOrderToFirebase = async (data, userId) => {
    try {
        // ➡️ Use the subcollection path: users/{userId}/orders
        const ordersCollectionRef = collection(db, "users", userId, "orders"); 
        
        // Use serverTimestamp for Firestore time
        const dataWithTimestamp = {
          ...data,
          // Store a reference to the top-level user data for easy lookup/querying if needed
          customerID: userId, 
          // Use Firestore server timestamp for accurate timekeeping
          createdAt: serverTimestamp() 
        }

        const docRef = await addDoc(ordersCollectionRef, dataWithTimestamp);
        console.log("Order successfully written to subcollection with ID: ", docRef.id);
        return true;
    } catch (e) {
        console.error("Error adding document to Firebase subcollection: ", e);
        // Display a general error
        setErrors(prev => ({ ...prev, payment: "Payment was successful, but failed to save order! Please contact support with your payment details." }));
        return false;
    }
  };
  // 🔚 END NEW FUNCTION

  // Create Razorpay Order (Backend API call simulation) (no change)
  const createRazorpayOrder = async (amount) => {
    // In a real application, this would be a call to your backend
    // Simulated response
    return {
      id: `order_${Date.now()}`,
      currency: "INR",
      amount: amount * 100, // Convert to paise
      // In production, these should come from your backend
    };
  };

  // Verify Payment (Backend API call simulation) (no change)
  const verifyPayment = async (razorpayPaymentId, razorpayOrderId, razorpaySignature) => {
    // Simulated successful verification
    return { success: true };
  };

  // Initialize Razorpay Payment (updated to pass userId to saveOrderToFirebase)
  const initializeRazorpayPayment = async () => {
    if (!window.Razorpay) {
      setErrors(prev => ({ ...prev, payment: "Payment gateway not loaded. Please refresh the page." }));
      return false;
    }
    
    // Get the User ID
    const currentUserId = userDataFromDB?.userId;

    if (!currentUserId) {
        setErrors(prev => ({ ...prev, payment: "User not logged in. Cannot proceed with payment." }));
        return false;
    }

    try {
      // Create order on your backend (simulated)
      const order = await createRazorpayOrder(total);
      
      const options = {
        key: "rzp_test_RD3J1sajzD89a8", // Fixed: Hardcoded public key
        amount: order.amount, // Amount in paise
        currency: order.currency,
        name: "Your Store Name",
        description: "Order Payment",
        // ❌ FIX APPLIED: Removed order_id to fix 400 Bad Request in demo mode
        // order_id: order.id, 
        handler: async function (response) {
          // Handle successful payment
          setProcessingPayment(true);
          
          try {
            // Verify payment on your backend
            const verificationResult = await verifyPayment(
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature
            );

            if (verificationResult.success) {
              // Payment successful
              const orderData = {
                paymentId: response.razorpay_payment_id,
                orderId: `ORD-${Date.now()}`,
                razorpayOrderId: response.razorpay_order_id,
                amount: total,
                items: checkoutItems,
                customerInfo: form, // Store all form data including address in the order
                paymentMethod: "razorpay",
                status: "confirmed",
                createdAt: new Date().toISOString()
              };

              // 🔑 SAVE TO FIREBASE SUBCOLLECTION
              const saved = await saveOrderToFirebase(orderData, currentUserId);
              if (!saved) {
                  setProcessingPayment(false);
                  return; 
              }
              // 🔚 END FIREBASE SAVE

              // Store in sessionStorage for OrderSuccess component
              sessionStorage.setItem("orderSuccessData", JSON.stringify(orderData));

              clearCart();
              sessionStorage.removeItem("selectedCartItems");
              
              // Navigate to success page
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

  // Handle different payment methods (updated to pass userId to saveOrderToFirebase)
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
    
    // Get the User ID
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
        // Handle Razorpay payment
        await initializeRazorpayPayment();
      } else if (paymentMethod === "cod") {
        // Handle Cash on Delivery
        const orderData = {
          paymentId: `COD-${Date.now()}`,
          orderId: `ORD-${Date.now()}`,
          amount: total,
          items: checkoutItems,
          customerInfo: form,
          paymentMethod: "cod",
          status: "pending", // COD starts as pending
          createdAt: new Date().toISOString()
        };

        // 🔑 SAVE TO FIREBASE SUBCOLLECTION
        const saved = await saveOrderToFirebase(orderData, currentUserId);
        if (!saved) {
            setProcessingPayment(false);
            return;
        }
        // 🔚 END FIREBASE SAVE

        // Store in sessionStorage for OrderSuccess component
        sessionStorage.setItem("orderSuccessData", JSON.stringify(orderData));

        alert("Order Placed Successfully! (Cash on Delivery)");
        
        clearCart();
        sessionStorage.removeItem("selectedCartItems");
        
        // Navigate to success page
        navigate("/order-success");
      } else {
        // Handle other payment methods (UPI, Card, Net Banking through Razorpay)
        await initializeRazorpayPayment();
      }
      
    } catch (error) {
      console.error("Payment error:", error);
      setErrors(prev => ({ ...prev, payment: "Payment failed. Please try again." }));
    } finally {
      // Note: For Razorpay, we don't set processing to false here as it's handled in the modal callbacks
      if (paymentMethod === "cod") {
        setProcessingPayment(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">

        {/* STEP INDICATOR (no change) */}
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

        {/* PAGE TITLE (no change) */}
        <h2 className="text-2xl font-bold text-center mb-6">
          {currentStep === 1 ? "Customize Your Order" : "Payment Details"}
        </h2>

        {/* ERROR MESSAGES (no change) */}
        {errors.customization && (
          <div className="mb-4 text-red-600 font-semibold text-center p-3 bg-red-50 rounded-lg">
            {errors.customization}
          </div>
        )}
        {errors.form && (
          <div className="mb-4 text-red-600 font-semibold text-center p-3 bg-red-50 rounded-lg">
            {errors.form}
          </div>
        )}
        {errors.payment && (
          <div className="mb-4 text-red-600 font-semibold text-center p-3 bg-red-50 rounded-lg">
            {errors.payment}
          </div>
        )}

        {/* STEP 1: CUSTOMIZATION (no change) */}
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

                  {/* CUSTOMIZATION OPTIONS (no change) */}
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

                  {/* SELECTED CUSTOMIZATION DISPLAY (no change) */}
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

            {/* PROCEED TO PAYMENT BUTTON (no change) */}
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

        {/* STEP 2: PAYMENT (no change) */}
        {currentStep === 2 && (
          <div>
            {/* SHIPPING FORM (no change) */}
            <h3 className="text-xl font-semibold mb-4">Shipping Information</h3>
            
            {/* 🆕 LIVE LOCATION BUTTON (no change) */}
            <button
              onClick={handleLiveLocation}
              disabled={fetchingLocation}
              className={`w-full mb-6 py-2 rounded-lg font-medium transition-colors ${
                fetchingLocation
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-500 hover:bg-indigo-600'
              } text-white`}
            >
              {fetchingLocation ? 'Fetching Location...' : '📍 Use Live Location'}
            </button>
            {/* 🔚 LIVE LOCATION BUTTON */}

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
                  aria-required="true"
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
                  aria-required="true"
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
                  aria-required="true"
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
                  aria-required="true"
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
                  aria-required="true"
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
                  aria-required="true"
                />
              </div>
            </div>

            {/* ORDER SUMMARY WITH CUSTOMIZATION (no change) */}
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

            {/* PAYMENT OPTIONS (no change) */}
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

            {/* TOTAL (no change) */}
            <div className="text-right text-xl font-bold mb-6 mt-4">
              Total:{" "}
              <span className="text-purple-600">₹{total.toLocaleString()}</span>
            </div>

            {/* ACTION BUTTONS (no change) */}
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