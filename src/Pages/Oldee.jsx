import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";

// NOTE: You must update these paths based on your actual file structure
// Assuming 'db' (initialized Firestore instance) and 'useCart' are available
import { db } from "../../firebase"; 
import { useCart } from "../context/CartContext"; 

// ---------------- HELPERS ----------------

const getMainImageUrl = (product) => {
  if (product.mainImageUrl) return product.mainImageUrl;
  if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
    const main = product.imageUrls.find(x => x.isMain);
    return (main?.url || product.imageUrls[0].url);
  }
  return "https://placehold.co/400x300?text=No+Image";
};

const pickVariant = (product) => {
  if (!Array.isArray(product.variants)) return null;
  return product.variants.find(v => Number(v.price) > 0) || product.variants[0] || null;
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


// ---------------- PRODUCT CARD COMPONENT ----------------

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
      {/* Image */}
      <div className="relative h-48">
        <img
          src={product.image}
          alt={product.name}
          className="object-cover w-full h-full"
          onError={(e) => (e.target.src = "https://placehold.co/400x300?text=No+Image")}
        />

        {discount > 0 && (
          <span className="absolute top-3 right-3 bg-red-600 text-white text-xs px-2 py-1 rounded">
            -{discount}%
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium mb-2 line-clamp-2 h-12">{product.name}</h3>

        {/* Rating */}
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

        {/* Price */}
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


// ---------------- MAIN COMPONENT (Oldee) ----------------

const Oldee = () => { // **Component name is now Oldee**
  const navigate = useNavigate();
  const { items = [], addToCart, updateQuantity } = useCart(); 

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const getQuantity = (id) => {
    const item = items.find(i => i.id === id);
    return item ? item.quantity : 0;
  };

  // ---------------- FETCH PRODUCTS ----------------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const productsRef = collection(db, "products");
        
        // Filter all products where productTag == "Oldee"
        const q = query(productsRef, where("productTag", "==", "Oldee"));
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
            rating: data.rating || 4.3,
          };
        });

        setProducts(list);
      } catch (err) {
        console.error("Oldee Listing Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []); 

  // ---------------- RENDER ----------------
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex-1">
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold text-gray-900">Oldee Collection</h1>
            <p className="text-lg text-gray-500">
              {loading ? "Loading..." : `${products.length} exclusive products`}
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-10 text-gray-500">
              Loading Oldee products…
            </div>
          )}

          {/* No Products Found */}
          {!loading && products.length === 0 && (
            <div className="bg-white border rounded-lg shadow-sm text-center py-10 text-gray-500">
              No products found in the "Oldee" collection.
            </div>
          )}

          {/* Products Grid */}
          {!loading && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((p) => (
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
  );
};

export default Oldee; // **Export name is now Oldee**