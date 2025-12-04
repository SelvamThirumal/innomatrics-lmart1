// src/Pages/EMarket.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// Firestore
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";

// Cart Context
import { useCart } from "../context/CartContext";

const PLACEHOLDER_IMAGE = "https://placehold.co/400x300?text=No+Image";

const safeString = (val) => {
  if (!val && val !== "") return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    return typeof val.name === "string" ? val.name : "";
  }
  return String(val);
};

const getDisplayPriceFromProduct = (product) => {
  const variant =
    Array.isArray(product.variants) && product.variants.length > 0
      ? product.variants[0]
      : null;

  const variantPrice =
    variant && Number(variant.price) ? Number(variant.price) : null;
  const variantOffer =
    variant && Number(variant.offerPrice) ? Number(variant.offerPrice) : null;

  const productPrice = Number(product.price) || 0;
  const productOffer = Number(product.offerPrice) || null;

  let price = variantPrice !== null ? variantPrice : productPrice;
  let offer =
    variantOffer !== null ? variantOffer : productOffer !== null
      ? productOffer
      : null;

  const final = offer && offer > 0 && offer < price ? offer : price;
  const original =
    offer && offer > 0 && offer < price ? price : 0;

  const discount =
    original > 0
      ? Math.round(((original - final) / original) * 100)
      : 0;

  return { final, original, discount, variant };
};

// Extract main categories
const extractMainCategories = (products) => {
  const set = new Set(["All Products"]);
  products.forEach((p) => {
    const cat = safeString(p.category);
    if (cat.trim()) set.add(cat.trim());
  });
  return Array.from(set);
};

// Extract subcategories for a specific main category
const extractSubcategories = (products, mainCategory) => {
  const set = new Set(["All"]);
  if (mainCategory === "All Products") {
    // For "All Products", show all subcategories
    products.forEach((p) => {
      const sub = safeString(p.subCategory) || 
                 safeString(p.subcategory) || 
                 safeString(p.subCategoryName);
      if (sub.trim()) set.add(sub.trim());
    });
  } else {
    // For specific main category, show only its subcategories
    products.forEach((p) => {
      const cat = safeString(p.category);
      if (cat.trim() === mainCategory) {
        const sub = safeString(p.subCategory) || 
                   safeString(p.subcategory) || 
                   safeString(p.subCategoryName);
        if (sub.trim()) set.add(sub.trim());
      }
    });
  }
  return Array.from(set);
};

