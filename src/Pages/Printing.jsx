import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";

import { getApps, initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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
const PLACEHOLDER_IMAGE = "https://placehold.co/400x300?text=No+Image";

const getMainImageUrl = (product) => {
  if (product.mainImageUrl) return product.mainImageUrl;
  if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
    const main = product.imageUrls.find((i) => i.isMain) || product.imageUrls[0];
    return main?.url || PLACEHOLDER_IMAGE;
  }
  return product.image || product.imageUrl || PLACEHOLDER_IMAGE;
};

const pickVariant = (product) => {
  if (!Array.isArray(product.variants) || product.variants.length === 0) return null;
  const found = product.variants.find((v) => Number(v.price) > 0);
  return found || product.variants[0] || null;
};

const getPriceData = (product) => {
  const variant = pickVariant(product);
  const price = variant ? Number(variant.price || 0) : Number(product.price || 0);
  const offer = variant?.offerPrice ? Number(variant.offerPrice) : 0;

  const finalPrice = offer && offer < price ? offer : price;
  const original = offer && offer < price ? price : 0;

  const discount = original > 0 ? Math.round(((original - finalPrice) / original) * 100) : 0;

  return { finalPrice, original, discount, variant };
};

const keywordMatches = (text, query) => {
  if (!text || !query) return false;
  return String(text).toLowerCase().includes(query.toLowerCase());
};

// Extract main categories
const extractMainCategories = (products) => {
  const set = new Set(["All Products"]);
  products.forEach(p => {
    if (p.category?.name) set.add(p.category.name);
  });
  return [...set];
};

// Extract subcategories for a specific main category
const extractSubcategories = (products, mainCategory) => {
  const set = new Set(["All"]);
  if (mainCategory === "All Products") {
    products.forEach(p => {
      if (p.subCategory?.name) set.add(p.subCategory.name);
    });
  } else {
    products.forEach(p => {
      if (p.category?.name === mainCategory && p.subCategory?.name) {
        set.add(p.subCategory.name);
      }
    });
  }
  return [...set];
};

/* --------------------- Product Card Component --------------------- */
const ProductCard = ({ product, addToCart, getQuantity, updateQuantity, navigate }) => {
  const qty = getQuantity(product.id);
  const { finalPrice, original, discount } = getPriceData(product);
  const rating = product.rating || 4.3;

  return (
    <div
      key={product.id}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition border cursor-pointer"
      onClick={() => navigate(`/product/${product.id}`, { state: { product } })}
    >
      <div className="relative h-48">
        <img
          src={product.image}
          alt={product.name}
          className="object-cover w-full h-full"
          onError={(e) => (e.target.src = PLACEHOLDER_IMAGE)}
        />

        {discount > 0 && (
          <span className="absolute top-3 right-3 bg-red-600 text-white text-xs px-2 py-1 rounded">
            -{discount}%
          </span>
        )}

        {product.isNew && (
          <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs px-2 py-1 rounded">
            New
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-medium mb-2 line-clamp-2 h-12">{product.name}</h3>

        <div className="flex items-center mb-3">
          <span className="text-sm font-medium text-yellow-500 mr-1">
            {rating.toFixed(1)}
          </span>
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-4 h-4 ${i < Math.floor(rating) ? "text-yellow-400" : "text-gray-300"}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8-2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2 mb-4">
          {original > finalPrice ? (
            <>
              <span className="text-red-600 font-semibold text-lg">₹ {finalPrice}</span>
              <span className="line-through text-gray-500">₹ {original}</span>
            </>
          ) : (
            <span className="text-gray-900 font-bold text-lg">₹ {finalPrice}</span>
          )}
        </div>

        {/* Add To Cart */}
        {qty > 0 ? (
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateQuantity(product.id, qty - 1);
              }}
              className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"
            >
              -
            </button>
            <span className="flex-1 text-center font-medium">{qty} in Cart</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateQuantity(product.id, qty + 1);
              }}
              className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center"
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCart({ id: product.id, ...product, quantity: 1 });
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium"
          >
            + Add to Cart
          </button>
        )}
      </div>
    </div>
  );
};

