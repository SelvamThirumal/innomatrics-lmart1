import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

/* ============================================
   OldeeProductDetails Component
   - Displays full information for a single product
   - Includes Buy Now button that redirects to Checkout
============================================ */
const OldeeProductDetails = ({ product, onBack, onEdit }) => {
  const navigate = useNavigate();

  if (!product) {
    return (
      <div className="p-8 text-center">
        <h3 className="text-xl font-bold text-red-600">Product Not Found</h3>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-200 rounded-lg">
          Go Back
        </button>
      </div>
    );
  }

  const {
    name,
    price,
    offerPrice,
    description,
    imageURLs = [],
    contactNumber,
    address,
    negotiation,
    status,
    seller,
    createdAt,
  } = product;

  const priceNum = Number(price || 0);
  const offerPriceNum =
    offerPrice !== undefined && offerPrice !== null ? Number(offerPrice) : null;
  const hasDiscount = offerPriceNum !== null && offerPriceNum < priceNum;
  const finalPrice = hasDiscount ? offerPriceNum : priceNum;

  // 🛒 Handle Buy Now button click
  const handleBuyNow = () => {
    navigate("/checkout", {
      state: {
        item: product, // send selected product data
        buyNow: true, // flag for Buy Now mode
        skipToPayment: false, // start from customization
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 overflow-auto p-4 md:p-8"
    >
      <div className="max-w-5xl mx-auto bg-white p-6 md:p-10 rounded-2xl shadow-2xl border border-gray-100">
        {/* Header and Back Button */}
        <div className="flex justify-between items-start border-b pb-4 mb-6">
          <h1 className="text-4xl font-extrabold text-gray-900">{name}</h1>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition"
          >
            ← Back to Marketplace
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Images Gallery */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              {imageURLs.length > 0 && (
                <img
                  src={imageURLs[0]}
                  alt={name}
                  className="w-full h-96 object-cover rounded-xl shadow-lg"
                />
              )}
            </div>
            {imageURLs.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {imageURLs.slice(1).map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`${name} - ${index + 2}`}
                    className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Details & Pricing */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                Status: {status?.toUpperCase() || "UNKNOWN"}
              </span>
              <span className="ml-3 px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-700">
                {negotiation
                  ? negotiation.charAt(0).toUpperCase() + negotiation.slice(1)
                  : "N/A"}
              </span>
            </div>

            <div className="flex items-end space-x-3">
              <span className="text-5xl font-bold text-gray-900">₹{finalPrice}</span>
              {hasDiscount && (
                <span className="text-2xl line-through text-red-500">₹{priceNum}</span>
              )}
            </div>
            {hasDiscount && (
              <p className="text-lg font-medium text-emerald-700">
                Save ₹{priceNum - offerPriceNum}!
              </p>
            )}

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-xl font-bold mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{description}</p>
            </div>
          </div>
        </div>

        {/* Seller Info */}
        <div className="mt-10 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xl font-bold mb-3 text-gray-800">Seller Information</h3>
            <p className="text-gray-700">
              <span className="font-semibold">Name:</span> {seller?.displayName || "N/A"}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Contact:</span>{" "}
              <a href="#" className="text-blue-600 hover:underline">
                xxxxxxxxxx
              </a>
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Location:</span> {address || "N/A"}
            </p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-3 text-gray-800">Listing Information</h3>
            <p className="text-sm text-gray-500">
              Listing ID: <span className="font-mono">{product.id}</span>
            </p>
            {createdAt?.toDate && (
              <p className="text-sm text-gray-500">
                Posted: {new Date(createdAt.toDate()).toLocaleDateString()}
              </p>
            )}
            {product.updatedAt?.toDate && (
              <p className="text-sm text-gray-500">
                Last Updated: {new Date(product.updatedAt.toDate()).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-10 pt-6 border-t border-gray-200 text-center">
          <button
            onClick={handleBuyNow}
            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition"
          >
            Buy Now
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default OldeeProductDetails;
