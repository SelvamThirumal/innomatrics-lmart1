import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { db } from "../../firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const Checkout = () => {
  const navigate = useNavigate();
  const { items, clearCart, updateCartItem } = useCart();
  
  // ✅ DIRECT FIREBASE AUTH
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userData, setUserData] = useState(null); // Store additional user data

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
    email: "",
    latitude: null,
    longitude: null
  });

  const [paymentMethod, setPaymentMethod] = useState("");
  const [errors, setErrors] = useState({
    form: "",
    customization: "",
    payment: ""
  });

  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [fetchingUserData, setFetchingUserData] = useState(false);

  // ✅ AUTH STATE LISTENER
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch additional user data from Firestore
        await fetchUserData(user.uid);
      }
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  // ✅ FETCH USER DATA FROM FIRESTORE
  const fetchUserData = async (userId) => {
    try {
      setFetchingUserData(true);
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        
        // Auto-fill form with user data
        setForm(prev => ({
          ...prev,
          name: data.name || "",
          phone: data.phone || "",
          email: data.email || currentUser?.email || "",
          address: data.address || "",
          city: data.city || "",
          pincode: data.pincode || ""
        }));
      } else {
        // If no user document exists, use email from auth
        setForm(prev => ({
          ...prev,
          email: currentUser?.email || ""
        }));
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Still set email from auth
      setForm(prev => ({
        ...prev,
        email: currentUser?.email || ""
      }));
    } finally {
      setFetchingUserData(false);
    }
  };

  // ✅ REDIRECT TO LOGIN IF NOT AUTHENTICATED
  useEffect(() => {
    if (!authLoading && !currentUser) {
      sessionStorage.setItem("redirectAfterLogin", "/checkout");
      if (items.length > 0) {
        sessionStorage.setItem("cartBeforeLogin", JSON.stringify(items));
      }
      navigate("/login");
    }
  }, [currentUser, authLoading, navigate, items]);

  // 🔧 REVERSE GEOCODING FUNCTION
  const reverseGeocode = async (latitude, longitude) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'EcommerceApp/1.0 (contact@example.com)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        
        let fullAddress = data.display_name || '';
        let city = addr.city || addr.town || addr.village || addr.county || addr.state_district || '';
        let pincode = addr.postcode || '';
        let state = addr.state || addr.region || '';
        let country = addr.country || '';
        
        if (fullAddress.length > 150) {
          fullAddress = `${addr.road || ''} ${addr.suburb || ''}, ${city}, ${state}, ${country}`.trim();
        }
        
        return {
          fullAddress: fullAddress || `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          city: city || 'Location Fetched',
          pincode: pincode || '000000',
          state: state,
          country: country,
          road: addr.road || '',
          suburb: addr.suburb || '',
          coordinates: {
            latitude,
            longitude
          }
        };
      } else {
        throw new Error("No address found for these coordinates");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      throw error;
    }
  };

  // Load Razorpay script
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

  // Load selected items or full cart
  useEffect(() => {
    // Pre-fill email with logged-in user's email
    if (currentUser && currentUser.email && !form.email) {
      setForm(prev => ({
        ...prev,
        email: currentUser.email
      }));
    }

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
  }, [items, currentUser, form.email]);

  // Validation functions
  const validateForm = () => {
    const { name, phone, address, city, pincode, email } = form;
    
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

  // 🗺️ LIVE LOCATION HANDLER (UPDATED - No success message)
  const handleLiveLocation = async () => {
    if (!navigator.geolocation) {
      setErrors(prev => ({ ...prev, form: "Geolocation is not supported by your browser." }));
      return;
    }
    
    setFetchingLocation(true);
    setErrors(prev => ({ ...prev, form: "" }));

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          }
        );
      });
      
      const { latitude, longitude } = position.coords;
      
      setForm(prevForm => ({
        ...prevForm,
        address: `Fetching address for coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}...`,
        city: 'Fetching...',
        pincode: '',
        latitude: latitude,
        longitude: longitude
      }));
      
      try {
        const addressData = await reverseGeocode(latitude, longitude);
        
        // Auto-fill form silently without success message
        setForm(prevForm => ({
          ...prevForm,
          address: addressData.fullAddress,
          city: addressData.city,
          pincode: addressData.pincode,
          latitude: latitude,
          longitude: longitude
        }));
        
        // Don't show success message - just fill silently
        // setErrors(prev => ({ 
        //   ...prev, 
        //   form: `✅ Location fetched: ${addressData.city}, ${addressData.state || ''}` 
        // }));
        
      } catch (geocodeError) {
        setForm(prevForm => ({
          ...prevForm,
          address: `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          city: 'Your Location',
          pincode: '000000',
          latitude: latitude,
          longitude: longitude
        }));
        
        // Don't show error message for limited address
        // setErrors(prev => ({ 
        //   ...prev, 
        //   form: "📍 Location captured (address details limited)" 
        // }));
      }
      
    } catch (error) {
      setFetchingLocation(false);
      
      let errorMessage = "Could not get location.";
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Location access denied. Please enable location permissions in your browser settings.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information is unavailable. Please check your device settings.";
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out. Please try again.";
          break;
        default:
          errorMessage = `Location error: ${error.message}`;
      }
      
      setErrors(prev => ({ 
        ...prev, 
        form: `⚠️ ${errorMessage}` 
      }));
      
    } finally {
      setFetchingLocation(false);
    }
  };

  // Proceed to Payment
  const proceedToPayment = () => {
    if (!currentUser) {
      setErrors(prev => ({ ...prev, customization: "⚠️ Please login to proceed with checkout!" }));
      sessionStorage.setItem("redirectAfterLogin", "/checkout");
      navigate("/login");
      return;
    }

    const customizationError = validateCustomization();
    if (customizationError) {
      setErrors(prev => ({ ...prev, customization: "⚠️ Please select all customization options for your items!" }));
      return;
    }

    setCurrentStep(2);
    setErrors({ form: "", customization: "", payment: "" });
  };

  const handleCancel = () => {
    sessionStorage.removeItem("selectedCartItems");
    navigate("/");
  };

  const backToCustomization = () => {
    setCurrentStep(1);
    setErrors({ form: "", customization: "", payment: "" });
  };

  // Save Order to Firebase
  const saveOrderToFirebase = async (data) => {
    try {
      const ordersCollectionRef = collection(db, "orders");
      
      const orderDataWithUser = {
        ...data,
        userId: currentUser?.uid || null,
        userEmail: currentUser?.email || null
      };
      
      const docRef = await addDoc(ordersCollectionRef, orderDataWithUser);
      console.log("Order successfully written with ID: ", docRef.id);
      return true;
    } catch (e) {
      console.error("Error adding document to Firebase: ", e);
      setErrors(prev => ({ ...prev, payment: "Payment was successful, but failed to save order! Please contact support with your payment details." }));
      return false;
    }
  };

  const createRazorpayOrder = async (amount) => {
    return {
      id: `order_${Date.now()}`,
      currency: "INR",
      amount: amount * 100,
    };
  };

  const verifyPayment = async (razorpayPaymentId, razorpayOrderId, razorpaySignature) => {
    return { success: true };
  };

  const initializeRazorpayPayment = async () => {
    if (!window.Razorpay) {
      setErrors(prev => ({ ...prev, payment: "Payment gateway not loaded. Please refresh the page." }));
      return false;
    }

    try {
      const order = await createRazorpayOrder(total);
      
      const options = {
        key: "rzp_test_RD3J1sajzD89a8", 
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
                createdAt: new Date().toISOString(),
                latitude: form.latitude,
                longitude: form.longitude,
                userId: currentUser?.uid,
                userEmail: currentUser?.email
              };
              
              const saved = await saveOrderToFirebase(orderData);
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

  const handlePayment = async () => {
    if (processingPayment) return;

    if (!currentUser) {
      setErrors(prev => ({ ...prev, payment: "⚠️ Please login to complete your order!" }));
      sessionStorage.setItem("redirectAfterLogin", "/checkout");
      navigate("/login");
      return;
    }

    const formError = validateForm();
    if (formError) {
      setErrors(prev => ({ ...prev, form: `⚠️ ${formError}` }));
      return;
    }

    if (!paymentMethod) {
      setErrors(prev => ({ ...prev, payment: "⚠️ Please select a payment method!" }));
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
          createdAt: new Date().toISOString(),
          latitude: form.latitude,
          longitude: form.longitude,
          userId: currentUser?.uid,
          userEmail: currentUser?.email
        };

        const saved = await saveOrderToFirebase(orderData);
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
        await initializeRazorpayPayment();
      }
      
    } catch (error) {
      console.error("Payment error:", error);
      setErrors(prev => ({ ...prev, payment: "Payment failed. Please try again." }));
    } finally {
      if (paymentMethod === "cod") {
        setProcessingPayment(false);
      }
    }
  };

  // ✅ SHOW LOADING WHILE CHECKING AUTHENTICATION
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // ✅ SHOW NOT LOGGED IN MESSAGE
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">You need to be logged in to access the checkout page.</p>
          <button
            onClick={() => navigate("/login")}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // 🛒 MAIN CHECKOUT PAGE
  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        {/* USER INFO BANNER - UPDATED WITHOUT ROUND MARK */}
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Logged in as: {currentUser.email}</p>
              <p className="text-sm text-green-600">
                {fetchingUserData ? (
                  <span className="flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Fetching your details...
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Secure checkout
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
          >
            ← Continue Shopping
          </button>
        </div>
        
        {/* CHECKOUT PROGRESS STEPS */}
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
        
        <h2 className="text-2xl font-bold text-center mb-6">
          {currentStep === 1 ? "Customize Your Order" : "Complete Your Order"}
        </h2>
        
        {/* ERROR MESSAGES - Only show actual errors, not success messages */}
        {errors.customization && (
          <div className="mb-4 text-red-600 font-semibold text-center p-3 bg-red-50 rounded-lg">
            {errors.customization}
          </div>
        )}
        
        {errors.form && errors.form.startsWith("⚠️") && (
          <div className="mb-4 text-red-600 font-semibold text-center p-3 bg-red-50 rounded-lg">
            {errors.form}
          </div>
        )}
        
        {errors.payment && (
          <div className="mb-4 text-red-600 font-semibold text-center p-3 bg-red-50 rounded-lg">
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        
        {/* STEP 2: PAYMENT & SHIPPING */}
        {currentStep === 2 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Shipping Information</h3>
            
            {/* LIVE LOCATION BUTTON - UPDATED STYLING */}
            <button
              onClick={handleLiveLocation}
              disabled={fetchingLocation}
              className={`w-full mb-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                fetchingLocation
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } text-white`}
            >
              {fetchingLocation ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Fetching Location...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  Use Live Location (Auto-fill Address)
                </>
              )}
            </button>
            
            {/* SHIPPING FORM WITH AUTO-FILLED USER DATA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={handleChange}
                  className="border p-3 rounded w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                {userData?.name && (
                  <p className="text-xs text-green-600 mt-1">✓ Auto-filled from your profile</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={handleChange}
                  className="border p-3 rounded w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                  required
                  readOnly
                />
                <p className="text-xs text-green-600 mt-1">✓ Your account email</p>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  placeholder="10-digit phone number"
                  value={form.phone}
                  onChange={handleChange}
                  className="border p-3 rounded w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                {userData?.phone && (
                  <p className="text-xs text-green-600 mt-1">✓ Auto-filled from your profile</p>
                )}
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  id="city"
                  type="text"
                  name="city"
                  placeholder="Enter your city"
                  value={form.city}
                  onChange={handleChange}
                  className="border p-3 rounded w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <textarea
                  id="address"
                  name="address"
                  placeholder="Enter your complete address"
                  value={form.address}
                  onChange={handleChange}
                  className="border p-3 rounded w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows="3"
                  required
                />
              </div>

              <div>
                <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode *
                </label>
                <input
                  id="pincode"
                  type="text"
                  name="pincode"
                  placeholder="6-digit pincode"
                  value={form.pincode}
                  onChange={handleChange}
                  className="border p-3 rounded w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              
              {/* Hidden fields for coordinates */}
              <input type="hidden" name="latitude" value={form.latitude || ''} />
              <input type="hidden" name="longitude" value={form.longitude || ''} />
            </div>
            
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
            
            <h3 className="text-xl font-semibold mt-6 mb-3">Select Payment Method</h3>
            <div className="space-y-3 border p-4 rounded mb-4">
              <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="razorpay"
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5 text-purple-600"
                />
                <div>
                  <span className="font-medium">Razorpay (Credit/Debit Card, UPI, Net Banking)</span>
                  <p className="text-sm text-gray-500">Secure online payment</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5 text-purple-600"
                />
                <div>
                  <span className="font-medium">Cash on Delivery (COD)</span>
                  <p className="text-sm text-gray-500">Pay when you receive the order</p>
                </div>
              </label>
            </div>

            {/* TOTAL */}
            <div className="text-right text-xl font-bold mb-6 mt-4 border-t pt-4">
              Total:{" "}
              <span className="text-purple-600">₹{total.toLocaleString()}</span>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col md:flex-row gap-4">
              <button
                onClick={backToCustomization}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                ← Back to Customization
              </button>
              
              <button
                onClick={handlePayment}
                disabled={processingPayment}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  processingPayment 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : paymentMethod === 'cod' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-purple-600 hover:bg-purple-700'
                } text-white`}
              >
                {processingPayment ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : paymentMethod === 'cod' ? (
                  'Place Order (COD)'
                ) : (
                  'Pay Now'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;