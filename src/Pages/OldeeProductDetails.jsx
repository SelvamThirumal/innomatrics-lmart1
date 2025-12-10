import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const OldeeProductDetails = ({ product, onBack, onEdit }) => {
  const navigate = useNavigate();

  if (!product) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="p-8 text-center">
          <h3 className="text-xl font-bold text-red-600">Product Not Found</h3>
          <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-200 rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const {
    name,
    price,
    offerPrice,
    description,
    imageURLs = [],
    address,
    negotiation,
    status,
    seller,
    createdAt,
  } = product;

  // ✅ Always send message to this fixed WhatsApp number
  const FIXED_WHATSAPP_NUMBER = "918762978777"; // 91 + 87629 78777

  const openWhatsApp = () => {
    const msg = `Hi ${seller?.displayName || "Seller"}, I'm interested in "${name}" (Listing ID: ${
      product.id || "-"
    }). Is it still available?`;
    const url = `https://wa.me/${FIXED_WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ✅ Image handling
  const [mainImage, setMainImage] = useState(imageURLs?.[0] || null);

  const priceNum = Number(price || 0);
  const offerPriceNum =
    offerPrice !== undefined && offerPrice !== null ? Number(offerPrice) : null;
  const hasDiscount = offerPriceNum !== null && offerPriceNum < priceNum;
  const finalPrice = hasDiscount ? offerPriceNum : priceNum;

  const handleBuyNow = () => {
    navigate("/checkout", {
      state: {
        item: product,
        buyNow: true,
        skipToPayment: true, // ⬅️ CHANGED FROM false TO true
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-white flex flex-col"
    >
      {/* Top Bar (sticky) */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 truncate">
            {name}
          </h1>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition"
          >
            ← Back to Marketplace
          </button>
        </div>
      </div>

      {/* Main scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Images Gallery */}
            <div className="lg:col-span-2">
              {/* Main Image */}
              <div className="mb-6">
                {mainImage ? (
                  <img
                    src={mainImage}
                    alt={name}
                    className="w-full max-h-[70vh] object-contain rounded-xl shadow-lg bg-gray-50"
                  />
                ) : (
                  <div className="w-full h-[60vh] flex items-center justify-center bg-gray-200 text-gray-500 rounded-xl">
                    No Image
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {imageURLs.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {imageURLs.map((url, index) => (
                    <button
                      key={index}
                      onClick={() => setMainImage(url)}
                      className={`min-w-20 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 focus:outline-none ${
                        url === mainImage
                          ? "border-blue-500 ring-2 ring-blue-300"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                      title={`View image ${index + 1}`}
                    >
                      <img
                        src={url}
                        alt={`${name} - ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
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

          {/* Seller & Listing Info */}
          <div className="mt-10 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">Seller Information</h3>
              <p className="text-gray-700">
                <span className="font-semibold">Name:</span>{" "}
                {seller?.displayName || "N/A"}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Contact:</span>{" "}
                <button
                  onClick={openWhatsApp}
                  className="text-green-700 font-medium underline underline-offset-2"
                >
                  WhatsApp Chat
                </button>
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
                  Last Updated:{" "}
                  {new Date(product.updatedAt.toDate()).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-10 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={handleBuyNow}
                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition"
              >
                Buy Now
              </button>

              <button
                onClick={openWhatsApp}
                className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition"
                title="Chat with Seller on WhatsApp"
              >
                Chat with Seller
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default OldeeProductDetails;