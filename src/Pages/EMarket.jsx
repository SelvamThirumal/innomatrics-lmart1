// src/Pages/EMarket.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// Firestore
import { db } from "../../firebase"; // <-- ensure this path is correct in your project
import { collection, getDocs } from "firebase/firestore";

// Cart Context (should provide addToCart, updateQuantity, removeFromCart, items, getCartTotal, getCartItemsCount)
import { useCart } from "../context/CartContext";

// -----------------------------
// Helpers
// -----------------------------
const PLACEHOLDER_IMAGE = "https://placehold.co/400x300?text=No+Image";

const safeString = (val) => {
  if (!val && val !== "") return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    // prefer .name if object
    return typeof val.name === "string" ? val.name : "";
  }
  return String(val);
};

const getDisplayPriceFromProduct = (product) => {
  // Prefer first variant price if present, else product price
  const variant = Array.isArray(product.variants) && product.variants.length > 0 ? product.variants[0] : null;
  const variantPrice = variant && Number(variant.price) ? Number(variant.price) : null;
  const variantOffer = variant && Number(variant.offerPrice) ? Number(variant.offerPrice) : null;

  const productPrice = Number(product.price) || 0;
  const productOffer = Number(product.offerPrice) || null;

  let price = variantPrice !== null ? variantPrice : productPrice;
  let offer = variantOffer !== null ? variantOffer : (productOffer !== null ? productOffer : null);

  // If offer exists and is lower than price, use it as final price
  const final = offer && offer > 0 && offer < price ? offer : price;
  const original = offer && offer > 0 && offer < price ? price : 0;
  const discount = original > 0 ? Math.round(((original - final) / original) * 100) : 0;

  return { final, original, discount, variant };
};

const extractCategories = (products) => {
  const set = new Set(["All Products"]);
  products.forEach((p) => {
    const cat = safeString(p.category);
    const sub = safeString(p.subCategory) || safeString(p.subcategory) || safeString(p.subCategoryName);
    if (cat.trim()) set.add(cat.trim());
    if (sub.trim()) set.add(sub.trim());
  });
  return Array.from(set);
};

