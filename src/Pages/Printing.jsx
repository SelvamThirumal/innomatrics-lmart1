import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

import { getApps, initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

/* --------------------- Animations (your customStyles) --------------------- */
const customStyles = `
  @keyframes fadeInUp { from { opacity:0; transform:translateY(30px);} to {opacity:1; transform:translateY(0);} }
  @keyframes slideInLeft { from {opacity:0; transform:translateX(-50px);} to{opacity:1; transform:translateX(0);} }
  @keyframes slideInRight { from {opacity:0; transform:translateX(50px);} to{opacity:1; transform:translateX(0);} }
  @keyframes slideUp { from {opacity:0; transform:translateY(50px);} to {opacity:1; transform:translateY(0);} }
  @keyframes zoomIn { from {opacity:0; transform:scale(0.8);} to {opacity:1; transform:scale(1);} }
  @keyframes float { 0%,100%{transform:translateY(0px);} 50%{transform:translateY(-20px);} }
  @keyframes bounceSlow { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-10px);} }
  @keyframes spinSlow { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }

  .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
  .animate-slide-in-left { animation: slideInLeft 0.8s ease-out forwards; }
  .animate-slide-in-right { animation: slideInRight 0.8s ease-out forwards; }
  .animate-slide-up { animation: slideUp 0.8s ease-out forwards; }
  .animate-zoom-in { animation: zoomIn 0.8s ease-out forwards; }
  .animate-float { animation: float 3s ease-in-out infinite; }
  .animate-bounce-slow { animation: bounceSlow 2s ease-in-out infinite; }
  .animate-spin-slow { animation: spinSlow 3s linear infinite; }

  .animation-delay-100 { animation-delay: 0.1s; }
  .animation-delay-200 { animation-delay: 0.2s; }
  .animation-delay-300 { animation-delay: 0.3s; }
  .animation-delay-400 { animation-delay: 0.4s; }
  .animation-delay-500 { animation-delay: 0.5s; }
  .animation-delay-600 { animation-delay: 0.6s; }
  .animation-delay-700 { animation-delay: 0.7s; }
  .animation-delay-800 { animation-delay: 0.8s; }
  .animation-delay-900 { animation-delay: 0.9s; }
`;

// inject CSS once (guard)
if (typeof document !== "undefined" && !document.getElementById("printing-custom-styles")) {
  const styleEl = document.createElement("style");
  styleEl.id = "printing-custom-styles";
  styleEl.type = "text/css";
  styleEl.innerText = customStyles;
  document.head.appendChild(styleEl);
}

/* --------------------- Firebase init --------------------- */
const firebaseConfig =
  typeof __firebase_config !== "undefined" ? JSON.parse(__firebase_config) : {};

const appName = typeof __app_id !== "undefined" && __app_id ? `print-${__app_id}` : "[DEFAULT]";
const app = getApps().find((a) => a.name === appName) || initializeApp(firebaseConfig, appName);
const db = getFirestore(app);

/* --------------------- Helpers --------------------- */

// Get main image url (prefers mainImageUrl, then first imageUrls item or placeholder)
const getMainImageUrl = (product) => {
  if (product.mainImageUrl) return product.mainImageUrl;
  if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
    const main = product.imageUrls.find((i) => i.isMain) || product.imageUrls[0];
    return main?.url || "https://placehold.co/400x300?text=No+Image";
  }
  return product.image || product.imageUrl || "https://placehold.co/400x300?text=No+Image";
};

// pick a sane variant (prefer non-zero price variant)
const pickVariant = (product) => {
  if (!Array.isArray(product.variants) || product.variants.length === 0) return null;
  const found = product.variants.find((v) => Number(v.price) > 0);
  return found || product.variants[0] || null;
};