/* --------------------- Main Component --------------------- */
const MAX_SLIDER = 100000;

const Printing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items = [], addToCart, updateQuantity } = useCart();

  const [products, setProducts] = useState([]);
  const [mainCategories, setMainCategories] = useState(["All Products"]);
  const [selectedMainCategory, setSelectedMainCategory] = useState("All Products");
  const [subCategories, setSubCategories] = useState(["All"]);
  const [selectedSubCategory, setSelectedSubCategory] = useState("All");
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // 👇 Extract Search Query from URL
  const searchQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("q") || "";
  }, [location.search]);

  const getQuantity = (id) => {
    const item = items.find(i => i.id === id);
    return item ? item.quantity : 0;
  };

  // ---------------- FETCH PRODUCTS (SAME FORMAT AS EMarket) ----------------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const productsRef = collection(db, "products");
        const snap = await getDocs(productsRef);

        const allProducts = snap.docs.map(doc => {
          const data = doc.data();
          const img = getMainImageUrl(data);
          const { finalPrice, original, discount, variant } = getPriceData(data);

          return {
            ...data,
            id: doc.id,
            image: img,
            price: finalPrice,
            originalPrice: original,
            discount,
            variant,
            rating: data.rating || 4.3,
          };
        });

        // 🛠️ Filter products where productTag is "Printing"
        const printingProducts = allProducts.filter(product => {
          const productTag = product.productTag;
          
          // Handle both string and object formats
          if (typeof productTag === 'string') {
            return productTag.toLowerCase() === 'printing';
          } else if (productTag && typeof productTag === 'object') {
            return productTag.name?.toLowerCase() === 'printing';
          }
          return false;
        });

        setProducts(printingProducts);
        const mainCats = extractMainCategories(printingProducts);
        setMainCategories(mainCats);

        // Extract subcategories for initially selected category
        const subs = extractSubcategories(printingProducts, "All Products");
        setSubCategories(subs);

        const maxPrice = Math.max(...printingProducts.map(p => p.price || 0), 1000);
        setPriceRange([0, Math.min(Math.ceil(maxPrice / 1000) * 1000, MAX_SLIDER)]);
      } catch (err) {
        console.error("Printing Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Update subcategories when main category changes
  useEffect(() => {
    const subs = extractSubcategories(products, selectedMainCategory);
    setSubCategories(subs);
    // Reset subcategory selection only if no search is active
    if (!searchQuery) {
      setSelectedSubCategory("All");
    }
  }, [selectedMainCategory, products, searchQuery]);

  // ---------------- FILTERING ----------------
  const filtered = useMemo(() => {
    const queryTerm = searchQuery.trim().toLowerCase();

    return products.filter(p => {
      const cat = p.category?.name || "";
      const sub = p.subCategory?.name || "";

      // Check price filter (always apply)
      const price = p.price || 0;
      const priceMatch = price >= priceRange[0] && price <= priceRange[1];

      // 👇 Check search query filter
      const searchMatch = !queryTerm || (
        keywordMatches(p.name, queryTerm) ||
        keywordMatches(p.description, queryTerm) ||
        (Array.isArray(p.searchKeywords) && p.searchKeywords.some(keyword => keywordMatches(keyword, queryTerm))) ||
        keywordMatches(p.category?.name, queryTerm) ||
        keywordMatches(p.subCategory?.name, queryTerm)
      );

      // Check category filters (only apply if NO search query is present)
      if (queryTerm) {
        // If searching, only price and search must match. Ignore category filters.
        return priceMatch && searchMatch;
      } else {
        // If not searching, all filters must match.
        const mainCategoryMatch =
          selectedMainCategory === "All Products" ||
          cat === selectedMainCategory;

        const subCategoryMatch =
          selectedSubCategory === "All" ||
          sub === selectedSubCategory;

        return priceMatch && mainCategoryMatch && subCategoryMatch;
      }
    });
  }, [products, selectedMainCategory, selectedSubCategory, priceRange, searchQuery]);

  const handlePriceChange = (index, value) => {
    const v = Number(value) || 0;
    const copy = [...priceRange];
    copy[index] = v;

    if (copy[0] > copy[1]) {
      if (index === 0) copy[1] = copy[0];
      else copy[0] = copy[1];
    }

    setPriceRange(copy);
  };

  // small helpers for WhatsApp / call
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

      {/* Category Navbar */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex overflow-x-auto py-3 space-x-6">
            {/* 👇 Hide category buttons if a search is active */}
            {!searchQuery ? (
              mainCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedMainCategory(category)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg transition ${
                    selectedMainCategory === category
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category}
                </button>
              ))
            ) : (
              // 👇 Show search term instead of categories
              <h2 className="text-xl font-semibold py-2">
                Search Results for: <span className="text-blue-600">"{searchQuery}"</span>
              </h2>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <div className="w-64 bg-white p-4 rounded-lg shadow-sm border sticky top-20">
            <h2 className="font-semibold mb-3">Filters</h2>

            {/* Subcategories */}
            <h3 className="text-sm font-medium mb-2">Subcategories</h3>
            <div className="space-y-2 mb-6">
              {subCategories.map((subCat) => (
                <label key={subCat} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="subcategory"
                    checked={selectedSubCategory === subCat}
                    onChange={() => setSelectedSubCategory(subCat)}
                  />
                  <span className="text-sm">{subCat}</span>
                </label>
              ))}
            </div>

            <hr className="my-4" />

            {/* Price Range - SINGLE SLIDER WITH MIN/MAX DISPLAY */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-4">Price Range</h3>

              {/* Min/Max Price Display */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Min</div>
                  <div className="text-sm font-medium">₹{priceRange[0]}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Max</div>
                  <div className="text-sm font-medium">₹{priceRange[1]}</div>
                </div>
              </div>

              {/* Single Range Slider Container */}
              <div className="relative pt-1 mb-2">
                {/* Min Price Slider */}
                <input
                  type="range"
                  min="0"
                  max={MAX_SLIDER}
                  value={priceRange[0]}
                  onChange={(e) => handlePriceChange(0, e.target.value)}
                  className="absolute w-full h-2 bg-transparent appearance-none pointer-events-auto z-10"
                  style={{ WebkitAppearance: 'none' }}
                />
                {/* Max Price Slider */}
                <input
                  type="range"
                  min="0"
                  max={MAX_SLIDER}
                  value={priceRange[1]}
                  onChange={(e) => handlePriceChange(1, e.target.value)}
                  className="absolute w-full h-2 bg-transparent appearance-none pointer-events-auto z-20"
                  style={{ WebkitAppearance: 'none' }}
                />
                {/* Track Background */}
                <div className="h-2 bg-gray-200 rounded-full"></div>
                {/* Active Range */}
                <div
                  className="absolute top-0 h-2 bg-blue-500 rounded-full"
                  style={{
                    left: `${(priceRange[0] / MAX_SLIDER) * 100}%`,
                    width: `${((priceRange[1] - priceRange[0]) / MAX_SLIDER) * 100}%`
                  }}
                ></div>
              </div>

              {/* Price Labels */}
              <div className="flex justify-between text-xs text-gray-500">
                <span>₹0</span>
                <span>₹{MAX_SLIDER.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Products Area */}
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {/* 👇 Update Title based on search query */}
                {searchQuery
                  ? `Results for "${searchQuery}"`
                  : selectedMainCategory === "All Products"
                  ? "All Printing Services"
                  : selectedMainCategory}
                {!searchQuery && selectedSubCategory !== "All" && ` - ${selectedSubCategory}`}
              </h2>
              <div className="text-sm text-gray-600">
                {filtered.length} products
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="text-center py-10 text-gray-500">
                Loading products…
              </div>
            )}

            {/* No Products */}
            {!loading && filtered.length === 0 && (
              <div className="bg-white border rounded-lg shadow-sm text-center py-10 text-gray-500">
                {searchQuery
                  ? `No products found matching "${searchQuery}"`
                  : "No products found"}
                <p className="text-gray-400 text-sm">Try adjusting your filters.</p>
              </div>
            )}

            {/* Products Grid */}
            {!loading && filtered.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filtered.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    addToCart={addToCart}
                    updateQuantity={updateQuantity}
                    getQuantity={getQuantity}
                    navigate={navigate}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Printing;