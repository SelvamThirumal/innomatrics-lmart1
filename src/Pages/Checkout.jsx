import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { db } from '../../firebase'; 
import { collection, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import emailjs from '@emailjs/browser';

// 🔑 EMAIL.JS CONFIGURATION
const EMAILJS_SERVICE_ID = "service_36kp6wg"; 
const EMAILJS_COD_TEMPLATE_ID = "template_1g7dneu"; 
const EMAILJS_PAID_TEMPLATE_ID = "your_actual_paid_template_id_here"; 
const EMAILJS_PUBLIC_KEY = "3oPaXcWIwr2sMfais"; 
const EMAILJS_AUTO_REPLY_TEMPLATE_ID = "template_1c9n9w2"; 
const ADMIN_EMAIL = "your.shop.admin@example.com";

// 📧 AUTO REPLY FUNCTION
const sendAutoReply = async (templateParams) => {
    try {
        await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_AUTO_REPLY_TEMPLATE_ID,
            templateParams,
            EMAILJS_PUBLIC_KEY
        );
        console.log("✅ Auto-reply email sent to customer");
    } catch (error) {
        console.error("❌ Auto-reply email failed:", error);
    }
};

// 📧 EMAIL SENDING FUNCTION
const sendOrderEmail = async (type, templateParams) => {
    const templateId = type === 'COD' ? EMAILJS_COD_TEMPLATE_ID : EMAILJS_PAID_TEMPLATE_ID;

    if (templateId.includes("actual_id")) {
         console.error(`Email.js Error: Template ID for ${type} is a placeholder. Skipping email.`);
         return { success: false, error: "Missing Email.js configuration." };
    }
    
    try {
        console.log(`Attempting to send ${type} order email via Email.js...`);
        await emailjs.send(EMAILJS_SERVICE_ID, templateId, templateParams, EMAILJS_PUBLIC_KEY);
        console.log(`✅ ${type} order email successfully sent.`);
        return { success: true };
    } catch (error) {
        console.error(`⚠️ Non-critical Error sending ${type} email via Email.js:`, error);
        return { success: true, warning: `Email failed to send: ${error.message}` };
    }
};

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const buyNowItem = location.state?.item;
  const isBuyNow = location.state?.buyNow;
  const skipToPayment = location.state?.skipToPayment;

  const { items, clearCart, updateCartItem } = useCart();

  const [checkoutItems, setCheckoutItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentStep, setCurrentStep] = useState(skipToPayment ? 2 : 1);
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
  const [isCartEmpty, setIsCartEmpty] = useState(false);
  const [locationDetails, setLocationDetails] = useState({
    latitude: null,
    longitude: null,
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: ""
  });
  
  // 🔥 NEW STATE FOR SELLER INFORMATION
  const [productSellerInfo, setProductSellerInfo] = useState({});

  // 🔑 Fetch User Data from Firebase
  useEffect(() => {
    const currentUserId = localStorage.getItem('token'); 
    
    // 🛑 MODIFICATION: Check for user ID and redirect to login if missing
    if (!currentUserId) {
      setErrors(prev => ({ 
        ...prev, 
        form: "You must be logged in to checkout. Redirecting to login..." 
      }));
      setIsFetchingUser(false);
      // 🔥 Redirect to login page
      navigate("/login", { replace: true, state: { from: location.pathname } }); 
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
        setErrors(prev => ({ ...prev, form: "Failed to load user information. Please refresh the page." }));
      } finally {
        setIsFetchingUser(false);
      }
    };

    fetchUserData();
  }, [navigate, location.pathname]); // Added dependencies

  // 🔥 NEW FUNCTION: Fetch Seller IDs from Products
  const fetchSellerIdsForProducts = async (productIds) => {
    try {
      const sellerInfo = {};
      
      for (const id of productIds) {
        const productRef = doc(db, "products", id);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const productData = productSnap.data();
          sellerInfo[id] = {
            sellerId: productData.sellerId || productData.sellerID || null,
            sellerName: productData.sellerName || "Unknown Seller",
            // You can add more seller info here if needed
            sellerEmail: productData.sellerEmail || "",
            sellerPhone: productData.sellerPhone || ""
          };
        } else {
          console.warn(`Product not found for ID: ${id}`);
          sellerInfo[id] = {
            sellerId: null,
            sellerName: "Unknown Seller"
          };
        }
      }

      setProductSellerInfo(sellerInfo);
      console.log("✅ Seller info fetched:", sellerInfo);
    } catch (error) {
      console.error("❌ Error fetching seller IDs:", error);
    }
  };

  // Check cart status
  useEffect(() => {
    const hasRegularItems = items && items.length > 0;
    const stored = sessionStorage.getItem("selectedCartItems");
    const hasStoredItems = stored && JSON.parse(stored).length > 0;
    const hasBuyNowItem = isBuyNow && buyNowItem;
    
    if (!hasRegularItems && !hasStoredItems && !hasBuyNowItem) {
      console.error("No items available for checkout");
      setIsCartEmpty(true);
      return;
    }
    
    setIsCartEmpty(false);
  }, [isBuyNow, buyNowItem, items]);

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

  // Load cart items and calculate total
  useEffect(() => {
    if (isCartEmpty) return;
    
    let itemsToUse;

    if (isBuyNow && buyNowItem) {
      itemsToUse = [buyNowItem];
    } else {
      const stored = sessionStorage.getItem("selectedCartItems");
      itemsToUse = stored && JSON.parse(stored).length > 0 
        ? JSON.parse(stored) 
        : items.filter(item => item.quantity > 0);
    }

    if (!itemsToUse || itemsToUse.length === 0) {
      console.error("No items to checkout after validation");
      setIsCartEmpty(true);
      return;
    }

    const itemsWithCustomization = itemsToUse.map(item => {
      const processedItem = {
        ...item,
        quantity: item.quantity || 1,
        selectedColor: item.selectedColor || "",
        selectedSize: item.selectedSize || "",
        selectedRam: item.selectedRam || "",
        colors: item.colors || [],
        sizes: item.sizes || [],
        rams: item.rams || []
      };
      
      if (isBuyNow) {
        if (processedItem.colors.length > 0 && !processedItem.selectedColor) {
          processedItem.selectedColor = processedItem.colors[0];
        }
        if (processedItem.sizes.length > 0 && !processedItem.selectedSize) {
          processedItem.selectedSize = processedItem.sizes[0];
        }
        if (processedItem.rams.length > 0 && !processedItem.selectedRam) {
          processedItem.selectedRam = processedItem.rams[0];
        }
      }
      
      return processedItem;
    });

    setCheckoutItems(itemsWithCustomization);
    console.log("Checkout Items:", itemsWithCustomization);

    const sum = itemsWithCustomization.reduce(
        (acc, item) => acc + (item.price || 0) * (item.quantity || 0),
        0
    );
    setTotal(sum);
    setIsCartEmpty(false);

    // 🔥 FETCH SELLER INFO FOR ALL PRODUCTS
    const productIds = itemsWithCustomization.map(item => item.id);
    if (productIds.length > 0) {
      fetchSellerIdsForProducts(productIds);
    }
  }, [items, isBuyNow, buyNowItem, isCartEmpty]);

  // Reverse Geocoding Function - Convert coordinates to address
  const reverseGeocode = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch address');
      }
      
      const data = await response.json();
      
      if (data && data.address) {
        const address = data.address;
        
        // Build a proper address string
        const addressParts = [];
        if (address.house_number) addressParts.push(address.house_number);
        if (address.road) addressParts.push(address.road);
        if (address.suburb) addressParts.push(address.suburb);
        if (address.neighbourhood) addressParts.push(address.neighbourhood);
        
        const city = address.city || address.town || address.village || address.county || "";
        const state = address.state || "";
        const pincode = address.postcode || "";
        const country = address.country || "";
        
        // Create a formatted address string
        const formattedAddress = addressParts.length > 0 
          ? addressParts.join(", ")
          : data.display_name || `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        
        return {
          formattedAddress,
          road: address.road || "",
          suburb: address.suburb || "",
          city,
          state,
          pincode,
          country,
          fullAddress: data.display_name || formattedAddress
        };
      }
      
      return null;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return null;
    }
  };

  // 📍 Handle Live Location with Reverse Geocoding
  const handleLiveLocation = async () => {
    if (!navigator.geolocation) {
      setErrors(prev => ({ ...prev, form: "Geolocation is not supported by your browser." }));
      return;
    }
    
    setFetchingLocation(true);
    setErrors(prev => ({ ...prev, form: "" }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // First show coordinates while fetching address
        setLocationDetails({
          latitude,
          longitude,
          address: "Fetching address...",
          city: "",
          state: "",
          pincode: "",
          country: ""
        });
        
        // Reverse geocode to get address
        const addressDetails = await reverseGeocode(latitude, longitude);
        
        if (addressDetails) {
          // Update location details with actual address
          setLocationDetails({
            latitude,
            longitude,
            address: addressDetails.formattedAddress,
            city: addressDetails.city,
            state: addressDetails.state,
            pincode: addressDetails.pincode,
            country: addressDetails.country,
            fullAddress: addressDetails.fullAddress
          });
          
          // Auto-fill the form with fetched address
          setForm(prevForm => ({
            ...prevForm,
            address: addressDetails.formattedAddress,
            city: addressDetails.city || prevForm.city,
            pincode: addressDetails.pincode || prevForm.pincode
          }));
          
          setErrors(prev => ({ 
            ...prev, 
            form: "✅ Location fetched successfully! Address auto-filled."
          }));
        } else {
          // If reverse geocoding fails, use coordinates but format better
          const fallbackAddress = `GPS Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setForm(prevForm => ({
            ...prevForm,
            address: fallbackAddress,
            city: prevForm.city || 'Current Location',
            pincode: prevForm.pincode || ''
          }));
          
          setErrors(prev => ({ 
            ...prev, 
            form: "✅ Location fetched! Could not get full address details."
          }));
        }
        
        setFetchingLocation(false);
      },
      (error) => {
        setFetchingLocation(false);
        let errorMessage = "Could not get location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "Location access denied. Please allow location access in your browser settings.";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "Location request timed out. Please try again.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "Location information is unavailable.";
        }
        setErrors(prev => ({ ...prev, form: `⚠️ ${errorMessage}` }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // Validation functions
  const validateForm = () => {
    const { name, phone, address, city, pincode, email } = form;
    
    if (!userDataFromDB || !userDataFromDB.userId) return "User ID missing. Please log in again."; 
    if (!name.trim()) return "Name is required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Valid email is required";
    if (!phone.trim() || !/^\d{10}$/.test(phone)) return "Valid 10-digit phone number is required";
    
    // Improved address validation
    if (!address.trim()) return "Address is required";
    if (address.includes("Approximate Location:") || address.includes("GPS Location:")) {
      return "Please enter a proper address, not just coordinates. Click 'Use My Current Location' for automatic address detection.";
    }
    
    if (!city.trim()) return "City is required";
    if (city === "Location Fetched" || city === "Current Location") {
      return "Please enter a proper city name";
    }
    
    if (!pincode.trim() || !/^\d{6}$/.test(pincode)) return "Valid 6-digit pincode is required";
    if (pincode === "000000") {
      return "Please enter a valid pincode";
    }
    
    return null;
  };

  const validateCustomization = () => {
    const incompleteCustomization = checkoutItems.find(item => {
      if (item.colors && item.colors.length > 0 && !item.selectedColor) return true;
      if (item.sizes && item.sizes.length > 0 && !item.selectedSize) return true;
      if (item.rams && item.rams.length > 0 && !item.selectedRam) return true;
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
    if (checkoutItems.length === 0 || isCartEmpty) {
      setErrors(prev => ({ ...prev, customization: "⚠️ Your cart is empty. Please add items before proceeding." }));
      return;
    }
    
    const customizationError = validateCustomization();
    if (customizationError) {
      setErrors(prev => ({ ...prev, customization: "⚠️ Please select all customization options for your items!" }));
      return;
    }
    
    if (checkoutItems.length === 0 || total <= 0) {
        setErrors(prev => ({ ...prev, customization: "⚠️ Your cart is empty or total amount is ₹0. Please check your items." }));
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
    sessionStorage.removeItem("buyNowItem");
    sessionStorage.removeItem("buyNowFlag");
    
    if (isBuyNow) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  // Back to Customization
  const backToCustomization = () => {
    setCurrentStep(1);
    setErrors({ form: "", customization: "", payment: "" });
  };

  // 🔥 UPDATED: Save Order to Firebase with Seller Info
  const saveOrderToFirebase = async (data, userId) => {
    try {
      const ordersCollectionRef = collection(db, "users", userId, "orders"); 
      
      // 🔥 BUILD ORDER ITEMS WITH SELLER INFO
      const orderItems = checkoutItems.map(item => {
        const sellerInfo = productSellerInfo[item.id] || {
          sellerId: null,
          sellerName: "Unknown Seller"
        };

        return {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          image: item.image || "",
          selectedColor: item.selectedColor || "",
          selectedSize: item.selectedSize || "",
          selectedRam: item.selectedRam || "",
          sellerId: sellerInfo.sellerId,
          sellerName: sellerInfo.sellerName
        };
      });

      // 🔥 COLLECT UNIQUE SELLER IDs & NAMES
      const sellerIds = [...new Set(orderItems.map(i => i.sellerId).filter(id => id))];
      const sellerNames = [...new Set(orderItems.map(i => i.sellerName).filter(name => name))];

      // 🔥 FULL ORDER OBJECT WITH SELLER INFO
      const orderData = {
        ...data,
        items: orderItems,
        sellerIds: sellerIds, // Array of unique seller IDs
        sellerNames: sellerNames, // Array of unique seller names
        primarySellerId: sellerIds[0] || null, // First seller as primary (optional)
        customerID: userId,
        createdAt: serverTimestamp(),
        locationDetails: locationDetails.latitude ? {
          coordinates: {
            latitude: locationDetails.latitude,
            longitude: locationDetails.longitude
          },
          address: form.address,
          city: form.city,
          state: locationDetails.state,
          pincode: form.pincode,
          country: locationDetails.country,
          fetchedAt: new Date().toISOString()
        } : null,
        isMultiSeller: sellerIds.length > 1 // Flag for multi-seller orders
      };

      const docRef = await addDoc(ordersCollectionRef, orderData);
      const orderId = docRef.id;
      console.log("✅ Order saved with ID: ", orderId);
      console.log("📦 Seller information:", {
        sellerIds,
        sellerNames,
        isMultiSeller: sellerIds.length > 1
      });
      
      // 🔥 UPDATE SELLER'S ORDERS (Optional - if you have seller collections)
      // You can add logic here to also save order to seller's collection
      if (sellerIds.length > 0) {
        try {
          // Example: Save to each seller's orders collection
          for (const sellerId of sellerIds) {
            if (sellerId) {
              // Filter items for this specific seller
              const sellerItems = orderItems.filter(item => item.sellerId === sellerId);
              
              // Create seller order document
              const sellerOrderRef = collection(db, "sellers", sellerId, "orders");
              const sellerOrderData = {
                orderId: orderId,
                customerId: userId,
                customerInfo: {
                  name: form.name,
                  email: form.email,
                  phone: form.phone,
                  address: form.address,
                  city: form.city,
                  pincode: form.pincode
                },
                items: sellerItems,
                total: sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                paymentMethod: data.paymentMethod,
                status: data.status,
                createdAt: serverTimestamp()
              };
              
              await addDoc(sellerOrderRef, sellerOrderData);
              console.log(`✅ Order saved for seller: ${sellerId}`);
            }
          }
        } catch (sellerError) {
          console.warn("⚠️ Could not save to seller collections:", sellerError);
          // Non-critical error - order is still saved in customer's collection
        }
      }

      // Prepare order data for email
      const orderDataForEmail = {
        ...data,
        id: orderId,
        customerInfo: {
          ...data.customerInfo,
          email: data.customerInfo.email || userDataFromDB?.email || form.email
        }
      };

      const orderItemsString = orderDataForEmail.items.map(item => 
          ` - ${item.quantity} x ${item.name}` + 
          (item.selectedColor ? ` (Color: ${item.selectedColor})` : '') + 
          (item.selectedSize ? ` (Size: ${item.selectedSize})` : '') + 
          (item.selectedRam ? ` (RAM: ${item.selectedRam})` : '') + 
          ` @ ₹${item.price.toLocaleString()}`
      ).join('\n');

      // 🔥 ADD SELLER INFO TO EMAIL
      const sellerInfoText = sellerNames.length > 0 
        ? `Seller(s): ${sellerNames.join(', ')}`
        : 'No seller info available';

      const adminTemplateParams = {
          to_email: ADMIN_EMAIL, 
          customer_name: orderDataForEmail.customerInfo.name,
          order_id: orderId,
          order_date: new Date().toLocaleDateString(),
          total_amount: `₹${orderDataForEmail.amount.toLocaleString()}`,
          payment_method: data.paymentMethod === "cod" ? "Cash on Delivery (Pending)" : "Online Payment (Confirmed)",
          shipping_address: `${orderDataForEmail.customerInfo.address}, ${orderDataForEmail.customerInfo.city}, ${orderDataForEmail.customerInfo.pincode}, Phone: ${orderDataForEmail.customerInfo.phone}`,
          order_items: orderItemsString,
          seller_info: sellerInfoText,
          location_details: locationDetails.latitude ? 
            `Location: ${locationDetails.latitude}, ${locationDetails.longitude}\n${form.address}` : "No location data"
      };
      
      const emailType = data.paymentMethod === "cod" ? 'COD' : 'PAID';
      await sendOrderEmail(emailType, adminTemplateParams);

      const autoReplyParams = {
        email: orderDataForEmail.customerInfo.email,
        customer_name: orderDataForEmail.customerInfo.name,
        order_id: orderId,
        total_amount: `₹${orderDataForEmail.amount.toLocaleString()}`,
        order_items: orderItemsString || "Items will be updated",
        seller_info: sellerInfoText // Add seller info to customer email
      };
      
      await sendAutoReply(autoReplyParams);

      return true;
    } catch (e) {
        console.error("Error adding document to Firebase subcollection or sending email: ", e);
        if (e.message && e.message.includes('addDoc')) {
            setErrors(prev => ({ ...prev, payment: "Payment was successful, but failed to save order! Please contact support." }));
            return false;
        }
        return true; 
    }
  };

  // Create Razorpay Order
  const createRazorpayOrder = async (amount) => {
    return {
      id: `order_${Date.now()}`,
      currency: "INR",
      amount: amount * 100,
    };
  };

  // Verify Payment
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
              sessionStorage.removeItem("buyNowItem");
              sessionStorage.removeItem("buyNowFlag");
              
              navigate("/my-orders");
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
    
    if (checkoutItems.length === 0 || total <= 0) {
        setErrors(prev => ({ ...prev, payment: "⚠️ Cart is empty or failed to load. Total is 0." }));
        setProcessingPayment(false);
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

        clearCart();
        sessionStorage.removeItem("selectedCartItems");
        sessionStorage.removeItem("buyNowItem");
        sessionStorage.removeItem("buyNowFlag");
        
        navigate("/my-orders");
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

  // Show Location Details Card
  const LocationDetailsCard = () => {
    if (!locationDetails.latitude) return null;
    
    return (
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
        <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Location Details
        </h4>
        
        <div className="space-y-3">
          {/* Full Address */}
          <div className="bg-white p-3 rounded border">
            <p className="font-medium text-gray-700 mb-1">Full Address:</p>
            <p className="text-gray-800">{locationDetails.address || `Location: ${locationDetails.latitude.toFixed(6)}, ${locationDetails.longitude.toFixed(6)}`}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Coordinates */}
            <div className="bg-white p-3 rounded border">
              <p className="font-medium text-gray-700 mb-1">Coordinates:</p>
              <p className="text-gray-600 text-sm font-mono">
                {locationDetails.latitude.toFixed(6)}, {locationDetails.longitude.toFixed(6)}
              </p>
            </div>
            
            {/* City */}
            {locationDetails.city && (
              <div className="bg-white p-3 rounded border">
                <p className="font-medium text-gray-700 mb-1">City:</p>
                <p className="text-gray-600">{locationDetails.city}</p>
              </div>
            )}
            
            {/* Pincode */}
            {locationDetails.pincode && (
              <div className="bg-white p-3 rounded border">
                <p className="font-medium text-gray-700 mb-1">Pincode:</p>
                <p className="text-gray-600">{locationDetails.pincode}</p>
              </div>
            )}
          </div>
          
          {/* State and Country */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {locationDetails.state && (
              <div className="bg-white p-3 rounded border">
                <p className="font-medium text-gray-700 mb-1">State:</p>
                <p className="text-gray-600">{locationDetails.state}</p>
              </div>
            )}
            
            {locationDetails.country && (
              <div className="bg-white p-3 rounded border">
                <p className="font-medium text-gray-700 mb-1">Country:</p>
                <p className="text-gray-600">{locationDetails.country}</p>
              </div>
            )}
          </div>
          
          <div className="text-xs text-gray-500 mt-2">
            <p>✓ This address will be saved with your order for delivery</p>
          </div>
        </div>
      </div>
    );
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
          {isBuyNow ? "Complete Your Purchase" : currentStep === 1 ? "Customize Your Order" : "Payment Details"}
        </h2>

        {/* BUY NOW INDICATOR */}
        {isBuyNow && (
          <div className="mb-4 text-center">
            <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Buy Now - Direct Purchase
            </div>
          </div>
        )}

        {/* EMPTY CART MESSAGE */}
        {isCartEmpty && !isFetchingUser && (
          <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
            <div className="text-5xl mb-4">🛒</div>
            <h3 className="text-xl font-bold text-yellow-700 mb-2">Your Cart is Empty</h3>
            <p className="text-yellow-600 mb-4">
              Your cart is empty. Please add items to checkout.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => navigate("/")}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
              >
                Continue Shopping
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )}

        {/* ERROR MESSAGES */}
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

        {/* STEP 1: CUSTOMIZATION */}
        {currentStep === 1 && !isCartEmpty && checkoutItems.length > 0 && (
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
                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                  isBuyNow 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-red-600 hover:bg-red-700'
                } text-white`}
              >
                {isBuyNow ? 'Cancel Purchase' : 'Cancel Order'}
              </button>
              <button
                onClick={proceedToPayment}
                disabled={checkoutItems.length === 0}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                  checkoutItems.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700'
                } text-white`}
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PAYMENT */}
        {currentStep === 2 && !isCartEmpty && checkoutItems.length > 0 && (
          <div>
            {/* SHIPPING FORM */}
            <h3 className="text-xl font-semibold mb-4">Shipping Information</h3>
            
            {/* LIVE LOCATION BUTTON */}
            <div className="mb-6">
              <button
                onClick={handleLiveLocation}
                disabled={fetchingLocation}
                className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center ${
                  fetchingLocation
                    ? 'bg-blue-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                } text-white`}
              >
                {fetchingLocation ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Fetching Your Location...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Use My Current Location
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Click to automatically fill your address using GPS
              </p>
            </div>

            {/* LOCATION DETAILS CARD */}
            <LocationDetailsCard />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="your.email@example.com"
                  value={form.email}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  placeholder="10-digit phone number"
                  value={form.phone}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  pattern="[0-9]{10}"
                  maxLength="10"
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input
                  id="city"
                  type="text"
                  name="city"
                  placeholder="Enter your city"
                  value={form.city}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Complete Address *</label>
                <textarea
                  id="address"
                  name="address"
                  placeholder="House no., Building, Street, Area, Landmark"
                  value={form.address}
                  onChange={handleChange}
                  rows="3"
                  className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter complete delivery address including house number and landmark
                </p>
              </div>

              <div>
                <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                <input
                  id="pincode"
                  type="text"
                  name="pincode"
                  placeholder="6-digit pincode"
                  value={form.pincode}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  pattern="[0-9]{6}"
                  maxLength="6"
                />
              </div>
            </div>

            {/* ORDER SUMMARY */}
            <h3 className="text-xl font-semibold mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4">
              {checkoutItems.map((item) => (
                <div key={item.id} className="border p-3 rounded-lg bg-gray-50">
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

            {/* PAYMENT OPTIONS */}
            <h3 className="text-xl font-semibold mt-6 mb-3">Select Payment Method</h3>
            <div className="space-y-3 border p-4 rounded mb-4">
              <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="razorpay"
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5 text-purple-600"
                />
                <div className="flex-1">
                  <span className="font-medium">Razorpay (Credit/Debit Card, UPI, Net Banking)</span>
                  <p className="text-sm text-gray-500">Pay securely with Razorpay</p>
                </div>
                <div className="text-lg font-bold text-green-600">Secure</div>
              </label>

              <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5 text-purple-600"
                />
                <div className="flex-1">
                  <span className="font-medium">Cash on Delivery (COD)</span>
                  <p className="text-sm text-gray-500">Pay when you receive your order</p>
                </div>
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
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {isBuyNow ? 'Back to Product' : 'Back to Customization'}
              </button>
              
              <button
                onClick={handlePayment}
                disabled={processingPayment || checkoutItems.length === 0}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center ${
                  processingPayment || checkoutItems.length === 0
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {processingPayment ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : paymentMethod === 'cod' ? (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Place Order
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Pay Now
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {isFetchingUser && !isCartEmpty && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-600">Loading checkout...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;