// compute displayed price, original price and discount percentage
const computePriceData = (product) => {
  const variant = pickVariant(product);
  const rawPrice = Number(variant?.price ?? product.price ?? 0);
  const rawOffer = Number(variant?.offerPrice ?? product.offerPrice ?? 0) || 0;

  const finalPrice = rawOffer > 0 && rawOffer < rawPrice ? rawOffer : rawPrice;
  const originalPrice = rawOffer > 0 && rawOffer < rawPrice ? rawPrice : 0;
  const discount = originalPrice > 0 ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100) : 0;

  return { finalPrice, originalPrice, discount, variant };
};

// create categories list from category.name and subCategory (Option 3)
const buildCategories = (list) => {
  const set = new Set(["All Products"]);
  list.forEach((p) => {
    if (p?.category?.name) set.add(p.category.name);
    if (p?.subCategory) set.add(p.subCategory);
    if (p?.productTag) set.add(p.productTag);
  });
  return Array.from(set);
};

/* --------------------- Component --------------------- */
const Printing = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(["All Products"]);
  const [selectedCategory, setSelectedCategory] = useState("All Products");
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState([99, 25000]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  // load printing products from Firestore
  useEffect(() => {
    const fetchPrintingProducts = async () => {
      setLoading(true);
      try {
        const ref = collection(db, "products");
        const q = query(ref, where("productTag", "==", "Printing"));
        const snap = await getDocs(q);

        const mapped = snap.docs.map((doc) => {
          const data = doc.data() || {};
          const img = getMainImageUrl(data);
          const { finalPrice, originalPrice, discount, variant } = computePriceData(data);

          return {
            ...data,
            _id: doc.id,
            image: img,
            price: finalPrice,
            originalPrice,
            discount,
            variant,
          };
        });

        setProducts(mapped);
        setCategories(buildCategories(mapped));

        // auto-set slider max from max price found
        const maxFound = Math.max(...mapped.map((p) => Number(p.price || 0)), 25000);
        setPriceRange([99, Math.ceil(maxFound / 1000) * 1000]);
      } catch (err) {
        console.error("Error fetching Printing products:", err);
        // fallback: keep empty products — you already had sample fallback in your earlier code if needed
      } finally {
        setLoading(false);
      }
    };

    fetchPrintingProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // filter logic
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "All Products" ||
      (product.category?.name && product.category.name === selectedCategory) ||
      (product.subCategory && product.subCategory === selectedCategory) ||
      (product.productTag && product.productTag === selectedCategory);

    const matchesPrice = (Number(product.price) || 0) >= priceRange[0] && (Number(product.price) || 0) <= priceRange[1];
    const matchesSearch = (product.name || "").toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesPrice && matchesSearch;
  });

  // small helpers for WhatsApp / call (kept from yours)
  const handleWhatsAppClick = () => {
    const phoneNumber = "919880444189";
    const message = "Hello! I am interested in your printing services. Can you provide more information?";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleCallClick = () => {
    window.location.href = "tel:+919880444189";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6 animate-fade-in-up">Professional Printing Services</h1>
          <p className="text-xl mb-8 animate-fade-in-up animation-delay-200">High-quality printing solutions for all your business needs</p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up animation-delay-400">
            <button onClick={handleWhatsAppClick} className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2">
              <span>💬</span> WhatsApp Now
            </button>
            <button onClick={handleCallClick} className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2">
              <span>📞</span> Call 9880444189
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-full mx-auto px-2 py-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* mobile toggle */}
          <div className="lg:hidden mb-4">
            <button onClick={() => setShowFilters(!showFilters)} className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" /></svg>
              Filters
            </button>
          </div>

          {/* Sidebar */}
          <div className={`w-full lg:w-72 flex-shrink-0 ${showFilters ? "block" : "hidden lg:block"}`}>
            {/* Search */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search printing services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-4">Categories</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category} className="flex items-center">
                    <input
                      type="radio"
                      id={`cat-${category}`}
                      name="category"
                      checked={selectedCategory === category}
                      onChange={() => setSelectedCategory(category)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <label htmlFor={`cat-${category}`} className="ml-2 text-sm text-gray-700 cursor-pointer">{category}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Type */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-4">Service Type</h3>
              <div className="space-y-2">
                {["Design Only", "Print Only", "Design + Print", "Rush Service"].map((type) => (
                  <div key={type} className="flex items-center">
                    <input type="checkbox" id={`s-${type}`} className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded" />
                    <label htmlFor={`s-${type}`} className="ml-2 text-sm text-gray-700 cursor-pointer">{type}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-4">Delivery Time</h3>
              <div className="space-y-2">
                {["Same Day", "1-2 days", "3-5 days", "1 week", "2+ weeks"].map((delivery) => (
                  <div key={delivery} className="flex items-center">
                    <input type="checkbox" id={`d-${delivery}`} className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded" />
                    <label htmlFor={`d-${delivery}`} className="ml-2 text-sm text-gray-700 cursor-pointer">{delivery}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 mb-4">Price Range</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>₹ {priceRange[0]}</span>
                  <span>₹ {priceRange[1]}</span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="99"
                    max="25000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value, 10) || 25000])}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1">
            {/* Tabs */}
            <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg overflow-x-auto">
              {categories.slice(0, 10).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedCategory(tab)}
                  className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md transition-colors ${selectedCategory === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-6 h-6 bg-purple-300 rounded flex items-center justify-center">
                      <div className="w-3 h-3 bg-purple-600 rounded"></div>
                    </div>
                    <span>{tab}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{selectedCategory === "All Products" ? "All Printing Services" : selectedCategory}</h2>
              <p className="text-gray-600">{filteredProducts.length} products found</p>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
              </div>
            ) : (
              <>
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product, index) => (
                      <div key={product._id || product.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 group animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
                        <div className="relative">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300 cursor-pointer"
                            onClick={() => navigate(`/product/${product._id || product.id}`, { state: { product } })}
                            onError={(e) => (e.currentTarget.src = "https://placehold.co/400x300?text=No+Image")}
                          />
                          {product.isNew && <span className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">New!</span>}
                          {product.discount > 0 && <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">{product.discount}% OFF</span>}
                        </div>

                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => navigate(`/product/${product._id || product.id}`, { state: { product } })}>
                            {product.name}
                          </h3>

                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>

                          {/* Rating */}
                          <div className="flex items-center mb-3">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <svg key={i} className={`w-4 h-4 ${i < Math.floor(product.rating || 0) ? "text-yellow-400" : "text-gray-300"}`} fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-sm text-gray-500 ml-1">({product.reviews || 0})</span>
                          </div>

                          {/* Price */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg font-bold text-gray-900">₹ {product.price}</span>
                              {product.originalPrice && <span className="text-sm text-gray-400 line-through">₹ {product.originalPrice}</span>}
                            </div>
                            <div className="flex items-center text-green-600 text-sm">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                              {product.deliveryTime || "—"}
                            </div>
                          </div>

                          {/* Variant info & Add to cart */}
                          <div className="mb-3">
                            {product.variant && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {product.variant.size && <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded">Size: {product.variant.size}</span>}
                                <span className={`text-xs px-2 py-1 rounded ${product.variant.stock > 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>{product.variant.stock > 0 ? `In Stock (${product.variant.stock})` : "Out of Stock"}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex space-x-2">
                            <button onClick={() => addToCart({ ...product, id: product._id || product.id })} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2">
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" /></svg>
                              <span className="whitespace-nowrap">Add to Cart</span>
                            </button>
                            <button onClick={() => navigate(`/product/${product._id || product.id}`, { state: { product } })} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center" aria-label="Quick view product">
                              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 6.306a7.962 7.962 0 00-6 0m6 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v1.306m8 0V7a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2h8a2 2 0 012-2z" /></svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                    <p className="text-gray-600">Try adjusting your search or filter criteria</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Printing process & features & CTA kept as in your original layout */}
      {/* ... (you can reuse your existing Process/Features/CTA markup unchanged) */}
    </div>
  );
};

export default Printing;
