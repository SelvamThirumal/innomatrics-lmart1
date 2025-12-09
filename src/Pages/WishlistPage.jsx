// WishlistPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext'; 
import { useCart } from '../context/CartContext';

const WishlistPage = () => {
  const { wishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const handleAddToCart = (product) => {
    addToCart({ 
      id: product.id, 
      name: product.name, 
      price: product.price, 
      quantity: 1, 
      image: product.image 
    });
    alert(`${product.name} added to cart!`);
  };

  const handleRemoveFromWishlist = (product) => {
    toggleWishlist(product);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Wishlist ({wishlist.length} {wishlist.length === 1 ? 'Item' : 'Items'})
        </h1>

        {wishlist.length === 0 ? (
          <div className="bg-white p-8 rounded-xl shadow-lg text-center">
            <div className="mb-4">
              <svg className="w-20 h-20 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-.318-.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <p className="text-lg text-gray-600 mb-2">Your wishlist is empty.</p>
            <p className="text-gray-500 mb-6">Add items you love to your wishlist. Review them anytime and easily move them to the cart.</p>
            <button 
              onClick={() => navigate('/e-market')}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlist.map((product) => (
              <div 
                key={product.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                {/* Product Image */}
                <div className="relative h-56 overflow-hidden">
                  <img 
                    src={product.image || "https://placehold.co/400x300?text=No+Image"} 
                    alt={product.name} 
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    onError={(e) => (e.target.src = "https://placehold.co/400x300?text=No+Image")}
                  />
                  <button
                    onClick={() => handleRemoveFromWishlist(product)}
                    className="absolute top-3 right-3 p-2 bg-white text-red-500 rounded-full shadow-md hover:bg-red-50 transition"
                    title="Remove from Wishlist"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                  <div className="flex items-center mb-3">
                    <span className="text-xl font-bold text-red-600">₹{product.price?.toFixed(2) || '0.00'}</span>
                    {product.originalPrice > product.price && (
                      <span className="text-sm text-gray-500 line-through ml-2">
                        ₹{product.originalPrice?.toFixed(2) || '0.00'}
                      </span>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      Add to Cart
                    </button>
                    <button
                      onClick={() => {
                        handleAddToCart(product);
                        navigate('/checkout');
                      }}
                      className="w-full py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;