const ProductCard = ({
  product,
  addToCart,
  getQuantity,
  updateQuantity,
  navigate,
}) => {
  const qty = getQuantity(product.id);
  const { final, original, discount } = getDisplayPriceFromProduct(product);

  const rating = product.rating || 4.3;

  const image =
    product.mainImageUrl ||
    product.image ||
    (Array.isArray(product.imageUrls) &&
      product.imageUrls[0]?.url) ||
    PLACEHOLDER_IMAGE;

  return (
    <div
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden cursor-pointer"
      onClick={() =>
        navigate(`/product/${product.id}`, { state: { product } })
      }
    >
      <div className="relative h-48">
        <img
          src={image}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = PLACEHOLDER_IMAGE;
          }}
        />

        {discount > 0 && (
          <span className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
            -{discount}%
          </span>
        )}

        {product.isNew && (
          <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
            New
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
          {product.name}
        </h3>

        <div className="flex items-center mb-3">
          <span className="text-sm font-medium text-yellow-500 mr-1">
            {rating.toFixed(1)}
          </span>
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(rating)
                    ? "text-yellow-400"
                    : "text-gray-300"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-start mb-4">
          <div>
            {original > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900">
                  ₹{final.toLocaleString()}
                </span>
                <span className="text-sm text-gray-500 line-through">
                  ₹{original.toLocaleString()}
                </span>
              </div>
            ) : (
              <span className="text-xl font-bold text-gray-900">
                ₹{final.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {qty > 0 ? (
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateQuantity(product.id, Math.max(0, qty - 1));
              }}
              className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"
            >
              -
            </button>
            <span className="flex-1 text-center font-medium">
              {qty} in Cart
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateQuantity(product.id, qty + 1);
              }}
              className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center"
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCart({
                ...product,
                id: product.id,
                quantity: 1,
              });
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

const MAX_SLIDER = 500000;

const EMarket = () => {
  const navigate = useNavigate();
  const cart = useCart();

  const [products, setProducts] = useState([]);
  const [mainCategories, setMainCategories] = useState(["All Products"]);
  const [selectedMainCategory, setSelectedMainCategory] = useState("All Products");
  const [subCategories, setSubCategories] = useState(["All"]);
  const [selectedSubCategory, setSelectedSubCategory] = useState("All");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Load products and extract categories
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
            rating: data.rating || 4.3,
            reviews: data.reviews || 10,
            image:
              data.mainImageUrl ||
              data.image ||
              (Array.isArray(data.imageUrls) &&
                data.imageUrls[0]?.url) ||
              "",
          };
        });

        setProducts(list);
        const mainCats = extractMainCategories(list);
        setMainCategories(mainCats);
        
        // Extract subcategories for initially selected category
        const subs = extractSubcategories(list, "All Products");
        setSubCategories(subs);

        // Calculate price range
        const maxPrice = list.reduce((mx, p) => {
          const { final } = getDisplayPriceFromProduct(p);
          return Math.max(mx, final || 0);
        }, 0);

        const ceilMax = Math.min(
          Math.ceil((maxPrice || 1000) / 1000) * 1000,
          MAX_SLIDER
        );

        setPriceRange([0, ceilMax || 10000]);
      } catch (e) {
        console.error("Failed to load products", e);
        setProducts([]);
        setMainCategories(["All Products"]);
        setSubCategories(["All"]);
        setPriceRange([0, MAX_SLIDER]);
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
    setSelectedSubCategory("All"); // Reset subcategory selection
  }, [selectedMainCategory, products]);

  const addToCart = (product) => cart.addToCart(product);
  const updateQuantity = (id, qty) => cart.updateQuantity(id, qty);
  const getQuantity = (id) =>
    cart.items.find((i) => i.id === id)?.quantity || 0;

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const cat = safeString(p.category).toLowerCase();
      const sub = safeString(p.subCategory).toLowerCase();
      const subCatName = safeString(p.subcategory).toLowerCase();
      const subCategoryName = safeString(p.subCategoryName).toLowerCase();
      
      const allSub = sub || subCatName || subCategoryName;

      // Check main category
      const mainCategoryMatch = 
        selectedMainCategory === "All Products" ||
        cat === selectedMainCategory.toLowerCase();

      // Check subcategory
      const subCategoryMatch = 
        selectedSubCategory === "All" ||
        allSub === selectedSubCategory.toLowerCase();

      // Check price
      const { final } = getDisplayPriceFromProduct(p);
      const priceMatch = final >= priceRange[0] && final <= priceRange[1];

      return mainCategoryMatch && subCategoryMatch && priceMatch;
    });
  }, [products, selectedMainCategory, selectedSubCategory, priceRange]);

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
      {/* Category Navbar */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex overflow-x-auto py-3 space-x-6">
            {mainCategories.map((category) => (
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
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <div className={`w-64 ${showFilters ? "block" : "hidden lg:block"}`}>
            <div className="bg-white p-4 rounded shadow-sm sticky top-20">
              {/* Subcategories Section */}
              <h3 className="text-lg font-semibold mb-3">Subcategories</h3>
              <div className="space-y-2 mb-6">
                {subCategories.map((subCat) => (
                  <label key={subCat} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={selectedSubCategory === subCat}
                      onChange={() => setSelectedSubCategory(subCat)}
                    />
                    <span className="text-sm">{subCat}</span>
                  </label>
                ))}
              </div>

              <hr className="my-4" />

              {/* Price Range Section */}
              <h3 className="text-sm font-medium mb-2">Price Range</h3>
              <div>
                <label className="text-xs text-gray-500">
                  Min: ₹{priceRange[0].toLocaleString()}
                </label>
                <input
                  type="range"
                  min="0"
                  max={MAX_SLIDER}
                  step="500"
                  value={priceRange[0]}
                  onChange={(e) => handlePriceChange(0, e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="mt-2">
                <label className="text-xs text-gray-500">
                  Max: ₹{priceRange[1].toLocaleString()}
                </label>
                <input
                  type="range"
                  min="0"
                  max={MAX_SLIDER}
                  step="500"
                  value={priceRange[1]}
                  onChange={(e) => handlePriceChange(1, e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {selectedMainCategory === "All Products"
                  ? "All Products"
                  : selectedMainCategory}
                {selectedSubCategory !== "All" && ` - ${selectedSubCategory}`}
              </h2>
              <div className="text-sm text-gray-600">
                {filteredProducts.length} products
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white p-8 rounded shadow text-center text-gray-500">
                No products found for the selected filters
              </div>
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
    </div>
  );
};

export default EMarket;