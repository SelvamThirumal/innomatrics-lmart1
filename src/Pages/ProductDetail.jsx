import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db } from "../../firebase";
import {
  doc, getDoc,
  collection, query, where, getDocs, addDoc, serverTimestamp
} from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { useCart } from "../context/CartContext";

/* -----------------------------------------------------------
   ⭐ STAR RATING COMPONENT
----------------------------------------------------------- */
const StarRating = ({ rating, size = 'w-4 h-4', color = 'text-green-500' }) => {
  const fullStars = Math.floor(rating);
  return (
    <div className="flex">
      {Array(5).fill(0).map((_, i) => (
        <svg key={i}
          className={`${size} ${i < fullStars ? color : "text-gray-300"}`}
          fill="currentColor"
          viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 
          3.292a1 1 0 00.95.69h3.462c.969 0 1.371 
          1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 
          1.118l1.07 3.292c.3.921-.755 1.688-1.54 
          1.118l-2.8-2.034a1 1 0 00-1.175 
          0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118
          l1.07-3.292a1 1 0 00-.364-1.118L2.98 
          8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 
          1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
};

/* -----------------------------------------------------------
   ⭐ STAR DISTRIBUTION BAR
----------------------------------------------------------- */
const StarBar = ({ count, total, star }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center space-x-2">
      <div className="w-40 bg-gray-200 rounded-full h-2.5">
        <div className={`${star >= 3 ? "bg-green-500" : "bg-yellow-500"} h-2.5 rounded-full`}
          style={{ width: `${percentage}%` }}>
        </div>
      </div>
    </div>
  );
};

/* -----------------------------------------------------------
   ⭐ WRITE REVIEW MODAL
----------------------------------------------------------- */
const WriteReviewModal = ({ onClose, onSubmit, productName }) => {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg">
            Write a Review – {productName}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✕
          </button>
        </div>

        <form onSubmit={submitReview}>

          <div className="flex mb-4">
            {Array(5).fill(0).map((_, i) => (
              <svg key={i}
                onClick={() => setRating(i + 1)}
                className={`w-8 h-8 cursor-pointer ${i < rating ? "text-yellow-500" : "text-gray-300"}`}
                fill="currentColor"
                viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 
                1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 
                0 1.371 1.24.588 1.81l-2.8 2.034a1 
                1 0 00-.364 1.118l1.07 3.292c.3.921-.755 
                1.688-1.54 1.118l-2.8-2.034a1 1 0 
                00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118
                l1.07-3.292a1 1 0 00-.364-1.118L2.98 
                8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 
                1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>

          <input
            className="border p-3 rounded w-full mb-3"
            placeholder="Review title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="border p-3 rounded w-full mb-3"
            rows={4}
            placeholder="Write your review"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          ></textarea>

          <button
            disabled={submitting}
            className={`w-full py-3 rounded text-white font-semibold ${
              submitting ? "bg-gray-400" : "bg-purple-600 hover:bg-purple-700"
            }`}>
            {submitting ? "Submitting..." : "Submit Review"}
          </button>

        </form>

      </div>
    </div>
  );
};

/* -----------------------------------------------------------
   ⭐ MAIN PRODUCT DETAIL PAGE
----------------------------------------------------------- */
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

  /* DESCRIPTION FIX */
  const fullDescription =
    product?.description ||
    productState?.description ||
    "No description available";
    
  /* -------------------------
     FETCH REVIEWS FROM FIRESTORE
  ------------------------- */
  const fetchReviews = useCallback(async () => {
    try {
      if (!productId) return;
      const q = query(collection(db, "reviews"), where("productId", "==", productId));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt }));
      // sort newest first (if serverTimestamp stored)
      docs.sort((a, b) => {
        const ta = a.createdAt?.seconds || 0;
        const tb = b.createdAt?.seconds || 0;
        return tb - ta;
      });
      setReviews(docs);

      // compute stats
      const total = docs.length;
      let sum = 0;
      const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      docs.forEach(r => {
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
      try {
        // if product provided by route state, use it first (fast)
        if (productState && productState.id === productId) {
          const data = productState;
          // normalize and set
          await processLoadedProduct(data);
          setLoading(false);
          // still fetch reviews
          fetchReviews();
          return;
        }

        // otherwise fetch from firestore
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
      }
    };

    // process loaded product data into local shape
    const processLoadedProduct = async (data) => {
      // build image list from imageUrls ONLY - completely ignore mainImageUrl
      const list = [];
      const colorMap = {}; // color -> first index
      const mainImageUrl = data.mainImageUrl || "";
      
      // Only use gallery images that are NOT the main image
      if (Array.isArray(data.imageUrls)) {
        data.imageUrls.forEach(item => {
          if (item && item.url && item.url !== mainImageUrl) { // Skip main image
            colorMap[item.color] = colorMap[item.color] ?? list.length;
            list.push(item.url);
          }
        });
      }
      
      // DO NOT add mainImageUrl at all - only use non-main gallery images
      
      // fallback placeholder - only if gallery has no images
      if (list.length === 0) list.push("https://via.placeholder.com/600x400?text=No+Image");

      // variants normalization
      const variants = Array.isArray(data.variants) ? data.variants : [];
      // colors and sizes
      const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
      const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];

      // choose default color & size & variant
      const defaultColor = colors[0] || variants[0]?.color || "";
      const sizesForColor = defaultColor
        ? [...new Set(variants.filter(v => v.color === defaultColor).map(v => v.size).filter(Boolean))]
        : sizes;
      const defaultSize = sizesForColor[0] || variants[0]?.size || "";
      let chosenVariant = variants.find(v => v.color === defaultColor && v.size === defaultSize)
        || variants.find(v => v.color === defaultColor)
        || variants[0] || null;

      // set states
      setImages(list);
      setCurrentImg(list.length > 0 ? list[0] : "https://via.placeholder.com/600x400?text=No+Image");
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
        mainImageUrl: "", // Set to empty string
        variants,
        colors,
        sizes,
        colorImageMap: colorMap,
        raw: data
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
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, "reviews"), payload);
      // refresh reviews
      await fetchReviews();
      return true;
    } catch (err) {
      console.error("submitReview err:", err);
      return false;
    }
  };

  /* -------------------------
     IMAGE / THUMBNAIL HANDLERS
  ------------------------- */
  const onThumbnailClick = (idx) => {
    if (images[idx]) {
      setCurrentImg(images[idx]);
      setSelectedColor(prev => {
        // if a color corresponds to this index, set it
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
    // when selectedColor changes, update variant and available sizes
    if (!product) return;
    const availableSizes = [...new Set(product.variants.filter(v => v.color === selectedColor).map(v => v.size).filter(Boolean))];
    if (availableSizes.length === 0) {
      // fallback to any variant with color or to first variant
      const v = product.variants.find(v => v.color === selectedColor) || product.variants[0];
      setVariant(v || null);
      if (v?.size) setSelectedSize(v.size);
      return;
    }
    // pick variant with selectedSize if set, else first available
    const chosenSize = availableSizes.includes(selectedSize) ? selectedSize : availableSizes[0];
    setSelectedSize(chosenSize);
    const v = product.variants.find(x => x.color === selectedColor && x.size === chosenSize) || product.variants.find(x => x.color === selectedColor);
    setVariant(v || null);

    // update main image if colorImageMap has entry
    const map = product.colorImageMap || {};
    if (map[selectedColor] !== undefined && images[map[selectedColor]]) {
      setCurrentImg(images[map[selectedColor]]);
    }
  }, [selectedColor]); // eslint-disable-line

  useEffect(() => {
    // when selectedSize changes, update variant
    if (!product) return;
    if (!selectedColor) return;
    const v = product.variants.find(x => x.color === selectedColor && x.size === selectedSize) || product.variants.find(x => x.color === selectedColor);
    setVariant(v || null);
  }, [selectedSize]); // eslint-disable-line

  /* -------------------------
     QUANTITY HANDLERS
  ------------------------- */
  const increment = () => {
    const max = variant?.stock ?? Infinity;
    if (quantity < max) setQuantity(q => q + 1);
    else {
      // optionally show message
      alert(`Max available: ${max}`);
    }
  };
  const decrement = () => {
    if (quantity > 1) setQuantity(q => q - 1);
  };

  /* -------------------------
     ADD TO CART / BUY NOW
  ------------------------- */
  const onAddToCart = () => {
    if (!product || !variant) {
      alert("Select variant");
      return;
    }
    const price = variant.offerPrice ?? variant.price ?? product.raw?.price ?? 0;
    const item = {
      id: product.id,
      name: product.name,
      price,
      originalPrice: variant.price ?? product.raw?.price ?? 0,
      quantity,
      variantId: variant.variantId ?? variant.variant_id ?? null,
      selectedColor,
      selectedSize,
      image: currentImg || product.imageUrls[0]?.url || "", // Use currentImg first, fallback to first gallery image
      stock: variant.stock ?? 0,
    };
    addToCart(item);
    alert("Added to cart");
  };

  const onBuyNow = () => {
    onAddToCart();
    // navigate to checkout after tiny delay to ensure cart updated
    setTimeout(() => navigate("/checkout"), 400);
  };

  /* -------------------------
     RENDER
  ------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-14 w-14 rounded-full border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col">
        <h2 className="text-2xl font-semibold text-gray-600 mb-4">Product not found</h2>
        <button
          onClick={() => navigate("/e-market")}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
        >
          Back to Store
        </button>
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
    <div className="min-h-screen bg-gray-50 py-6">
      {showReviewModal && (
        <WriteReviewModal
          onClose={() => setShowReviewModal(false)}
          onSubmit={submitReview}
          productName={product.name}
        />
      )}

      <div className="max-w-6xl mx-auto px-4">
        
        {/* Breadcrumb */}
        <nav className="text-sm mb-4 text-gray-500">
          <span className="cursor-pointer hover:text-gray-700" onClick={() => navigate("/")}>Home</span>
          <span className="mx-2">›</span>
          <span className="cursor-pointer hover:text-gray-700" onClick={() => navigate("/e-market")}>E-Market</span>
          <span className="mx-2">›</span>
          <span className="text-gray-700">{product.name}</span>
        </nav>

        <div className="bg-white rounded-xl shadow-sm p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT SIDE — IMAGES */}
          <div>
            <div className="bg-gray-100 rounded-xl overflow-hidden">
              <img
                src={currentImg}
                alt={product.name}
                className="w-full max-h-[450px] object-contain"
              />
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3 mt-4">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => onThumbnailClick(i)}
                    className={`rounded-xl overflow-hidden border ${
                      currentImg === img ? "border-purple-500" : "border-gray-300"
                    }`}
                  >
                    <img src={img} className="h-20 w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT SIDE — DETAILS */}
          <div className="space-y-5">
            
            <p className="text-purple-600 font-semibold uppercase">{product.brand}</p>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>

            {/* ⭐ Rating */}
            <div className="flex items-center space-x-3">
              {stats.avg > 0 && (
                <div className="flex items-center bg-green-600 text-white px-2 py-1 rounded">
                  <span className="font-bold">{stats.avg}</span>
                  <svg className="w-4 h-4 ml-1" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921..." />
                  </svg>
                </div>
              )}
              <span className="text-blue-600 text-sm">{stats.total} reviews</span>
            </div>

            {/* Price */}
            <div className="flex items-end space-x-3">
              <p className="text-3xl font-bold text-gray-900">₹{displayPrice}</p>
              {original > displayPrice && (
                <>
                  <p className="line-through text-gray-500">₹{original}</p>
                  <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">
                    {discount}% OFF
                  </span>
                </>
              )}
            </div>

            {/* Color */}
            {product.colors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-1">Color: {selectedColor}</h3>
                <div className="flex gap-2 flex-wrap">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`px-3 py-1 rounded border ${
                        selectedColor === c
                          ? "border-purple-600 bg-purple-50 text-purple-700"
                          : "border-gray-300"
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
              <div>
                <h3 className="font-semibold mb-1">Size: {selectedSize}</h3>
                <div className="flex gap-3 flex-wrap">
                  {product.variants
                    .filter((v) => v.color === selectedColor)
                    .map((v) => (
                      <button
                        key={v.size}
                        onClick={() => setSelectedSize(v.size)}
                        className={`px-3 py-2 rounded border ${
                          selectedSize === v.size
                            ? "border-purple-600 bg-purple-50 text-purple-700"
                            : "border-gray-300"
                        }`}
                      >
                        {v.size}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Description — FIXED TO SHOW FIRESTORE TEXT */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-700 leading-relaxed">
                {product.description || "No description available."}
              </p>
            </div>

            {/* Quantity */}
            <div>
              <h3 className="font-semibold mb-1">Quantity</h3>
              <div className="flex items-center border w-fit rounded-lg">
                <button
                  onClick={decrement}
                  className="px-3 py-2 text-gray-700"
                >
                  −
                </button>
                <span className="px-5 py-2 border-x">{quantity}</span>
                <button
                  onClick={increment}
                  className="px-3 py-2 text-gray-700"
                >
                  +
                </button>
              </div>
              {variant?.stock !== undefined && (
                <p className="text-sm text-gray-500 mt-1">
                  {variant.stock} units available
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-3">
              <button
                onClick={onAddToCart}
                disabled={!isInStock}
                className={`flex-1 py-3 rounded-lg text-white font-semibold ${
                  isInStock
                    ? "bg-purple-600 hover:bg-purple-700"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                Add to Cart
              </button>

              <button
                onClick={onBuyNow}
                disabled={!isInStock}
                className={`flex-1 py-3 rounded-lg text-white font-semibold ${
                  isInStock
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* ------------------ REVIEWS BLOCK ------------------ */}
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">

          <h2 className="text-2xl font-bold text-gray-900 mb-6">Ratings & Reviews</h2>

          {/* Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Avg rating */}
            <div className="border-r pr-6">
              <p className="text-5xl font-extrabold text-gray-900">{stats.avg}</p>
              <StarRating rating={stats.avg} size="w-6 h-6" />
              <p className="text-sm text-gray-600 mt-2">{stats.total} reviews</p>

              {/* distribution */}
              <div className="mt-4 space-y-2">
                {[5, 4, 3, 2, 1].map((s) => (
                  <div key={s} className="flex items-center gap-3">
                    <span className="w-8">{s}★</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          s >= 3 ? "bg-green-500" : "bg-yellow-500"
                        }`}
                        style={{
                          width: stats.total
                            ? `${(stats.dist[s] / stats.total) * 100}%`
                            : "0%",
                        }}
                      ></div>
                    </div>
                    <span className="w-8 text-right">{stats.dist[s]}</span>
                  </div>
                ))}
              </div>

              {/* Write Review */}
              <button
                onClick={() => setShowReviewModal(true)}
                className="mt-6 bg-purple-600 text-white px-5 py-3 rounded-lg hover:bg-purple-700"
              >
                Write a Review
              </button>
            </div>

            {/* Review list */}
            <div className="lg:col-span-2 pl-4">
              {reviews.length === 0 ? (
                <p className="text-gray-500">No reviews yet.</p>
              ) : (
                <div className="space-y-6">
                  {reviews.slice(0, 4).map((r) => (
                    <div key={r.id} className="border-b pb-4">
                      <StarRating rating={r.rating} />
                      <h4 className="font-semibold mt-2">{r.title}</h4>
                      <p className="text-sm text-gray-600">by {r.userName}</p>
                      <p className="mt-1">{r.content}</p>
                    </div>
                  ))}

                  {reviews.length > 4 && (
                    <button className="text-blue-600 hover:underline">
                      View all reviews
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default ProductDetail;