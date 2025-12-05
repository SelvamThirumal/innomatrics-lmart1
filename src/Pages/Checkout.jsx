import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
// Assuming this context provides cart state and actions
import { useCart } from "../context/CartContext"; 
import { db } from '../../firebase'; 
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  Timestamp,
  updateDoc,
  getDocs // Added for AddressManagerModal
} from "firebase/firestore";
// Note: useAuth import removed as requested. User ID is fetched from localStorage.

// 🔑 REQUIRED: Replace "YOUR_GOOGLE_MAPS_API_KEY_HERE" with your actual Google Maps Geocoding API Key
// NOTE: Geocoding is an advanced feature and requires a valid, enabled API key.
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY_HERE"; 

// =================================================================================
//                            HELPER COMPONENTS (FOR MODULARITY)
// =================================================================================

// --- 1. Address Management Modal (for selecting/adding addresses) ---
const AddressManagerModal = ({ userId, currentAddress, setAddress, onClose }) => {
    const [addresses, setAddresses] = useState([]);
    const [newAddressForm, setNewAddressForm] = useState(null); // null, 'add', or 'edit'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchAddresses = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            // Assuming addresses are stored in a subcollection under the user
            const addressesRef = collection(db, "users", userId, "addresses");
            const snapshot = await getDocs(addressesRef);
            const fetchedAddresses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAddresses(fetchedAddresses);
        } catch (err) {
            console.error("Error fetching addresses:", err);
            setError("Failed to load saved addresses.");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchAddresses();
    }, [fetchAddresses]);
    
    // Placeholder function for saving/updating address
    const handleSaveNewAddress = async (formData, isNew) => {
        setLoading(true);
        setError('');
        
        // This is simplified. In a real app, 'formData' would contain all address fields
        const mockFormData = {
             name: 'User Name', phone: '9999999999', email: 'a@b.com',
             fullAddress: '123, Mock Street', pincode: '400001', city: 'Mumbai',
        };

        try {
            const addressesRef = collection(db, "users", userId, "addresses");
            if (isNew) {
                await addDoc(addressesRef, {
                    ...mockFormData,
                    createdAt: Timestamp.now(),
                    lastUsed: Timestamp.now()
                });
                alert('New address saved! (Mock Data used)');
            } else {
                const addressDocRef = doc(db, "users", userId, "addresses", formData.id);
                await updateDoc(addressDocRef, {
                    ...mockFormData,
                    lastUsed: Timestamp.now()
                });
                alert('Address updated! (Mock Data used)');
            }
            setNewAddressForm(null);
            await fetchAddresses(); 
        } catch (err) {
            console.error("Error saving address:", err);
            setError("Failed to save address.");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAddress = (address) => {
        setAddress({
            name: address.name,
            phone: address.phone,
            email: address.email,
            address: address.fullAddress, // Assuming field name is fullAddress
            pincode: address.pincode,
            city: address.city
        });
        onClose();
    };

    if (newAddressForm) {
        // Simple form for adding/editing a single address (Placeholder for brevity)
        return (
             <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[100]">
                <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl">
                    <h3 className="text-xl font-bold mb-4">{newAddressForm === 'add' ? 'Add New Address' : 'Edit Address'}</h3>
                    <p className='text-sm text-red-500 mb-4'>[Placeholder: In a real app, full form inputs would be here to save address data to Firestore.]</p>
                    {error && <div className="p-2 bg-red-100 text-red-700 rounded mb-4">{error}</div>}
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setNewAddressForm(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-100">Cancel</button>
                        <button onClick={() => handleSaveNewAddress({ /* form data */ }, newAddressForm === 'add')} disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                            {loading ? 'Saving...' : 'Save Address'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[100]">
            <div className="bg-white p-6 rounded-xl w-full max-w-2xl shadow-2xl">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <h2 className="text-2xl font-bold">Manage Saved Addresses</h2>
                    <button onClick={onClose} className="text-2xl text-gray-600 hover:text-gray-900">&times;</button>
                </div>
                
                {loading ? (
                    <div className="text-center py-10 text-lg">Loading addresses...</div>
                ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}
                        
                        {addresses.length === 0 && <p className="text-gray-500 text-center py-6">No saved addresses found. Please add one below.</p>}

                        {addresses.map(addr => (
                            <div key={addr.id} className={`p-4 border rounded-lg flex justify-between items-center transition-all ${
                                addr.id === currentAddress.id ? 'border-purple-600 ring-2 ring-purple-200 bg-purple-50' : 'hover:border-purple-300'
                            }`}>
                                <div>
                                    <p className="font-bold">{addr.name || 'Default Name'}</p>
                                    <p className="text-sm text-gray-600">{addr.fullAddress || 'N/A'}, {addr.city || 'N/A'} - {addr.pincode || 'N/A'}</p>
                                    <p className="text-xs text-gray-500">Phone: {addr.phone || 'N/A'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleSelectAddress(addr)} className="px-3 py-1 text-sm bg-green-500 text-white rounded-full hover:bg-green-600">
                                        Deliver Here
                                    </button>
                                    <button onClick={() => setNewAddressForm('edit')} className="px-3 py-1 text-sm text-purple-600 border border-purple-300 rounded-full hover:bg-purple-50">
                                        Edit
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-6 border-t pt-4">
                    <button onClick={() => setNewAddressForm('add')} className="w-full py-2 border-2 border-dashed border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 font-semibold">
                        + Add New Shipping Address
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 2. Coupon Input Component ---
const CouponInput = ({ total, setDiscount, setDiscountApplied }) => {
    const [couponCode, setCouponCode] = useState('');
    const [couponStatus, setCouponStatus] = useState({ message: '', type: '' }); // 'success', 'error', ''
    const [applying, setApplying] = useState(false);

    // Placeholder for actual coupon validation logic
    const validateCoupon = useCallback(async (code) => {
        setApplying(true);
        await new Promise(resolve => setTimeout(resolve, 800)); 
        
        const upperCode = code.toUpperCase().trim();
        
        if (upperCode === 'FLAT100' && total >= 500) {
            setDiscount(100);
            setDiscountApplied(true);
            setCouponStatus({ message: 'Coupon applied! ₹100 deducted.', type: 'success' });
        } else if (upperCode === 'DIWALI20' && total >= 1000) {
            const discountAmount = Math.round(total * 0.20);
            setDiscount(discountAmount);
            setDiscountApplied(true);
            setCouponStatus({ message: `20% discount applied! You saved ₹${discountAmount.toLocaleString()}.`, type: 'success' });
        } else if (upperCode) {
            setDiscount(0);
            setDiscountApplied(false);
            setCouponStatus({ message: 'Invalid or expired coupon code.', type: 'error' });
        } else {
            setDiscount(0);
            setDiscountApplied(false);
            setCouponStatus({ message: '', type: '' });
        }
        setApplying(false);
    }, [total, setDiscount, setDiscountApplied]);
    
    useEffect(() => {
        // Clear status if total changes drastically or cart is cleared
        if (total === 0) {
            setDiscount(0);
            setDiscountApplied(false);
            setCouponStatus({ message: '', type: '' });
            setCouponCode('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [total]);

    return (
        <div className="border-t pt-4 mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Have a Coupon Code?</label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                        setCouponCode(e.target.value);
                        setCouponStatus({ message: '', type: '' }); // Clear status on change
                    }}
                    placeholder="Enter code"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                />
                <button
                    onClick={() => validateCoupon(couponCode)}
                    disabled={applying || couponCode.length === 0}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                >
                    {applying ? 'Applying...' : 'Apply'}
                </button>
            </div>
            {couponStatus.message && (
                <p className={`mt-2 text-sm ${
                    couponStatus.type === 'success' ? 'text-green-600 bg-green-50 p-2 rounded' : 'text-red-600 bg-red-50 p-2 rounded'
                }`}>
                    {couponStatus.message}
                </p>
            )}
        </div>
    );
};

// --- 3. Item Detail Component (for better rendering in summary) ---
const ItemDetail = ({ item }) => {
    return (
        <div className="flex justify-between items-start py-4">
            <div className="flex items-center space-x-4">
                <img 
                    src={item.imageUrls?.[0] || item.imageUrl || '/placeholder-image.jpg'} 
                    alt={item.name} 
                    className="w-16 h-16 object-cover rounded-lg border" 
                    onError={(e) => {
                        e.target.src = '/placeholder-image.jpg';
                    }}
                />
                <div>
                    <p className="font-medium text-base">{item.name}</p>
                    <p className="text-sm text-gray-500">
                        Qty: {item.quantity} | Unit Price: ₹{item.price.toLocaleString()}
                    </p>
                    {item.customization && (
                        <p className="text-xs text-blue-600 mt-1">
                            Customization: {item.customization.type} ({item.customization.details || 'View in Cart'})
                        </p>
                    )}
                </div>
            </div>
            <p className="font-semibold text-lg text-gray-800">₹{item.subtotal.toLocaleString()}</p>
        </div>
    );
};

// =================================================================================
//                                  MAIN CHECKOUT COMPONENT
// =================================================================================

const Checkout = () => {
  const navigate = useNavigate();
  const { items, clearCart, updateCartItem } = useCart(); 
  
  // 💥 MODIFICATION: Current User ID derived directly from localStorage
  const currentUserId = localStorage.getItem('token'); 

  const [checkoutItems, setCheckoutItems] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showAddressManager, setShowAddressManager] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "", // Full address line
    pincode: "",
    city: "",
    email: ""
  });
  
  const [isFetchingUser, setIsFetchingUser] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountApplied, setDiscountApplied] = useState(false);

  const [errors, setErrors] = useState({
    form: "",
    payment: ""
  });
  const [fetchingLocation, setFetchingLocation] = useState(false);


  // --- CALCULATED VALUES (useMemo for optimization) ---
  const subtotal = useMemo(() => 
    checkoutItems.reduce((sum, item) => sum + (item.subtotal || 0), 0), 
    [checkoutItems]
  );
  
  const shippingCharge = useMemo(() => (subtotal >= 500) ? 0 : 50, [subtotal]);
  
  const total = useMemo(() => subtotal + shippingCharge - discount, [subtotal, shippingCharge, discount]);

  // --- Utility Functions ---

  // Function to convert coordinates to a full address using Google Maps Geocoding API
  const fetchAddressFromCoords = async (latitude, longitude) => {
    setFetchingLocation(true);
    setErrors(prev => ({ ...prev, form: "" }));

    if (GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
        setErrors(prev => ({ ...prev, form: "Geocoding API key not set. Cannot fetch location." }));
        setFetchingLocation(false);
        return;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const fullAddress = result.formatted_address;
        
        let city = '';
        let pincode = '';

        for (const component of result.address_components) {
          if (component.types.includes('locality')) {
            city = component.long_name;
          }
          if (component.types.includes('postal_code')) {
            pincode = component.long_name;
          }
        }

        setForm(prev => ({
          ...prev,
          address: fullAddress,
          city: city || prev.city,
          pincode: pincode || prev.pincode
        }));
      } else {
        setErrors(prev => ({ ...prev, form: "Failed to get address from coordinates: " + (data.error_message || data.status) }));
        console.error("Geocoding failed:", data.status, data.error_message);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, form: "Error fetching address from location API." }));
      console.error("Error fetching address:", error);
    } finally {
      setFetchingLocation(false);
    }
  };

  const fetchCurrentLocation = () => {
    if (navigator.geolocation) {
      setFetchingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchAddressFromCoords(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          let errorMessage = "Could not fetch current location.";
          if (error.code === error.PERMISSION_DENIED) {
             errorMessage = "Location permission denied by user. Please enter manually.";
          }
          setErrors(prev => ({ ...prev, form: errorMessage }));
          setFetchingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setErrors(prev => ({ ...prev, form: "Geolocation is not supported by this browser." }));
    }
  };
  
  // --- Data Fetching and Initialization ---

  // 1. Fetch user data (to pre-fill address form)
  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUserId) {
        setIsFetchingUser(false);
        return;
      }
      
      try {
        const userRef = doc(db, "users", currentUserId);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Pre-fill form with user data, prioritize saved fields if available
          const defaultAddress = data.addresses?.[0] || {};
          
          setForm({
            name: data.name || defaultAddress.name || "",
            phone: data.contactNo || defaultAddress.phone || "",
            email: data.email || defaultAddress.email || "",
            address: defaultAddress.fullAddress || "",
            pincode: defaultAddress.pincode || "",
            city: defaultAddress.city || ""
          });
        }
      } catch (e) {
        console.error("Error fetching user data:", e);
      } finally {
        setIsFetchingUser(false);
      }
    };

    fetchUserData();
  }, [currentUserId]);

  // 2. Set checkout items from cart
  useEffect(() => {
    const calculatedItems = items.map(item => {
      const sub = (item.price || 0) * (item.quantity || 1);
      return {
        ...item,
        subtotal: sub 
      };
    });
    setCheckoutItems(calculatedItems);
  }, [items]);

  // If cart is empty, redirect
  useEffect(() => {
    if (items.length === 0 && !isFetchingUser) {
      const timer = setTimeout(() => navigate('/cart'), 100);
      return () => clearTimeout(timer);
    }
  }, [items.length, isFetchingUser, navigate]);
  
  // --- Step Handlers ---

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const { name, phone, address, pincode, city, email } = form;
    
    if (!name || !phone || !address || !pincode || !city || !email) {
      setErrors(prev => ({ ...prev, form: "All fields are required. Please check Name, Phone, Address, Pincode, City, and Email." }));
      return false;
    }
    if (!/^[a-zA-Z\s]{2,}$/.test(name)) {
        setErrors(prev => ({ ...prev, form: "Please enter a valid name (min 2 chars, letters only)." }));
        return false;
    }
    if (!/^\d{10}$/.test(phone)) {
        setErrors(prev => ({ ...prev, form: "Phone number must be exactly 10 digits." }));
        return false;
    }
    if (!/^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        setErrors(prev => ({ ...prev, form: "Please enter a valid email address." }));
        return false;
    }
    if (!/^\d{6}$/.test(pincode)) {
        setErrors(prev => ({ ...prev, form: "Pincode must be 6 digits." }));
        return false;
    }
    
    setErrors(prev => ({ ...prev, form: "" }));
    return true;
  };
  
  const nextStep = (step) => {
    if (step === 1) {
      if (validateForm()) {
        setCurrentStep(2);
      }
    } else if (step === 2) {
      setCurrentStep(3);
    }
  };

  const backStep = (step) => {
    if (step === 2) {
      setCurrentStep(1);
    } else if (step === 3) {
      setCurrentStep(2);
    }
  };
  
  const backToCustomization = () => {
      navigate('/cart');
  };
  
  // --- Payment / Order Placement ---

  const handlePayment = async () => {
    if (!paymentMethod) {
      setErrors(prev => ({ ...prev, payment: "Please select a payment method before proceeding." }));
      return;
    }
    
    setProcessingPayment(true);
    setErrors(prev => ({ ...prev, payment: "" }));

    // Simulate online payment success if not COD
    if (paymentMethod !== 'cod') {
        await new Promise(resolve => setTimeout(resolve, 2000)); 
    }

    try {
      const orderData = {
        // Use currentUserId directly from localStorage (or null if not found)
        userId: currentUserId || null, 
        orderId: `ORD-${Date.now().toString().slice(-10)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        customerDetails: {
            ...form,
            shippingAddress: `${form.address}, ${form.city} - ${form.pincode}`
        },
        items: checkoutItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrls?.[0] || item.imageUrl,
          customization: item.customization || null,
        })),
        financials: {
            subtotal: subtotal,
            shipping: shippingCharge,
            discount: discount,
            tax: 0, 
            totalAmount: total
        },
        paymentMethod: paymentMethod,
        status: paymentMethod === 'cod' ? 'confirmed' : 'confirmed', 
        paymentStatus: paymentMethod === 'cod' ? 'pending_cod' : 'paid',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        source: 'web_checkout', 
        device: navigator.userAgent
      };
      
      // 1. Save order to Firestore
      if (!currentUserId) {
          // Fallback logic for guests/unauthenticated users if needed, 
          // but for this structure, we assume a token/user ID is necessary for order saving.
          throw new Error("User ID is required to place an order. Please ensure a user token is set in localStorage.");
      }
      const userOrdersRef = collection(db, "users", currentUserId, "orders");
      const orderDocRef = await addDoc(userOrdersRef, orderData);

      // 2. Clear cart and navigate
      clearCart();
      
      // Navigate to confirmation page
      navigate(`/order-confirmation/${orderDocRef.id}`, { 
          state: { 
              orderId: orderData.orderId, 
              amount: total, 
              method: paymentMethod,
              isCod: paymentMethod === 'cod' 
          }
      });

    } catch (e) {
      console.error("Critical error placing order: ", e);
      setErrors(prev => ({ ...prev, payment: `Order placement failed: ${e.message}. Please try again.` }));
    } finally {
      setProcessingPayment(false);
    }
  };

  // --- Render ---

  if (isFetchingUser) {
      return (
          <div className="flex justify-center items-center h-screen bg-gray-50">
              <div className="text-xl text-gray-700 p-8 rounded-lg shadow-md border">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mr-3 inline-block"></div>
                  Loading user profile and cart...
              </div>
          </div>
      );
  }
  
  if (items.length === 0) {
      return (
          <div className="flex justify-center items-center h-screen bg-gray-50">
              <div className="text-xl text-gray-700 p-8 rounded-lg shadow-md border">
                  Your cart is empty. Redirecting you to shopping...
              </div>
          </div>
      );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 min-h-screen">
      
      {/* LEFT COLUMN: Steps & Forms */}
      <div className="lg:w-2/3 space-y-8">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h1 className="text-3xl font-extrabold mb-6 text-gray-900">Finalize Your Purchase</h1>
          
          {/* Progress Bar */}
          <div className="flex justify-between items-center mb-10 relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 z-0 mx-8"></div>
            {['Address', 'Summary', 'Payment'].map((label, index) => (
              <div key={index} className="flex flex-col items-center z-10 w-1/3">
                <div className={`w-12 h-12 flex items-center justify-center rounded-full font-bold text-white transition-all duration-300 shadow-md
                  ${currentStep > index + 1 
                    ? 'bg-green-500' 
                    : currentStep === index + 1 
                    ? 'bg-purple-600 ring-4 ring-purple-200' 
                    : 'bg-gray-400'
                  }`}
                >
                  {currentStep > index + 1 ? '✓' : index + 1}
                </div>
                <p className={`mt-2 text-sm text-center ${currentStep === index + 1 ? 'text-purple-600 font-bold' : 'text-gray-500'}`}>
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* --- STEP 1: ADDRESS --- */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-2 mb-4">
                  <h2 className="text-2xl font-semibold text-purple-600">1. Shipping & Contact Details</h2>
                  {currentUserId && (
                    <button 
                        onClick={() => setShowAddressManager(true)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium py-1 px-3 border border-blue-200 rounded-full bg-blue-50 transition-colors"
                    >
                        Use Saved Address
                    </button>
                  )}
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); nextStep(1); }} className="space-y-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="name"
                    placeholder="*Full Name"
                    value={form.name}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition-shadow"
                    required
                  />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="*Phone Number (10 digits)"
                    value={form.phone}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition-shadow"
                    required
                  />
                </div>
                
                <input
                  type="email"
                  name="email"
                  placeholder="*Email Address"
                  value={form.email}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition-shadow"
                  required
                />

                <textarea
                  name="address"
                  placeholder="*Full Address (House No, Street, Landmark)"
                  value={form.address}
                  onChange={handleFormChange}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition-shadow resize-none"
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    name="pincode"
                    placeholder="*Pincode (6 digits)"
                    value={form.pincode}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition-shadow"
                    required
                  />
                  <input
                    type="text"
                    name="city"
                    placeholder="*City/District"
                    value={form.city}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition-shadow"
                    required
                  />
                  <button
                    type="button"
                    onClick={fetchCurrentLocation}
                    disabled={fetchingLocation}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400"
                  >
                    {fetchingLocation ? 'Fetching...' : 'Use Current Location'}
                  </button>
                </div>
                
                {errors.form && (
                  <div className="p-3 bg-red-100 text-red-600 rounded-lg text-sm border border-red-200">
                    {errors.form}
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-extrabold shadow-lg transition-transform transform hover:scale-[1.01]"
                  >
                    Save Address & Continue ➔
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* --- STEP 2: SUMMARY --- */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <h2 className="text-2xl font-semibold border-b pb-2 text-purple-600">2. Review Order Details</h2>
              
              <div className="border border-purple-200 rounded-xl p-5 bg-purple-50 shadow-inner">
                <h3 className="font-bold text-lg mb-2 text-purple-800">Delivery Address</h3>
                <p className='text-gray-700 font-semibold'>{form.name} ({form.phone})</p>
                <p className='text-gray-600'>{form.address}, {form.city} - {form.pincode}</p>
                <p className='text-gray-500 text-sm'>Email: {form.email}</p>
                <button 
                  onClick={() => setCurrentStep(1)} 
                  className="text-sm text-blue-600 hover:text-blue-800 mt-2 font-bold transition-colors"
                >
                  <span className='mr-1'>&#9998;</span> Edit Address
                </button>
              </div>
              
              <div className="divide-y divide-gray-200 border rounded-xl p-4 shadow-md">
                <h3 className="font-bold text-lg mb-2 text-gray-800 pb-2">Items in Cart</h3>
                {checkoutItems.map((item, index) => (
                  <ItemDetail key={index} item={item} />
                ))}
                
                <button 
                    onClick={backToCustomization} 
                    className="w-full text-center text-sm text-orange-600 hover:text-orange-800 font-medium py-2 mt-2"
                >
                    &lt; Go back to edit items in cart
                </button>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => backStep(2)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors flex items-center gap-2"
                >
                    <span>&lt; Back</span>
                </button>
                <button
                  onClick={() => nextStep(2)}
                  className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-extrabold shadow-lg transition-transform transform hover:scale-[1.01]"
                >
                  Proceed to Payment ➔
                </button>
              </div>
            </div>
          )}

          {/* --- STEP 3: PAYMENT --- */}
          {currentStep === 3 && (
            <div className="space-y-8">
              <h2 className="text-2xl font-semibold border-b pb-2 text-purple-600">3. Select Payment Method</h2>
              
              <div className="border rounded-xl p-5 space-y-4 shadow-md">
                <h3 className="font-bold text-lg mb-2">Available Options:</h3>
                
                <label className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === 'online' ? 'border-green-600 ring-2 bg-green-50' : 'hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="online"
                    checked={paymentMethod === 'online'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-5 h-5 text-purple-600 focus:ring-purple-500 checked:bg-purple-600"
                  />
                  <div className='flex-1'>
                    <span className="font-medium text-gray-800">Credit/Debit Card, UPI, Netbanking (Pay Securely Online)</span>
                    <p className='text-xs text-gray-500'>Instant payment confirmation. Fastest delivery processing.</p>
                  </div>
                </label>
                
                <label className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === 'cod' ? 'border-blue-600 ring-2 bg-blue-50' : 'hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-5 h-5 text-purple-600 focus:ring-purple-500 checked:bg-purple-600"
                  />
                  <div className='flex-1'>
                    <span className="font-medium text-gray-800">Cash on Delivery (COD)</span>
                    <p className='text-xs text-gray-500'>Pay when your order is delivered. (Limit: ₹5000)</p>
                  </div>
                </label>
              </div>
              
              {errors.payment && (
                <div className="p-3 bg-red-100 text-red-600 rounded-lg text-sm border border-red-200">
                  {errors.payment}
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => backStep(3)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors flex items-center gap-2"
                >
                    <span>&lt; Back</span>
                </button>
                
                <button
                  onClick={handlePayment}
                  disabled={processingPayment || !paymentMethod || total < 1}
                  className={`px-8 py-3 rounded-lg font-extrabold shadow-lg transition-transform transform hover:scale-[1.01] ${
                    processingPayment || !paymentMethod || total < 1
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                >
                  {processingPayment 
                    ? 'Processing Order...' 
                    : paymentMethod === 'cod' 
                    ? `Place Order (Pay ₹${total.toLocaleString()} on Delivery)` 
                    : `Pay ₹${total.toLocaleString()} Now`}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Additional Info Box */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 text-sm text-gray-600 space-y-3">
            <h3 className="font-bold text-lg text-gray-800">Secure Checkout Guarantee</h3>
            <p className='flex items-center'><span className='text-green-500 mr-2'>&#10003;</span> All payments are encrypted and secured.</p>
            <p className='flex items-center'><span className='text-green-500 mr-2'>&#10003;</span> 7-day hassle-free return policy.</p>
            <p className='flex items-center'><span className='text-green-500 mr-2'>&#10003;</span> Free shipping for all orders above ₹500.</p>
        </div>

      </div>

      {/* RIGHT COLUMN: Order Details / Cart Summary (always visible) */}
      <div className="lg:w-1/3 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 sticky lg:top-8">
          <h2 className="text-xl font-bold mb-4 border-b pb-3 text-gray-800">Price Details</h2>
          
          {/* Coupon Input */}
          <CouponInput 
              total={subtotal} 
              setDiscount={setDiscount} 
              setDiscountApplied={setDiscountApplied}
          />
          
          <div className="mt-4 pt-4 border-t space-y-3">
            
            <div className="flex justify-between text-gray-600">
              <span>Items Subtotal ({checkoutItems.length}):</span>
              <span>₹{subtotal.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between text-red-600 font-medium">
              <span>Coupon Discount:</span>
              <span>- ₹{discount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-gray-600">
              <span>Shipping Charge:</span>
              {shippingCharge === 0 ? (
                  <span className="text-green-600 font-semibold">FREE</span>
              ) : (
                  <span className='font-semibold'>+ ₹{shippingCharge}</span>
              )}
            </div>
            
            <div className="flex justify-between text-2xl font-bold pt-3 border-t-2 border-gray-200 mt-3">
              <span>Order Total:</span>
              <span className="text-purple-600">₹{total.toLocaleString()}</span>
            </div>
            
            <p className='text-xs text-green-700 text-right font-medium pt-1'>
                You will save ₹{(discount + shippingCharge).toLocaleString()} on this order!
            </p>

          </div>

          <button
              onClick={backToCustomization}
              className="w-full mt-6 text-sm text-center text-blue-600 hover:text-blue-800 font-medium py-3 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 transition-colors"
          >
              &#9664; Back to Cart to Modify Items
          </button>
        </div>
      </div>
      
      {/* Address Manager Modal */}
      {showAddressManager && currentUserId && (
          <AddressManagerModal 
              userId={currentUserId}
              currentAddress={form}
              setAddress={setForm}
              onClose={() => setShowAddressManager(false)}
          />
      )}
    </div>
  );
};

export default Checkout;