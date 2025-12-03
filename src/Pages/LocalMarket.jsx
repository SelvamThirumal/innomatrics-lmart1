import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApps, getApp, initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { useCart } from "../context/CartContext";

// ---------------- FIREBASE INIT ----------------
const firebaseConfig =
  typeof __firebase_config !== "undefined" ? JSON.parse(__firebase_config) : {};
const appName = (typeof __app_id !== "undefined" && __app_id) ? `lm-${__app_id}` : "[DEFAULT]";

const app = getApps().find(a => a.name === appName) || initializeApp(firebaseConfig, appName);
const db = getFirestore(app);

// ---------------- HELPERS ----------------

// Get main image
const getMainImageUrl = (product) => {
  if (product.mainImageUrl) return product.mainImageUrl;

  if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
    const main = product.imageUrls.find(x => x.isMain);
    return (main?.url || product.imageUrls[0].url);
  }

  return "https://placehold.co/400x300?text=No+Image";
};

// Pick valid variant
const pickVariant = (product) => {
  if (!Array.isArray(product.variants)) return null;
  return product.variants.find(v => Number(v.price) > 0) || product.variants[0] || null;
};

// Compute display price / discount
const getPriceData = (product) => {
  const variant = pickVariant(product);
  const price = variant ? Number(variant.price || 0) : Number(product.price || 0);
  const offer = variant?.offerPrice ? Number(variant.offerPrice) : 0;

  const finalPrice = offer && offer < price ? offer : price;
  const original = offer && offer < price ? price : 0;

  const discount = original > 0 ? Math.round(((original - finalPrice) / original) * 100) : 0;

  return { finalPrice, original, discount, variant };
};

// Extract unique categories
const extractCategories = (products) => {
  const set = new Set(["All Products"]);
  products.forEach(p => {
    if (p.category?.name) set.add(p.category.name);
    if (p.subCategory?.name) set.add(p.subCategory.name);
    if (p.productTag) set.add(p.productTag);
  });
  return [...set];
};