// -----------------------------
// ProductCard
// -----------------------------
const ProductCard = ({ product, addToCart, getQuantity, updateQuantity, navigate }) => {
  const qty = getQuantity(product.id);
  const { final, original, discount, variant } = getDisplayPriceFromProduct(product);

  // Short description: first 4 letters then "..."
  const shortDescription = product.description ? product.description.substring(0, 4) + "..." : "";

  const image = product.mainImageUrl || product.image || (Array.isArray(product.imageUrls) && product.imageUrls[0]?.url) || PLACEHOLDER_IMAGE;

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden cursor-pointer" onClick={() => navigate(`/product/${product.id}`, { state: { product } })}>
      <div className="relative h-48">
        <img
          src={image}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }}
        />
        {discount > 0 && (
          <span className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">-{discount}%</span>
        )}
        {product.isNew && (
          <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">New</span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>

        {product.description && <p className="text-gray-600 text-sm mb-3">{shortDescription}</p>}

        <div className="flex items-center justify-between mb-3">
          <div>
            {original > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-red-600">₹{final.toLocaleString()}</span>
                <span className="text-sm text-gray-500 line-through">₹{original.toLocaleString()}</span>
              </div>
            ) : (
              <span className="text-lg font-bold text-gray-900">₹{final.toLocaleString()}</span>
            )}
          </div>

          <div className="text-sm text-green-600">
            {product.deliveryTime ? product.deliveryTime : ""}
          </div>
        </div>

        {variant && variant.size && (
          <div className="mb-3">
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">Size: {variant.size}</span>
            {variant.stock !== undefined && (
              <span className={`text-xs ml-2 px-2 py-1 rounded ${variant.stock > 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                {variant.stock > 0 ? `Stock: ${variant.stock}` : "Out of Stock"}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {qty > 0 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, Math.max(0, qty - 1)); }}
                className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"
              >-</button>
              <span>{qty}</span>
              <button
                onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, qty + 1); }}
                className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center"
              >+</button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); addToCart({ ...product, id: product.id }); }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
            >
              Add to Cart
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}`, { state: { product } }); }}
            className="p-2 text-gray-500 hover:text-blue-600"
            aria-label="view"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// -----------------------------
// CartSidebar
// -----------------------------
const CartSidebar = ({ isOpen, onClose, cart }) => {
  const { items, updateQuantity, removeFromCart, getCartTotal } = cart;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="ml-auto w-full max-w-md bg-white shadow-xl h-full overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Cart ({items.length})</h3>
          <button onClick={onClose} className="text-gray-600">Close</button>
        </div>

        <div className="p-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center text-gray-500">Your cart is empty</div>
          ) : (
            items.map((it) => {
              const displayPrice = it.offerPrice && it.offerPrice < it.price ? it.offerPrice : it.price;
              return (
                <div key={it.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded">
                  <img src={it.image || PLACEHOLDER_IMAGE} className="w-16 h-16 object-cover rounded" alt={it.name} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{it.name}</div>
                    <div className="text-xs text-gray-500">({it.quantity} x ₹{displayPrice.toLocaleString()})</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(it.id, Math.max(0, it.quantity - 1))} className="w-7 h-7 rounded bg-gray-200">-</button>
                    <span>{it.quantity}</span>
                    <button onClick={() => updateQuantity(it.id, it.quantity + 1)} className="w-7 h-7 rounded bg-blue-600 text-white">+</button>
                  </div>

                  <button onClick={() => removeFromCart(it.id)} className="text-red-500 ml-2">🗑️</button>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t">
            <div className="flex justify-between mb-4">
              <span className="font-semibold">Total</span>
              <span className="font-bold">₹{getCartTotal().toLocaleString()}</span>
            </div>
            <div className="space-y-2">
              <button className="w-full bg-blue-600 text-white py-3 rounded">Checkout</button>
              <button onClick={onClose} className="w-full bg-gray-200 py-2 rounded">Continue shopping</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// -----------------------------
// Main EMarket component
// -----------------------------
const MAX_SLIDER = 500000;
const EMarket = () => {
  const navigate = useNavigate();
  const cart = useCart();

  // UI state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(["All Products"]);
  const [selectedCategory, setSelectedCategory] = useState("All Products");
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [loading, setLoading] = useState(true);

  const [showFilters, setShowFilters] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Fetch all products from Firestore once
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const ref = collection(db, "products");
        const snap = await getDocs(ref);
        const list = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            ...data,
            id: d.id,
            image: data.mainImageUrl || data.image || (Array.isArray(data.imageUrls) && data.imageUrls[0]?.url) || "",
            // keep original fields like variants, category etc
          };
        });

        setProducts(list);

        // compute categories
        const cats = extractCategories(list);
        setCategories(cats);

        // compute max price for slider
        const maxPrice = list.reduce((mx, p) => {
          const { final } = getDisplayPriceFromProduct(p);
          return Math.max(mx, final || 0);
        }, 0);

        const ceilMax = Math.min(Math.ceil((maxPrice || 1000) / 1000) * 1000, MAX_SLIDER);
        setPriceRange([0, ceilMax || 10000]);
      } catch (e) {
        console.error("Failed to load products", e);
        setProducts([]);
        setCategories(["All Products"]);
        setPriceRange([0, MAX_SLIDER]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Cart helpers (wrap context functions)
  const addToCart = (product) => cart.addToCart(product);
  const updateQuantity = (id, qty) => cart.updateQuantity(id, qty);
  const getQuantity = (id) => (cart.items.find((i) => i.id === id)?.quantity || 0);

  // Filtering logic (safe handling of category/subcategory)
  const filteredProducts = useMemo(() => {
    const selLower = (selectedCategory || "").toLowerCase();

    return products.filter((p) => {
      // category/subcategory normalization
      const cat = safeString(p.category).toLowerCase();
      const sub = (safeString(p.subCategory) || safeString(p.subcategory)).toLowerCase();

      const categoryMatch = selectedCategory === "All Products" || cat === selLower || sub === selLower;

      const name = safeString(p.name).toLowerCase();
      const searchMatch = name.includes((searchTerm || "").toLowerCase());

      const { final } = getDisplayPriceFromProduct(p);
      const priceMatch = final >= priceRange[0] && final <= priceRange[1];

      return categoryMatch && searchMatch && priceMatch;
    });
  }, [products, selectedCategory, searchTerm, priceRange]);

  const handlePriceChange = (index, value) => {
    const v = Number(value) || 0;
    const copy = [...priceRange];
    copy[index] = v;
    // enforce min <= max
    if (copy[0] > copy[1]) {
      if (index === 0) copy[1] = copy[0];
      else copy[0] = copy[1];
    }
    setPriceRange(copy);
  };

  // UI
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <h1 className="text-2xl font-bold">E-Market</h1>

          <div className="flex-1">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full max-w-2xl px-4 py-2 rounded border"
            />
          </div>

          <button onClick={() => setShowFilters(!showFilters)} className="bg-blue-600 text-white px-3 py-2 rounded">Filters</button>
          <button onClick={() => setIsCartOpen(true)} className="bg-green-600 text-white px-3 py-2 rounded">Cart ({cart.getCartItemsCount()})</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar filters */}
          <div className={`w-64 ${showFilters ? "block" : "hidden lg:block"}`}>
            <div className="bg-white p-4 rounded shadow-sm sticky top-20">
              <h3 className="text-lg font-semibold mb-3">Categories</h3>
              <div className="space-y-2">
                {categories.map((c) => (
                  <label key={c} className="flex items-center gap-2">
                    <input type="radio" checked={selectedCategory === c} onChange={() => setSelectedCategory(c)} />
                    <span className="text-sm">{c}</span>
                  </label>
                ))}
              </div>

              <hr className="my-4" />

              <h3 className="text-sm font-medium mb-2">Price Range</h3>
              <div>
                <label className="text-xs text-gray-500">Min: ₹{priceRange[0].toLocaleString()}</label>
                <input type="range" min="0" max={MAX_SLIDER} step="500" value={priceRange[0]} onChange={(e) => handlePriceChange(0, e.target.value)} className="w-full" />
              </div>
              <div className="mt-2">
                <label className="text-xs text-gray-500">Max: ₹{priceRange[1].toLocaleString()}</label>
                <input type="range" min="0" max={MAX_SLIDER} step="500" value={priceRange[1]} onChange={(e) => handlePriceChange(1, e.target.value)} className="w-full" />
              </div>
            </div>
          </div>

          {/* Products grid */}
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{selectedCategory === "All Products" ? "All Products" : selectedCategory}</h2>
              <div className="text-sm text-gray-600">{filteredProducts.length} products</div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white p-8 rounded shadow text-center text-gray-500">No products found</div>
            ) : (
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((p) => (
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

      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} cart={cart} />
    </div>
  );
};

export default EMarket;
