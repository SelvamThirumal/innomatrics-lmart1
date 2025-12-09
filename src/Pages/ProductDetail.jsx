import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db } from "../../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { useCart } from "../context/CartContext";

const StarRating = ({ rating, size = "w-4 h-4", color = "text-green-500" }) => {
  const fullStars = Math.floor(rating);
  return (
    <div className="flex">
      {Array(5)
        .fill(0)
        .map((_, i) => (
          <svg
            key={i}
            className={`${size} ${i < fullStars ? color : "text-gray-300"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 
          3.292a1 1 0 00.95.69h3.462c.969 0 1.371 
          1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 
          1.118l1.07 3.292c.3.921-.755 1.688-1.54 
          1.118l-2.8-2.034a1 1 0 00-1.175 
          0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118
          l1.07-3.292a1 1 0 00-.364-1.118L2.98 
          8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 
          1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        ))}
    </div>
  );
};

const StarBar = ({ count, total, star }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center space-x-2">
      <div className="w-40 bg-gray-200 rounded-full h-2.5">
        <div
          className={`${star >= 3 ? "bg-green-500" : "bg-yellow-500"
            } h-2.5 rounded-full`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

const WriteReviewModal = ({ onClose, onSubmit, productName }) => {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const submitReview = async (e) => {
    e.preventDefault();
    if (!rating || !title.trim() || !content.trim()) {
      alert("Please complete all fields");
      return;
    }
    setSubmitting(true);
    const ok = await onSubmit({ rating, title, content });
    if (ok) onClose();
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md m-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-xl">Write a Review – {productName}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black transition-colors p-1 hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submitReview}>
          <div className="flex mb-6 justify-center">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <svg
                  key={i}
                  onClick={() => setRating(i + 1)}
                  onMouseEnter={() => setHoverRating(i + 1)}
                  onMouseLeave={() => setHoverRating(0)}
                  className={`w-10 h-10 cursor-pointer transition-transform hover:scale-110 ${i < (hoverRating || rating) ? "text-yellow-500" : "text-gray-300"
                    }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M9.049 2.927c.3-.921 1.603-.921 
                1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 
                0 1.371 1.24.588 1.81l-2.8 2.034a1 
                1 0 00-.364 1.118l1.07 3.292c.3.921-.755 
                1.688-1.54 1.118l-2.8-2.034a1 1 0 
                00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118
                l1.07-3.292a1 1 0 00-.364-1.118L2.98 
                8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 
                1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
              ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Review Title
              </label>
              <input
                className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="What's most important to know?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Review
              </label>
              <textarea
                className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                rows={4}
                placeholder="Share your experience with this product..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              ></textarea>
            </div>
          </div>

          <button
            disabled={submitting}
            className={`w-full py-3 rounded-lg text-white font-semibold mt-6 transition-all ${submitting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              }`}
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
};

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const storage = getStorage();
  const { addToCart } = useCart();

  const productState = location.state?.product;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState([]);
  const [currentImg, setCurrentImg] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [variant, setVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    avg: 0,
    total: 0,
    dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [imageLoading, setImageLoading] = useState(true);
  const [mainImageError, setMainImageError] = useState(false);

  // 🔝 AUTO SCROLL TO TOP WHEN PRODUCT LOADS
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [productId]);

  // Add attractive toast function
  const addToast = (product, variant, quantity) => {
    const toastId = Date.now();
    const newToast = {
      id: toastId,
      productName: product.name,
      productImage: currentImg || product.imageUrls[0]?.url || "",
      price: variant?.offerPrice ?? variant?.price ?? product.raw?.price ?? 0,
      quantity: quantity,
      variant: `${selectedColor}${selectedSize ? ` - ${selectedSize}` : ''}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      variantType: Math.floor(Math.random() * 3)
    };

    setToasts(prev => [newToast, ...prev]);

    // Play success sound (optional)
    if (typeof window !== 'undefined') {
      const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3');
      audio.volume = 0.2;
      audio.play().catch(e => console.log('Audio play failed:', e));
    }

    // Auto remove toast after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== toastId));
    }, 4000);
  };

  const fullDescription =
    product?.description ||
    productState?.description ||
    "No description available";

  const fetchReviews = useCallback(async () => {
    try {
      if (!productId) return;
      const q = query(
        collection(db, "reviews"),
        where("productId", "==", productId)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt,
      }));

      docs.sort((a, b) => {
        const ta = a.createdAt?.seconds || 0;
        const tb = b.createdAt?.seconds || 0;
        return tb - ta;
      });

      setReviews(docs);

      const total = docs.length;
      let sum = 0;
      const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      docs.forEach((r) => {
        const rInt = Math.max(1, Math.min(5, Math.floor(Number(r.rating) || 0)));
        dist[rInt] = (dist[rInt] || 0) + 1;
        sum += Number(r.rating) || 0;
      });

      const avg = total === 0 ? 0 : +(sum / total).toFixed(1);
      setStats({ avg, total, dist });
    } catch (err) {
      console.error("fetchReviews err:", err);
    }
  }, [productId]);

  /* -------------------------
     FETCH PRODUCT FROM FIRESTORE
  ------------------------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setImageLoading(true);
      try {
        if (productState && productState.id === productId) {
          const data = productState;
          await processLoadedProduct(data);
          setLoading(false);
          fetchReviews();
          return;
        }

        const refDoc = doc(db, "products", productId);
        const snap = await getDoc(refDoc);

        if (!snap.exists()) {
          setProduct(null);
          setLoading(false);
          return;
        }

        const data = snap.data();
        data.id = snap.id;
        await processLoadedProduct(data);
        fetchReviews();
      } catch (err) {
        console.error("load product err:", err);
        setProduct(null);
      } finally {
        setLoading(false);
        setTimeout(() => setImageLoading(false), 500);
      }
    };

    const processLoadedProduct = async (data) => {
      const list = [];
      const colorMap = {};
      const mainImageUrl = data.mainImageUrl || "";

      if (Array.isArray(data.imageUrls)) {
        data.imageUrls.forEach((item) => {
          if (item && item.url && item.url !== mainImageUrl) {
            colorMap[item.color] = colorMap[item.color] ?? list.length;
            list.push(item.url);
          }
        });
      }

      if (list.length === 0)
        list.push("https://via.placeholder.com/600x400?text=No+Image");

      const variants = Array.isArray(data.variants) ? data.variants : [];

      const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
      const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];

      const defaultColor = colors[0] || variants[0]?.color || "";

      const sizesForColor = defaultColor
        ? [
          ...new Set(
            variants
              .filter((v) => v.color === defaultColor)
              .map((v) => v.size)
              .filter(Boolean)
          ),
        ]
        : sizes;

      const defaultSize = sizesForColor[0] || variants[0]?.size || "";

      let chosenVariant =
        variants.find(
          (v) => v.color === defaultColor && v.size === defaultSize
        ) ||
        variants.find((v) => v.color === defaultColor) ||
        variants[0] ||
        null;

      setImages(list);
      setCurrentImg(
        list.length > 0
          ? list[0]
          : "https://via.placeholder.com/600x400?text=No+Image"
      );
      setSelectedColor(defaultColor);
      setSelectedSize(defaultSize);
      setVariant(chosenVariant);

      setProduct({
        id: data.id,
        name: data.name || "Unnamed product",
        description: data.description || "",
        brand: data.brand || "",
        category: data.category || {},
        sku: data.sku || "",
        sellerId: data.sellerId || data.selterId || "unknown",
        imageUrls: data.imageUrls || [],
        mainImageUrl: "",
        variants,
        colors,
        sizes,
        colorImageMap: colorMap,
        raw: data,
      });
    };

    load();
  }, [productId, productState, fetchReviews]);

  /* -------------------------
     SUBMIT REVIEW
  ------------------------- */
  const submitReview = async ({ rating, title, content }) => {
    try {
      const userId = "anon_" + Math.random().toString(36).slice(2, 10);
      const payload = {
        productId,
        rating,
        title,
        content,
        userId,
        userName: "Anonymous",
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "reviews"), payload);
      await fetchReviews();
      return true;
    } catch (err) {
      console.error("submitReview err:", err);
      alert("Failed to submit review. Please try again.");
      return false;
    }
  };

  const onThumbnailClick = (idx) => {
    if (images[idx]) {
      setCurrentImg(images[idx]);
      setSelectedColor((prev) => {
        if (!product?.colorImageMap) return prev;
        for (const [c, i] of Object.entries(product.colorImageMap)) {
          if (i === idx) return c;
        }
        return prev;
      });
    }
  };

  /* -------------------------
     COLOR / SIZE SELECTION HANDLERS
  ------------------------- */
  useEffect(() => {
    if (!product) return;
    const availableSizes = [
      ...new Set(
        product.variants
          .filter((v) => v.color === selectedColor)
          .map((v) => v.size)
          .filter(Boolean)
      ),
    ];

    if (availableSizes.length === 0) {
      const v =
        product.variants.find((v) => v.color === selectedColor) ||
        product.variants[0];
      setVariant(v || null);
      if (v?.size) setSelectedSize(v.size);
      return;
    }

    const chosenSize = availableSizes.includes(selectedSize)
      ? selectedSize
      : availableSizes[0];

    setSelectedSize(chosenSize);

    const v =
      product.variants.find(
        (x) => x.color === selectedColor && x.size === chosenSize
      ) || product.variants.find((x) => x.color === selectedColor);

    setVariant(v || null);

    const map = product.colorImageMap || {};
    if (map[selectedColor] !== undefined && images[map[selectedColor]]) {
      setCurrentImg(images[map[selectedColor]]);
    }
  }, [selectedColor, product, images]);

  useEffect(() => {
    if (!product) return;
    if (!selectedColor) return;

    const v =
      product.variants.find(
        (x) => x.color === selectedColor && x.size === selectedSize
      ) || product.variants.find((x) => x.color === selectedColor);

    setVariant(v || null);
  }, [selectedSize, selectedColor, product]);

  /* -------------------------
     QUANTITY HANDLERS
  ------------------------- */
  const increment = () => {
    const max = variant?.stock ?? Infinity;
    if (quantity < max) setQuantity((q) => q + 1);
  };

  const decrement = () => {
    if (quantity > 1) setQuantity((q) => q - 1);
  };

  const handleQuantityChange = (e) => {
    let value = Number(e.target.value);
    const max = variant?.stock ?? Infinity;

    if (isNaN(value) || value < 1) value = 1;
    if (value > max) value = max;

    setQuantity(Math.floor(value));
  };

  /* -------------------------
     ADD TO CART
  ------------------------- */
  const onAddToCart = (e) => {
    e.preventDefault();

    if (!product || !variant) {
      alert("Please select a variant");
      return;
    }

    const price =
      variant.offerPrice ?? variant.price ?? product.raw?.price ?? 0;

    const item = {
      id: product.id,
      name: product.name,
      price,
      originalPrice: variant.price ?? product.raw?.price ?? 0,
      quantity,
      variantId: variant.variantId ?? variant.variant_id ?? null,
      selectedColor,
      selectedSize,
      image: currentImg || product.imageUrls[0]?.url || "",
      stock: variant.stock ?? 0,
      colors: product.colors || [],
      sizes: product.sizes || [],
      rams: []
    };

    addToCart(item);

    // Show attractive toast notification
    addToast(product, variant, quantity);

    // Button click animation
    const button = e.currentTarget;
    button.classList.add('clicked');
    setTimeout(() => {
      button.classList.remove('clicked');
    }, 300);

    // 🔝 SCROLL TO SHOW TOAST (TOP OF PAGE)
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const updateStockInFirestore = async (productId, variantId, quantityToDeduct) => {
    if (!variantId || !productId) {
      console.error("Missing productId or variantId for stock update.");
      return false;
    }

    const productRef = doc(db, "products", productId);

    try {
      await runTransaction(db, async (transaction) => {
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) {
          throw new Error("Product does not exist!");
        }

        const productData = productDoc.data();
        const variants = productData.variants || [];
        let variantIndex = -1;

        // Find the index of the specific variant
        variantIndex = variants.findIndex(v => (v.variantId ?? v.variant_id) === variantId);

        if (variantIndex === -1) {
          // Fallback for older data without variantId, matching by color/size
          variantIndex = variants.findIndex(
            v => v.color === selectedColor && v.size === selectedSize
          );
        }

        if (variantIndex === -1) {
          throw new Error("Variant not found in product data!");
        }

        const currentStock = variants[variantIndex].stock || 0;
        const newStock = currentStock - quantityToDeduct;

        if (newStock < 0) {
          // This should be caught by the UI check, but is a critical safety check
          throw new Error(`Insufficient stock: Only ${currentStock} units available.`);
        }

        // Update the stock field in the local variants array
        variants[variantIndex].stock = newStock;

        // Update the document in the transaction
        transaction.update(productRef, { variants: variants });
      });

      console.log(`Stock successfully reduced by ${quantityToDeduct} for variant: ${variantId}`);
      return true;
    } catch (e) {
      console.error("Stock update transaction failed: ", e);
      alert(`Failed to confirm purchase. ${e.message}`);
      return false;
    }
  };

  const onBuyNow = async (e) => { // <--- Made function async
    e.preventDefault();

    if (!product || !variant) {
      alert("Please select a variant");
      return;
    }

    if (variant?.stock !== undefined && variant.stock < quantity) {
      alert(`Only ${variant.stock} units available`);
      return;
    }

    const price = variant.offerPrice ?? variant.price ?? product.raw?.price ?? 0;
    const originalPrice = variant.price ?? product.raw?.price ?? 0;

    const item = {
      id: product.id,
      name: product.name,
      price,
      originalPrice,
      quantity,
      variantId: variant.variantId ?? variant.variant_id ?? null,
      selectedColor: selectedColor || "",
      selectedSize: selectedSize || "",
      selectedRam: "",
      image: currentImg || product.imageUrls[0]?.url || "",
      stock: variant.stock ?? 0,
      colors: product.colors || [],
      sizes: product.sizes || [],
      rams: []
    };

    console.log("Buy Now Item (going directly to payment):", item);

    // --- ⭐ NEW LOGIC: Update Stock in Firebase Firestore ---
    const stockUpdateSuccess = await updateStockInFirestore(
      product.id,
      item.variantId,
      item.quantity
    );

    if (!stockUpdateSuccess) {
      // If stock update fails (e.g., race condition, insufficient stock), stop the purchase process
      return;
    }

    sessionStorage.removeItem("selectedCartItems");

    // Store in sessionStorage for Checkout page
    sessionStorage.setItem("buyNowItem", JSON.stringify(item));
    sessionStorage.setItem("buyNowFlag", "true");

    // Navigate to checkout and SKIP to payment page
    navigate("/checkout", {
      state: {
        item: item,
        buyNow: true,
        skipToPayment: true  // This tells checkout to go directly to payment
      }
    });

    // 🔝 SCROLL TO TOP
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  /* -------------------------
     RENDER
  ------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin h-16 w-16 rounded-full border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-8 rounded-2xl bg-white shadow-lg max-w-md">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Product not found
          </h2>
          <p className="text-gray-500 mb-6">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate("/e-market")}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            Back to Store
          </button>
        </div>
      </div>
    );
  }

  const isInStock = variant?.stock === undefined ? true : variant.stock > 0;
  const displayPrice = variant?.offerPrice ?? variant?.price ?? 0;
  const original = variant?.price ?? 0;
  const discount =
    original > displayPrice
      ? Math.round(((original - displayPrice) / original) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6 relative">
      {/* Toast Notifications Container */}
      <div className="fixed top-6 right-6 z-50 space-y-3 max-w-sm toast-container">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className={`relative overflow-hidden rounded-2xl shadow-2xl border-l-4 transform transition-all duration-300 hover:scale-105 hover:shadow-3xl ${toast.variantType === 0
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-emerald-500'
              : toast.variantType === 1
                ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-500'
                : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-500'
              }`}
            style={{
              animation: `toastSlideIn 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55) ${index * 0.1}s both, toastFloat 3s ease-in-out ${index * 0.1}s infinite alternate`
            }}
          >
            {/* Animated Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-20 h-20 rounded-full bg-gradient-to-br from-white/30 to-transparent"></div>
              <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-gradient-to-tr from-white/20 to-transparent"></div>
            </div>

            {/* Sparkle Effects */}
            <div className="absolute top-2 right-2">
              <div className="w-6 h-6 animate-ping-slow">
                <div className="w-4 h-4 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-full blur-sm"></div>
              </div>
            </div>

            <div className="relative p-4">
              <div className="flex items-start space-x-4">
                {/* Product Image with Glow Effect */}
                <div className="relative flex-shrink-0">
                  <div className={`absolute inset-0 rounded-xl blur-md ${toast.variantType === 0 ? 'bg-emerald-200' :
                    toast.variantType === 1 ? 'bg-blue-200' : 'bg-purple-200'
                    }`}></div>
                  <img
                    src={toast.productImage}
                    alt={toast.productName}
                    className="w-16 h-16 object-cover rounded-xl border-2 border-white shadow-lg relative"
                    onError={(e) => {
                      e.target.src = 'https://placehold.co/64x64?text=🎁';
                    }}
                  />
                  {/* Success Badge */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg animate-bounce-slow">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                {/* Toast Content */}
                <div className="flex-1 min-w-0">
                  {/* Header with Icon */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${toast.variantType === 0 ? 'bg-emerald-100 text-emerald-600' :
                        toast.variantType === 1 ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                        }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm">Added to Cart!</h4>
                    </div>
                    <span className="text-xs text-gray-500 bg-white/50 px-2 py-1 rounded-full">
                      {toast.time}
                    </span>
                  </div>

                  {/* Product Name */}
                  <p className="font-semibold text-gray-800 text-sm truncate mb-1">
                    {toast.productName}
                  </p>

                  {/* Variant and Quantity */}
                  {toast.variant && (
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {toast.variant}
                      </span>
                      <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                        Qty: {toast.quantity}
                      </span>
                    </div>
                  )}

                  {/* Price and Actions */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg font-bold ${toast.variantType === 0 ? 'text-emerald-600' :
                        toast.variantType === 1 ? 'text-blue-600' : 'text-purple-600'
                        }`}>
                        ₹{toast.price}
                      </span>
                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                        ✓ {toast.quantity} Item{toast.quantity > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex items-center">
                      <button
                        onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-white/50 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full animate-progress-bar ${toast.variantType === 0 ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                    toast.variantType === 1 ? 'bg-gradient-to-r from-blue-400 to-cyan-500' :
                      'bg-gradient-to-r from-purple-400 to-pink-500'
                    }`}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showReviewModal && (
        <WriteReviewModal
          onClose={() => setShowReviewModal(false)}
          onSubmit={submitReview}
          productName={product.name}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-sm mb-6 text-gray-600 flex items-center space-x-2">
          <button
            onClick={() => navigate("/")}
            className="cursor-pointer hover:text-gray-800 transition-colors"
          >
            Home
          </button>
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <button
            onClick={() => navigate("/e-market")}
            className="cursor-pointer hover:text-gray-800 transition-colors"
          >
            E-Market
          </button>
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-800 font-medium truncate max-w-xs">{product.name}</span>
        </nav>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 md:p-8">
            {/* LEFT SIDE — IMAGES */}
            <div className="space-y-4">
              <div className={`bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden min-h-[400px] flex items-center justify-center relative ${imageLoading ? 'animate-pulse' : ''
                }`}>
                {mainImageError ? (
                  <div className="text-center p-8">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500">Image failed to load</p>
                  </div>
                ) : (
                  <img
                    src={currentImg}
                    alt={product.name}
                    className="w-full h-auto max-h-[450px] object-contain transition-opacity duration-300"
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      setMainImageError(true);
                      setImageLoading(false);
                    }}
                  />
                )}
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-purple-600"></div>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => onThumbnailClick(i)}
                      className={`rounded-xl overflow-hidden border-2 transition-all duration-200 ${currentImg === img
                        ? "border-purple-500 ring-2 ring-purple-200"
                        : "border-gray-300 hover:border-gray-400"
                        }`}
                    >
                      <img
                        src={img}
                        className="h-20 w-full object-cover"
                        alt={`Thumbnail ${i + 1}`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT SIDE — DETAILS */}
            <div className="space-y-6">
              <div>
                {product.brand && (
                  <p className="text-purple-600 font-semibold uppercase tracking-wider text-sm mb-2">
                    {product.brand}
                  </p>
                )}
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                  {product.name}
                </h1>
              </div>

              {/* ⭐ Rating */}
              <div className="flex items-center space-x-4">
                {stats.avg > 0 && (
                  <div className="flex items-center bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-full">
                    <span className="font-bold text-lg">{stats.avg}</span>
                    <svg className="w-5 h-5 ml-1" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921..." />
                    </svg>
                  </div>
                )}
                <span className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                  {stats.total} {stats.total === 1 ? 'review' : 'reviews'}
                </span>
                {/* {variant?.stock !== undefined && (
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${variant.stock > 10
                      ? 'bg-green-100 text-green-800'
                      : variant.stock > 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${variant.stock > 10
                        ? 'bg-green-500'
                        : variant.stock > 0
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}></div>
                    {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'}
                  </div>
                )} */}
              </div>

              {/* Price */}
              <div className="flex items-end space-x-4">
                <p className="text-4xl font-bold text-gray-900">
                  ₹{displayPrice.toLocaleString()}
                </p>
                {original > displayPrice && (
                  <div className="space-y-1">
                    <p className="line-through text-gray-500 text-lg">₹{original.toLocaleString()}</p>
                    <span className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-md">
                      {discount}% OFF
                    </span>
                  </div>
                )}
              </div>

              {/* Color */}
              {product.colors.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-700">Color: <span className="font-normal">{selectedColor}</span></h3>
                  <div className="flex gap-2 flex-wrap">
                    {product.colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        className={`px-4 py-2.5 rounded-lg border transition-all duration-200 font-medium ${selectedColor === c
                          ? "border-purple-600 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 shadow-md"
                          : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                          }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size */}
              {product.sizes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-700">Variants: <span className="font-normal">{selectedSize}</span></h3>
                  <div className="flex gap-2 flex-wrap">
                    {product.variants
                      .filter((v) => v.color === selectedColor && v.size)
                      .map((v) => (
                        <button
                          key={v.size}
                          onClick={() => setSelectedSize(v.size)}
                          disabled={v.stock === 0}
                          className={`px-4 py-2.5 rounded-lg border transition-all duration-200 font-medium relative ${selectedSize === v.size
                            ? "border-purple-600 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 shadow-md"
                            : v.stock > 0
                              ? "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                              : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                            }`}
                          title={v.stock === 0 ? "Out of stock" : ""}
                        >
                          {v.size}
                          {v.stock === 0 && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-gray-700 mb-3 text-lg">Description</h3>
                <p className="text-gray-600 leading-relaxed">
                  {fullDescription.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      <br />
                    </span>
                  ))}
                </p>
              </div>

              {/* Quantity */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-gray-700">Quantity</h3>
                <div className="flex items-center">
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={decrement}
                      disabled={quantity <= 1}
                      className="px-4 py-3 text-gray-700 hover:bg-gray-50 disabled:text-gray-400 disabled:hover:bg-white transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={handleQuantityChange}
                      className="w-16 text-center py-3 border-x border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      min="1"
                      max={variant?.stock ?? 99}
                    />
                    <button
                      onClick={increment}
                      disabled={variant?.stock !== undefined && quantity >= variant.stock}
                      className="px-4 py-3 text-gray-700 hover:bg-gray-50 disabled:text-gray-400 disabled:hover:bg-white transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-6">
                <button
                  onClick={onAddToCart}
                  disabled={!isInStock}
                  className={`flex-1 py-4 rounded-xl text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0 ${isInStock
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    : "bg-gray-400 cursor-not-allowed"
                    }`}
                >
                  {isInStock ? "Add to Cart" : "Out of Stock"}
                </button>

                <button
                  onClick={async (e) => { // Made onClick handler async
                    e.currentTarget.classList.add('clicked');
                    setTimeout(() => {
                      e.currentTarget.classList.remove('clicked');
                    }, 300);
                    // Pass the event to onBuyNow
                    await onBuyNow(e);
                  }}
                  disabled={!isInStock}
                  className={`flex-1 py-4 rounded-xl text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0 ${isInStock
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    : "bg-gray-400 cursor-not-allowed"
                    }`}
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* REVIEWS BLOCK */}
        {stats.total > 0 && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mt-8">
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">
                  Ratings & Reviews
                </h2>
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
                >
                  Write a Review
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="border-r pr-8">
                  <div className="text-center">
                    <p className="text-6xl font-extrabold text-gray-900 mb-2">
                      {stats.avg}
                    </p>
                    <div className="flex justify-center mb-3">
                      <StarRating rating={stats.avg} size="w-8 h-8" />
                    </div>
                    <p className="text-sm text-gray-600 mb-6">
                      Based on {stats.total} {stats.total === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>

                  {/* Distribution */}
                  <div className="space-y-4">
                    {[5, 4, 3, 2, 1].map((s) => {
                      const percentage = stats.total ? (stats.dist[s] / stats.total) * 100 : 0;
                      return (
                        <div key={s} className="flex items-center gap-4">
                          <span className="w-8 text-gray-600">{s}★</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${s >= 3 ? "bg-gradient-to-r from-green-400 to-emerald-500" : "bg-gradient-to-r from-yellow-400 to-orange-500"
                                }`}
                              style={{
                                width: `${percentage}%`,
                              }}
                            ></div>
                          </div>
                          <span className="w-12 text-right text-gray-600 font-medium">
                            {stats.dist[s]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-2">
                  {reviews.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <p className="text-gray-500 text-lg">No reviews yet. Be the first to share your thoughts!</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {reviews.slice(0, 4).map((r) => (
                        <div key={r.id} className="border-b pb-8 last:border-b-0">
                          <div className="flex items-center justify-between mb-3">
                            <StarRating rating={r.rating} />
                            <span className="text-sm text-gray-500">
                              {r.createdAt?.toDate ? new Date(r.createdAt.toDate()).toLocaleDateString() : 'Recently'}
                            </span>
                          </div>
                          <h4 className="font-bold text-lg text-gray-900 mb-2">{r.title}</h4>
                          <p className="text-sm text-gray-600 mb-4">by {r.userName}</p>
                          <p className="text-gray-700 leading-relaxed">{r.content}</p>
                        </div>
                      ))}

                      {reviews.length > 4 && (
                        <div className="text-center pt-4">
                          <button className="text-purple-600 hover:text-purple-800 font-semibold hover:underline transition-colors">
                            View all {reviews.length} reviews →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Scroll to Top Button */}
      <button
        className="floating-scroll-btn"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>

      {/* Add this script to show/hide the button on scroll */}
      <script dangerouslySetInnerHTML={{
        __html: `
          window.addEventListener('DOMContentLoaded', function() {
            const scrollBtn = document.querySelector('.floating-scroll-btn');
            if (scrollBtn) {
              window.addEventListener('scroll', function() {
                if (window.pageYOffset > 300) {
                  scrollBtn.classList.add('show');
                } else {
                  scrollBtn.classList.remove('show');
                }
              });
            }
          });
        `
      }} />

      {/* Add Enhanced CSS Animations */}
      <style jsx="true">{`
        @keyframes toastSlideIn {
          0% {
            transform: translateX(100%) rotate(5deg);
            opacity: 0;
          }
          70% {
            transform: translateX(-10%) rotate(-2deg);
            opacity: 1;
          }
          100% {
            transform: translateX(0) rotate(0);
            opacity: 1;
          }
        }
        
        @keyframes toastFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        
        @keyframes progressBar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        
        @keyframes pingSlow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
        
        @keyframes bounceSlow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        
        .animate-progress-bar {
          animation: progressBar 4s linear forwards;
        }
        
        .animate-ping-slow {
          animation: pingSlow 2s ease-in-out infinite;
        }
        
        .animate-bounce-slow {
          animation: bounceSlow 1.5s ease-in-out infinite;
        }
        
        .toast-container > div {
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        /* Button click animation */
        .clicked {
          animation: buttonClick 0.3s ease-out;
        }
        
        @keyframes buttonClick {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(0.95);
          }
          100% {
            transform: scale(1);
          }
        }

        /* Smooth scroll behavior */
        html {
          scroll-behavior: smooth;
        }

        /* Floating Scroll Button Styles */
        .floating-scroll-btn {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 1000;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
          opacity: 0;
          visibility: hidden;
          transform: translateY(20px);
        }

        .floating-scroll-btn.show {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .floating-scroll-btn:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .floating-scroll-btn svg {
          width: 24px;
          height: 24px;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #8b5cf6, #ec4899);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #7c3aed, #db2777);
        }
      `}</style>
    </div>
  );
};

export default ProductDetail;