// ---------------- MAIN COMPONENT ----------------
const LocalMarket = () => {
  const navigate = useNavigate();
  const { items = [], addToCart, updateQuantity } = useCart();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(["All Products"]);
  const [selectedCategory, setSelectedCategory] = useState("All Products");
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);

  const getQuantity = (id) => {
    const item = items.find(i => i.id === id);
    return item ? item.quantity : 0;
  };

  // ---------------- FETCH PRODUCTS (FINAL FIX) ----------------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const productsRef = collection(db, "products");
        const q = query(productsRef, where("productTag", "==", "Local Market"));
        const snap = await getDocs(q);

        const list = snap.docs.map(doc => {
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
          };
        });

        setProducts(list);
        setCategories(extractCategories(list));

        const maxPrice = Math.max(...list.map(p => p.price || 0), 1000);
        setPriceRange([0, Math.ceil(maxPrice / 1000) * 1000]);
      } catch (err) {
        console.error("Local Market Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ---------------- FILTERING ----------------
  const filtered = products.filter(p => {
    const name = (p.name || "").toLowerCase();
    const description = (p.description || "").toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || 
                         description.includes(searchTerm.toLowerCase());

    const cat = (p.category?.name || p.subCategory?.name || p.productTag || "").toLowerCase();
    const matchCategory = selectedCategory === "All Products" || cat === selectedCategory.toLowerCase();

    const price = p.price || 0;
    const matchPrice = price >= priceRange[0] && price <= priceRange[1];

    return matchesSearch && matchCategory && matchPrice;
  });

  // Function to truncate description to first 4 characters
  const getTruncatedDescription = (description) => {
    if (!description) return "";
    const trimmed = description.trim();
    if (trimmed.length <= 4) return trimmed;
    return trimmed.substring(0, 4) + "...";
  };

  // ---------------- RENDER ----------------
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Local Market</h1>

        <div className="hidden sm:block">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded-lg px-3 py-2 w-64"
          />
        </div>

        <button
          className="bg-purple-600 text-white px-3 py-2 rounded-lg"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {/* Layout */}
      <div className="max-w-7xl mx-auto px-4 flex gap-6">

        {/* Sidebar Filters */}
        {showFilters && (
          <div className="w-64 bg-white p-4 rounded-lg shadow-sm border">
            <h2 className="font-semibold mb-3">Filters</h2>

            {/* Category */}
            <h3 className="text-sm font-medium mb-2">Category</h3>
            <div className="space-y-2 mb-6">
              {categories.map(cat => (
                <label key={cat} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === cat}
                    onChange={() => setSelectedCategory(cat)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{cat}</span>
                </label>
              ))}
            </div>

            {/* Price Range */}
            <h3 className="text-sm font-medium mb-2">Price Range</h3>

            <span className="text-xs text-gray-500">
              Min Price (₹ {priceRange[0]})
            </span>
            <input
              type="range"
              min="0"
              max="100000"
              step="100"
              value={priceRange[0]}
              onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
              className="w-full"
            />

            <span className="text-xs text-gray-500 mt-4 block">
              Max Price (₹ {priceRange[1]})
            </span>
            <input
              type="range"
              min="0"
              max="100000"
              step="100"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
              className="w-full"
            />
          </div>
        )}

        {/* Products Area */}
        <div className="flex-1">

          {/* Tabs */}
          <div className="hidden sm:flex space-x-8 border-b mb-6">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`py-3 border-b-2 ${
                  selectedCategory === cat
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500"
                }`}
              >
                {cat}
              </button>
            ))}
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
              No products found  
              <p className="text-gray-400 text-sm">Try adjusting search or filters.</p>
            </div>
          )}

          {/* Products Grid */}
          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

              {filtered.map(p => {
                const qty = getQuantity(p.id);
                const truncatedDesc = getTruncatedDescription(p.description);

                return (
                  <div key={p.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition border cursor-default">

                    {/* Image */}
                    <div onClick={() => navigate(`/product/${p.id}`, { state: { product: p } })} className="relative h-48">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="object-cover w-full h-full"
                        onError={(e) => (e.target.src = "https://placehold.co/400x300?text=No+Image")}
                      />

                      {p.discount > 0 && (
                        <span className="absolute top-3 right-3 bg-red-600 text-white text-xs px-2 py-1 rounded">
                          -{p.discount}%
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-medium mb-2 line-clamp-2 h-12">{p.name}</h3>

                      {/* DESCRIPTION SHOWS ONLY FIRST 4 CHARACTERS */}
                      {truncatedDesc && (
                        <div className="mb-2">
                          <p className="text-gray-600 text-sm h-6">
                            <span title={p.description || ""}>
                              {truncatedDesc}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Click product to see full description
                          </p>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 mb-2">
                        {p.originalPrice > p.price ? (
                          <>
                            <span className="text-red-600 font-semibold text-lg">₹ {p.price}</span>
                            <span className="line-through text-gray-500">₹ {p.originalPrice}</span>
                          </>
                        ) : (
                          <span className="text-gray-900 font-bold text-lg">₹ {p.price}</span>
                        )}
                      </div>

                      {p.variant && (
                        <div className="mb-3">
                          {p.variant.size && (
                            <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs mr-2">
                              Size: {p.variant.size}
                            </span>
                          )}
                          {p.variant.stock !== undefined && (
                            <span className={`px-2 py-1 rounded text-xs ${
                              p.variant.stock > 0
                                ? "bg-green-100 text-green-600"
                                : "bg-red-100 text-red-600"
                            }`}>
                              {p.variant.stock > 0
                                ? `Stock: ${p.variant.stock}`
                                : "Out of Stock"}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Add To Cart */}
                      {qty > 0 ? (
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => updateQuantity(p.id, qty - 1)}
                            className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"
                          >
                            -
                          </button>

                          <span>{qty}</span>

                          <button
                            onClick={() => updateQuantity(p.id, qty + 1)}
                            className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart({ id: p.id, ...p, quantity: 1 })}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium"
                        >
                          + Add to Cart
                        </button>
                      )}

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default LocalMarket;