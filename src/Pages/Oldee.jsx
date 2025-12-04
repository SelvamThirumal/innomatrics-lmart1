import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

const Oldee = ({ productId }) => {
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch Product from Firebase
  useEffect(() => {
    const fetchProductData = async () => {
      try {
        const ref = doc(db, "products", productId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setProduct(data);

          // auto-select first variant
          if (data.variants?.length > 0) {
            setSelectedVariant(data.variants[0]);
          }
        }
      } catch (error) {
        console.error("ERROR loading product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [productId]);

  if (loading) return <p className="text-center p-4">Loading...</p>;
  if (!product) return <p className="text-center p-4 text-red-500">Product Not Found</p>;

  const isAvailable = selectedVariant?.stock > 0;

  const formatPrice = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(n);

  return (
    <div className="max-w-sm mx-auto my-6 bg-white shadow-lg rounded-xl overflow-hidden relative">

      {/* 🔥 SHOW PRODUCT TAG FROM FIREBASE */}
      {product.productTag && (
        <span className="absolute top-0 right-0 mt-3 mr-3 px-3 py-1 text-xs font-bold text-white bg-amber-600 rounded-full shadow-md">
          {product.productTag}
        </span>
      )}

      {/* IMAGE */}
      <div className="h-56 overflow-hidden relative">
        <img
          src={product.mainImageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
        />

        {/* STOCK BADGE */}
        <span
          className={`absolute bottom-2 left-2 px-3 py-1 text-xs font-semibold rounded-md text-white ${
            isAvailable ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {isAvailable ? "In Stock" : "Out of Stock"}
        </span>
      </div>

      {/* CONTENT */}
      <div className="p-4">

        <h2 className="text-xl font-bold text-gray-800">{product.name}</h2>

        <p className="text-gray-500 text-sm mt-1">
          Brand: <b>{product.brand}</b>
        </p>

        <p className="text-gray-700 text-sm mt-2 mb-3">{product.description}</p>

        {/* PRICE */}
        <div className="flex items-baseline gap-2 my-2">
          <span className="text-3xl font-extrabold text-red-600">
            {formatPrice(selectedVariant.offerPrice)}
          </span>

          <span className="text-base text-gray-400 line-through">
            {formatPrice(selectedVariant.price)}
          </span>
        </div>

        {/* VARIANTS */}
        <div className="my-3">
          <h4 className="font-semibold text-sm mb-1">Select Variant:</h4>
          <div className="flex gap-2">
            {product.variants?.map((v) => (
              <button
                key={v.variantId}
                onClick={() => setSelectedVariant(v)}
                className={`px-3 py-1 text-sm rounded-lg border ${
                  selectedVariant.variantId === v.variantId
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {v.color} - {v.size}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-700 mb-3">
          Stock: <b>{selectedVariant.stock} units</b>
        </p>

        {/* ADD TO CART */}
        <button
          disabled={!isAvailable}
          className={`w-full py-2 rounded-lg font-semibold ${
            isAvailable
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-400 text-gray-700 cursor-not-allowed"
          }`}
        >
          {isAvailable ? "Add to Cart" : "Notify Me"}
        </button>
      </div>
    </div>
  );
};

export default Oldee;
