import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart } from '../context/CartContext';
import { db } from '../../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

const Home = () => {
  const { addToCart } = useCart();
  const [allProducts, setAllProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [displayProducts, setDisplayProducts] = useState([]);
  const [posters, setPosters] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [postersLoading, setPostersLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [toasts, setToasts] = useState([]);

  // Add toast function for cart notifications
  const addToast = (product) => {
    const newToast = {
      id: Date.now(),
      productName: product.name,
      productImage: product.image,
      price: product.offerPrice,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setToasts(prev => [newToast, ...prev]);
    
    // Auto remove toast after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== newToast.id));
    }, 3000);
  };

  // Handle add to cart with toast notification
  const handleAddToCart = (product, e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      ...product, 
      image: product.image,
      id: product.id
    });
    addToast(product);
  };

  // Helper function to format poster date
  const formatPosterDate = (timestamp) => {
    if (!timestamp) return 'No date';
    
    try {
      if (timestamp.toDate) {
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return timestamp;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Fetch trending products from Firebase (where trending is true)
  useEffect(() => {
    const fetchTrendingProducts = async () => {
      try {
        setTrendingLoading(true);
        const productsCollectionRef = collection(db, 'products');
        
        // Create query for trending products
        const trendingQuery = query(
          productsCollectionRef, 
          where('trending', '==', true)
        );
        
        const querySnapshot = await getDocs(trendingQuery);
        
        const fetchedTrendingProducts = [];
        querySnapshot.forEach((doc) => {
          const productData = doc.data();
          if (productData && productData.name) {
            // Handle pricing
            let price = 0;
            let offerPrice = 0;
            
            if (productData.variants && Array.isArray(productData.variants) && productData.variants.length > 0) {
              const firstVariant = productData.variants[0];
              price = Number(firstVariant.price) || 0;
              offerPrice = Number(firstVariant.offerPrice) || price;
            } else if (productData.price || productData.offerPrice) {
              price = Number(productData.price) || 0;
              offerPrice = Number(productData.offerPrice) || price;
            }
            
            // Get main image
            let imageUrl = '';
            if (productData.imageUrls && Array.isArray(productData.imageUrls) && productData.imageUrls.length > 0) {
              const mainImage = productData.imageUrls.find(img => img.isMain) || productData.imageUrls[0];
              imageUrl = mainImage.url || '';
            } else if (productData.mainImageUrl) {
              imageUrl = productData.mainImageUrl;
            } else if (productData.image) {
              imageUrl = productData.image;
            }
            
            fetchedTrendingProducts.push({
              ...productData,
              id: doc.id,
              price: price,
              offerPrice: offerPrice,
              originalPrice: price > offerPrice ? price : null,
              image: imageUrl,
              category: productData.category || {},
              subCategory: productData.subCategory || {},
              brand: productData.brand || "",
              productTag: productData.productTag || ""
            });
          }
        });

        console.log('Fetched trending products from Firebase:', fetchedTrendingProducts.length);
        setTrendingProducts(fetchedTrendingProducts);
        
      } catch (err) {
        console.error('Error fetching trending products:', err);
        // Don't set error for trending products - just show empty state
      } finally {
        setTrendingLoading(false);
      }
    };

    fetchTrendingProducts();
  }, []);

  // Fetch all products for display
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        setLoading(true);
        const productsCollectionRef = collection(db, 'products');
        const querySnapshot = await getDocs(productsCollectionRef);
        
        const fetchedProducts = [];
        querySnapshot.forEach((doc) => {
          const productData = doc.data();
          if (productData && productData.name) {
            // Handle pricing
            let price = 0;
            let offerPrice = 0;
            
            if (productData.variants && Array.isArray(productData.variants) && productData.variants.length > 0) {
              const firstVariant = productData.variants[0];
              price = Number(firstVariant.price) || 0;
              offerPrice = Number(firstVariant.offerPrice) || price;
            } else if (productData.price || productData.offerPrice) {
              price = Number(productData.price) || 0;
              offerPrice = Number(productData.offerPrice) || price;
            }
            
            // Get main image
            let imageUrl = '';
            if (productData.imageUrls && Array.isArray(productData.imageUrls) && productData.imageUrls.length > 0) {
              const mainImage = productData.imageUrls.find(img => img.isMain) || productData.imageUrls[0];
              imageUrl = mainImage.url || '';
            } else if (productData.mainImageUrl) {
              imageUrl = productData.mainImageUrl;
            } else if (productData.image) {
              imageUrl = productData.image;
            }
            
            fetchedProducts.push({
              ...productData,
              id: doc.id,
              price: price,
              offerPrice: offerPrice,
              originalPrice: price > offerPrice ? price : null,
              image: imageUrl
            });
          }
        });

        console.log('Fetched all products from Firebase:', fetchedProducts.length);
        setAllProducts(fetchedProducts);
        
      } catch (err) {
        console.error('Error fetching all products:', err);
        setError('Failed to load products. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllProducts();
  }, []);

  // Select random products for display (2 rows max)
  const selectRandomProducts = (products) => {
    if (products.length === 0) return [];
    
    // Shuffle array to get random order
    const shuffled = [...products].sort(() => Math.random() - 0.5);
    
    // Limit to maximum 10 products (2 rows of 5)
    const maxProducts = Math.min(shuffled.length, 10);
    return shuffled.slice(0, maxProducts);
  };

  // Update display products when allProducts change
  useEffect(() => {
    if (allProducts.length > 0) {
      const randomProducts = selectRandomProducts(allProducts);
      setDisplayProducts(randomProducts);
    }
  }, [allProducts]);

  // Fetch posters from Firebase
  useEffect(() => {
    const fetchPosters = async () => {
      try {
        setPostersLoading(true);
        const postersCollectionRef = collection(db, 'posters');
        const q = query(postersCollectionRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedPosters = [];
        querySnapshot.forEach((doc) => {
          const posterData = doc.data();
          if (posterData && posterData.title && posterData.imageUrl) {
            fetchedPosters.push({
              ...posterData,
              id: doc.id,
              posterId: posterData.posterId || doc.id,
              formattedDate: posterData.date || formatPosterDate(posterData.createdAt),
              title: posterData.title || "New Poster",
              subtitle: posterData.subtitle || "Latest addition to our collection"
            });
          }
        });

        console.log('Fetched posters from Firebase:', fetchedPosters);
        setPosters(fetchedPosters);
        
      } catch (err) {
        console.error('Error fetching posters from Firebase:', err);
        setPosters([]);
      } finally {
        setPostersLoading(false);
      }
    };

    fetchPosters();
  }, []);

  // Auto change posters every 4 seconds
  useEffect(() => {
    if (posters.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrent((prev) => (prev === posters.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [posters.length]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Add Custom CSS Animations */}
      <style jsx="true">{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        
        @keyframes progressBar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
        
        @keyframes scrollHorizontal {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fadeIn 1s ease-out;
        }
        
        .animate-slide-up {
          animation: slideUp 0.8s ease-out;
        }
        
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
        
        .animate-progress {
          animation: progressBar 3s linear forwards;
        }
        
        .animate-pulse {
          animation: pulse 2s infinite;
        }
        
        .animate-scroll-horizontal {
          animation: scrollHorizontal 30s linear infinite;
        }
        
        .animate-scroll-horizontal:hover {
          animation-play-state: paused;
        }
        
        .delay-100 {
          animation-delay: 0.1s;
        }
        
        .delay-200 {
          animation-delay: 0.2s;
        }
        
        .delay-300 {
          animation-delay: 0.3s;
        }
        
        .delay-400 {
          animation-delay: 0.4s;
        }
        
        .delay-500 {
          animation-delay: 0.5s;
        }
        
        .delay-600 {
          animation-delay: 0.6s;
        }
        
        .delay-700 {
          animation-delay: 0.7s;
        }
        
        .delay-800 {
          animation-delay: 0.8s;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      {/* Toast Notifications Container */}
      <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 animate-slide-in-right"
            style={{
              animation: 'slideInRight 0.3s ease-out, fadeOut 0.3s ease-out 2.7s'
            }}
          >
            <div className="flex items-start space-x-3">
              <div className="relative">
                <img
                  src={toast.productImage}
                  alt={toast.productName}
                  className="w-14 h-14 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center"><svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                  }}
                />
                <div className="absolute -top-2 -right-2 bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-gray-900 text-sm">Added to cart!</h4>
                  <span className="text-xs text-gray-500">{toast.timestamp}</span>
                </div>
                <p className="text-gray-700 text-sm mt-1 truncate">{toast.productName}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-orange-600">₹{toast.price}</span>
                  <Link 
                    to="/cart" 
                    className="text-purple-600 hover:text-purple-800 text-xs font-medium flex items-center"
                  >
                    View Cart
                    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
              
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full animate-progress"
                style={{
                  animation: 'progressBar 3s linear forwards'
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Hero Section with Dynamic Posters */}
      <div className="relative w-full h-screen overflow-hidden">

        {postersLoading ? (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading posters...</p>
            </div>
          </div>
        ) : posters.length > 0 ? (
          posters.map((poster, index) => (
            <div
              key={poster.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === current ? "opacity-100" : "opacity-0"
              }`}
            >
 <img
  src={poster.imageUrl}
  alt={poster.title}
  className="w-full h-full object-cover"
  style={{ width: "100%", height: "100%" }}
/>


            
            </div>
          ))
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <div className="text-center text-white p-6">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h1 className="text-3xl font-bold mb-2">No Posters Available</h1>
              <p className="text-lg opacity-90">Check back later for new posters</p>
            </div>
          </div>
        )}

        {/* Welcome Text Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-40">
          <div className="text-center text-white px-4 mb-6 sm:mb-8 lg:mb-10">
            {posters.length > 0 && posters[current] ? (
              <>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-3 sm:mb-4 lg:mb-6 animate-fade-in leading-tight">
                  {posters[current].title}
                </h1>
                {posters[current].subtitle && (
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-medium animate-slide-up leading-relaxed">
                    {posters[current].subtitle}
                  </p>
                )}
              </>
            ) : (
              <>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-3 sm:mb-4 lg:mb-6 animate-fade-in leading-tight">
                  Welcome to L-Mart
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-medium animate-slide-up leading-relaxed">
                  A Small Attempt at Online Shopping with all
                </p>
              </>
            )}
          </div>
          
          {/* Product Boxes Overlay with Auto Scroll */}
          <div className="container-responsive">
            <div className="relative overflow-hidden mask-gradient">
              <div className={`flex space-x-2 sm:space-x-3 md:space-x-4 lg:space-x-5 ${displayProducts.length > 6 ? 'animate-scroll-horizontal' : ''}`} style={{width: displayProducts.length > 6 ? '200%' : '100%'}}>
                {/* First set of products */}
                {displayProducts.length > 0 ? displayProducts.map((product, index) => (
                  <Link 
                    to={`/product/${product.id}`}
                    key={`first-${product.id}`}
                    className="bg-white bg-opacity-90 rounded-lg shadow-lg overflow-hidden border-2 border-yellow-400 hover:shadow-xl transition-all transform hover:scale-105 flex-shrink-0 w-28 sm:w-32 md:w-36 lg:w-40 xl:w-44 cursor-pointer"
                  >
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-full h-14 sm:h-16 md:h-20 lg:h-24 xl:h-28 object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div class="w-full h-14 sm:h-16 md:h-20 lg:h-24 xl:h-28 bg-gray-200 flex items-center justify-center"><svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                        }}
                      />
                    ) : (
                      <div className="w-full h-14 sm:h-16 md:h-20 lg:h-24 xl:h-28 bg-gray-200 flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="p-1 sm:p-2 lg:p-3">
                      <h3 className="text-xs sm:text-sm lg:text-base font-semibold text-gray-800 truncate">{product.name}</h3>
                      <div className="flex items-center mt-1">
                        {product.offerPrice < product.price ? (
                          <>
                            <span className="text-xs sm:text-sm font-bold text-red-600">₹{product.offerPrice}</span>
                            <span className="text-xs text-gray-500 line-through ml-1">₹{product.price}</span>
                          </>
                        ) : (
                          <span className="text-xs sm:text-sm font-bold text-gray-800">₹{product.price}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                )) : (
                  <div className="flex items-center justify-center w-full py-8">
                    <p className="text-gray-500 text-center">No products available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dots Indicator - only show if we have posters */}
        {posters.length > 0 && (
          <div className="absolute bottom-3 sm:bottom-4 md:bottom-6 lg:bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {posters.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 rounded-full transition-colors ${
                  index === current ? "bg-white" : "bg-gray-400"
                }`}
                onClick={() => setCurrent(index)}
              ></button>
            ))}
          </div>
        )}
      </div>

      {/* MAIN NAVIGATION CATEGORIES SECTION - ANIMATED BOX STYLE */}
      <div className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 animate-fade-in">
            <div className="inline-flex items-center justify-center mb-3">
              <div className="w-16 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full"></div>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 animate-slide-up">
              Explore More
            </h2>
            <p className="text-lg text-gray-600 animate-slide-up delay-100">
              Browse through our wide range of products and services
            </p>
          </div>
          
          {/* 5 Main Category Boxes - Animated */}
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-12">
  {/* E-Store Box */}
  <Link 
    to="/e-market" 
    className="group relative animate-float delay-0"
    style={{ animationDelay: '0s' }}
  >
    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 border border-gray-100 overflow-hidden">
      <div className="relative h-40 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent"></div>
        <div className="relative z-10 p-4 flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform duration-500 shadow-lg">
            <svg className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900 text-center group-hover:text-blue-600 transition-colors">E-Store</h3>
        </div>
      </div>
      <div className="p-4 bg-gradient-to-b from-white to-gray-50">
        <p className="text-sm text-gray-600 text-center mb-3">Digital Products & Services</p>
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center text-xs text-blue-500 font-medium">
            Explore Now
            <svg className="w-3 h-3 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </div>
    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-xl opacity-0 group-hover:opacity-20 blur transition duration-500 group-hover:duration-200"></div>
  </Link>

  {/* Local Market Box */}
  <Link 
    to="/local-market" 
    className="group relative animate-float delay-100"
    style={{ animationDelay: '0.1s' }}
  >
    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 border border-gray-100 overflow-hidden">
      <div className="relative h-40 bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent"></div>
        <div className="relative z-10 p-4 flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform duration-500 shadow-lg">
            <svg className="w-8 h-8 text-orange-600 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900 text-center group-hover:text-orange-600 transition-colors">Local Market</h3>
        </div>
      </div>
      <div className="p-4 bg-gradient-to-b from-white to-gray-50">
        <p className="text-sm text-gray-600 text-center mb-3">Local Products & Stores</p>
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center text-xs text-orange-500 font-medium">
            Explore Now
            <svg className="w-3 h-3 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </div>
    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-xl opacity-0 group-hover:opacity-20 blur transition duration-500 group-hover:duration-200"></div>
  </Link>

  {/* Printing Box */}
  <Link 
    to="/printing" 
    className="group relative animate-float delay-200"
    style={{ animationDelay: '0.2s' }}
  >
    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 border border-gray-100 overflow-hidden">
      <div className="relative h-40 bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent"></div>
        <div className="relative z-10 p-4 flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform duration-500 shadow-lg">
            <svg className="w-8 h-8 text-purple-600 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900 text-center group-hover:text-purple-600 transition-colors">Printing</h3>
        </div>
      </div>
      <div className="p-4 bg-gradient-to-b from-white to-gray-50">
        <p className="text-sm text-gray-600 text-center mb-3">Professional Print Services</p>
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center text-xs text-purple-500 font-medium">
            Explore Now
            <svg className="w-3 h-3 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </div>
    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl opacity-0 group-hover:opacity-20 blur transition duration-500 group-hover:duration-200"></div>
  </Link>

  {/* Market News Box */}
  <Link 
    to="./news-today" 
    className="group relative animate-float delay-300"
    style={{ animationDelay: '0.3s' }}
  >
    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 border border-gray-100 overflow-hidden">
      <div className="relative h-40 bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent"></div>
        <div className="relative z-10 p-4 flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform duration-500 shadow-lg">
            <svg className="w-8 h-8 text-red-600 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900 text-center group-hover:text-red-600 transition-colors">Market News</h3>
        </div>
      </div>
      <div className="p-4 bg-gradient-to-b from-white to-gray-50">
        <p className="text-sm text-gray-600 text-center mb-3">Latest Updates & Trends</p>
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center text-xs text-red-500 font-medium">
            Explore Now
            <svg className="w-3 h-3 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </div>
    <div className="absolute -inset-0.5 bg-gradient-to-r from-red-400 to-orange-400 rounded-xl opacity-0 group-hover:opacity-20 blur transition duration-500 group-hover:duration-200"></div>
  </Link>

  {/* Oldee Box */}
  <Link 
    to="./Oldee" 
    className="group relative animate-float delay-400"
    style={{ animationDelay: '0.4s' }}
  >
    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 border border-gray-100 overflow-hidden">
      <div className="relative h-40 bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent"></div>
        <div className="relative z-10 p-4 flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform duration-500 shadow-lg">
            <svg className="w-8 h-8 text-green-600 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900 text-center group-hover:text-green-600 transition-colors">Oldee</h3>
        </div>
      </div>
      <div className="p-4 bg-gradient-to-b from-white to-gray-50">
        <p className="text-sm text-gray-600 text-center mb-3">Vintage & Pre-Owned Items</p>
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center text-xs text-green-500 font-medium">
            Explore Now
            <svg className="w-3 h-3 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </div>
    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 to-teal-400 rounded-xl opacity-0 group-hover:opacity-20 blur transition duration-500 group-hover:duration-200"></div>
  </Link>
</div>

          {/* Feature Highlights - Animated */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 transform hover:scale-[1.02] border border-blue-100 animate-slide-up delay-500">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center animate-pulse">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-blue-700 mb-2">Wide Selection</h3>
                  <p className="text-gray-600 text-sm">Thousands of products across all categories</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 via-white to-green-50 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 transform hover:scale-[1.02] border border-green-100 animate-slide-up delay-600">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center animate-pulse">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-green-700 mb-2">Quality Assured</h3>
                  <p className="text-gray-600 text-sm">Premium quality products and services</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 transform hover:scale-[1.02] border border-purple-100 animate-slide-up delay-700">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center animate-pulse">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-purple-700 mb-2">Fast Delivery</h3>
                  <p className="text-gray-600 text-sm">Quick and reliable delivery service</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 via-white to-orange-50 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 transform hover:scale-[1.02] border border-orange-100 animate-slide-up delay-800">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center animate-pulse">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-orange-700 mb-2">Easy Returns</h3>
                  <p className="text-gray-600 text-sm">Hassle-free return policy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TRENDING PRODUCTS SECTION */}
      <div className="py-12 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="w-12 h-1 bg-orange-500 rounded-full mr-3"></div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 animate-fade-in">
                Trending Products
              </h2>
              <div className="w-12 h-1 bg-orange-500 rounded-full ml-3"></div>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto animate-slide-up delay-100">
              Discover our most popular and trending products loved by customers
            </p>
          </div>

          {/* Trending Products Grid */}
          {trendingLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : trendingProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {trendingProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] group relative animate-fade-in"
                  >
                    {/* Trending Badge */}
                    <div className="absolute top-2 left-2 z-10">
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                        </svg>
                        Trending
                      </span>
                    </div>

                    {/* Product Image */}
                    <Link to={`/product/${product.id}`} className="block relative">
                      <div className="relative h-48 md:h-56 overflow-hidden">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `
                                <div class="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                  <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              `;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        
                        {/* Discount Badge */}
                        {product.offerPrice < product.price && (
                          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold">
                            {Math.round((1 - product.offerPrice/product.price) * 100)}% OFF
                          </div>
                        )}
                      </div>
                    </Link>
                    
                    {/* Product Info */}
                    <div className="p-4">
                      {/* Brand and Category */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {product.brand && (
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {product.brand}
                          </span>
                        )}
                        {product.productTag && (
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                            {product.productTag}
                          </span>
                        )}
                      </div>

                      <Link to={`/product/${product.id}`}>
                        <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base hover:text-blue-600 transition-colors line-clamp-2">
                          {product.name}
                        </h3>
                      </Link>
                      
                      {/* Rating */}
                      <div className="flex items-center mb-3">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500 ml-2">4.5</span>
                      </div>
                      
                      {/* Price */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="text-lg md:text-xl font-bold text-gray-900">₹{product.offerPrice}</span>
                          {product.offerPrice < product.price && (
                            <>
                              <span className="text-sm text-gray-500 line-through ml-2">₹{product.price}</span>
                              <span className="text-xs text-red-500 font-medium ml-2">
                                Save ₹{product.price - product.offerPrice}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Add to Cart Button */}
                      <button 
                        onClick={(e) => handleAddToCart(product, e)}
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 group/btn"
                      >
                        <svg className="w-5 h-5 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                        </svg>
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
             
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm animate-fade-in">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Trending Products</h3>
              <p className="text-gray-500">Check back later for trending products</p>
            </div>
          )}
        </div>
      </div>

      {/* COMPLETE PRODUCTS SECTION */}
      <div className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 animate-fade-in">
              Complete Products List
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto animate-slide-up delay-100">
              Browse through our extensive collection of products from all categories
            </p>
            <div className="mt-2 text-sm text-gray-500 animate-slide-up delay-200">
              Showing {displayProducts.length} of {allProducts.length} products
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {displayProducts.map((product, index) => (
              <Link 
                to={`/product/${product.id}`}
                key={product.id} 
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Product Image */}
                <div className="relative h-40 md:h-48">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-[80vh] object-cover object-center"
                 onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '<div class="w-full h-full bg-gray-200 flex items-center justify-center"><svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {/* Discount Badge */}
                  {product.offerPrice < product.price && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold">
                      Save ₹{product.price - product.offerPrice}
                    </div>
                  )}
                  {/* Heart Icon */}
                  <div className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md cursor-pointer hover:bg-gray-100 transition-colors">
                    <svg className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                </div>
                
                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm truncate">
                    {product.name}
                  </h3>
                  
                  {/* Rating */}
                  <div className="flex items-center mb-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 ml-1">{product.rating || '4.3'}</span>
                  </div>
                  
                  {/* Price */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <span className="text-lg font-bold text-gray-900">₹{product.offerPrice}</span>
                      {product.offerPrice < product.price && (
                        <span className="text-sm text-gray-500 line-through ml-2">₹{product.price}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Add to Cart Button */}
                  <button 
                    onClick={(e) => handleAddToCart(product, e)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                    </svg>
                    <span>Add to Cart</span>
                  </button>
                </div>
              </Link>
            ))}
          </div>
          
          {/* View All Products Button */}
         
          
        </div>
      </div>

      {/* Company Info Section */}
      <div className="content-section p-4 bg-gradient-to-br from-white to-purple-50 rounded-3xl shadow-xl mt-4 border border-gray-200 mx-4 mb-8">
        <h2 className="text-3xl font-extrabold text-purple-700 mb-4 text-center">
          Welcome to <span className="text-orange-500">L-mart</span> – India's Trusted Online Shopping Partner
        </h2>
        
        <p className="text-gray-700 text-lg leading-relaxed mb-4 text-center">
          At <b>L-mart</b>, we deliver <span className="text-purple-600 font-semibold">reliable, affordable, and premium-quality online shopping</span> services for everyone across India.
        </p>
        <p className="text-gray-600 text-base mb-4 text-center">
          From <b>electronics</b> to <b>clothing</b>, <b>home goods</b>, <b>groceries</b>, and <b>custom services</b> – our user-friendly platform makes shopping fast, easy, and stress-free with <span className="text-orange-500 font-medium">free delivery</span> & <span className="text-purple-600 font-medium">exclusive discounts</span>.
        </p>

        {/* Services */}
        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-orange-600 mb-3 flex items-center gap-2">
            📌 Our Most Popular Categories
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-700">
            <li className="bg-white rounded-xl p-4 shadow hover:shadow-md transition">
              <b>Electronics</b> – Latest gadgets, smartphones, and accessories
            </li>
            <li className="bg-white rounded-xl p-4 shadow hover:shadow-md transition">
              <b>Fashion</b> – Trendy clothing, footwear, and accessories for all
            </li>
            <li className="bg-white rounded-xl p-4 shadow hover:shadow-md transition">
              <b>Home & Kitchen</b> – Everything for your home improvement needs
            </li>
            <li className="bg-white rounded-xl p-4 shadow hover:shadow-md transition">
              <b>Groceries</b> – Fresh produce and daily essentials delivered to your doorstep
            </li>
            <li className="bg-white rounded-xl p-4 shadow hover:shadow-md transition">
              <b>Beauty & Personal Care</b> – Premium beauty products and personal care items
            </li>
          </ul>
        </div>

        {/* Why Choose Us */}
        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-green-700 mb-3">
            💡 Why Choose L-mart?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-700">
            <p className="bg-gradient-to-r from-green-50 to-white rounded-lg p-3 shadow">✅ Pan-India Delivery across all major cities</p>
            <p className="bg-gradient-to-r from-green-50 to-white rounded-lg p-3 shadow">✅ Affordable Pricing with premium quality</p>
            <p className="bg-gradient-to-r from-green-50 to-white rounded-lg p-3 shadow">✅ User-Friendly Website – easy browsing and ordering</p>
            <p className="bg-gradient-to-r from-green-50 to-white rounded-lg p-3 shadow">✅ Fast Turnaround – On-time delivery guaranteed</p>
            <p className="bg-gradient-to-r from-green-50 to-white rounded-lg p-3 shadow">✅ Exclusive Discounts – Best prices for loyal customers</p>
            <p className="bg-gradient-to-r from-green-50 to-white rounded-lg p-3 shadow">✅ Quality Assurance – Verified products and sellers</p>
          </div>
        </div>

        {/* Who We Serve */}
        <div>
          <h3 className="text-2xl font-semibold text-purple-600 mb-3">
            👥 Who We Serve
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-700">
            <li className="bg-blue-50 rounded-xl p-4 shadow">
              <b>Students & Youth</b> – Affordable products and student discounts
            </li>
            <li className="bg-blue-50 rounded-xl p-4 shadow">
              <b>Families & Homemakers</b> – Daily essentials and household items
            </li>
            <li className="bg-blue-50 rounded-xl p-4 shadow">
              <b>Professionals</b> – Office supplies and work-from-home essentials
            </li>
            <li className="bg-blue-50 rounded-xl p-4 shadow">
              <b>Businesses</b> – Bulk orders and corporate gifting solutions
            </li>
            <li className="bg-blue-50 rounded-xl p-4 shadow">
              <b>Everyone</b> – Quality products for every need and budget
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;