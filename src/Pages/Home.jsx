import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart } from '../context/CartContext';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const Home = () => {
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [posters, setPosters] = useState([]);
  const [slides, setSlides] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [postersLoading, setPostersLoading] = useState(true);
  const [slidesLoading, setSlidesLoading] = useState(true);
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
    addToCart({
      ...product, 
      image: product.image,
      id: product.id
    });
    addToast(product);
  };

  // Helper function to format poster date from Firebase timestamp
  const formatPosterDate = (timestamp) => {
    if (!timestamp) return 'No date';
    
    try {
      // If it's a Firebase timestamp
      if (timestamp.toDate) {
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      
      // If it's already a string or other format
      return timestamp;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Fetch real products from Firebase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const productsCollectionRef = collection(db, 'products');
        const querySnapshot = await getDocs(productsCollectionRef);
        
        const fetchedProducts = [];
        querySnapshot.forEach((doc) => {
          const productData = doc.data();
          if (productData && productData.name) {
            // Handle variants if they exist
            let price = 0;
            let offerPrice = 0;
            
            if (productData.variants && Array.isArray(productData.variants) && productData.variants.length > 0) {
              // Use the first variant's pricing
              const firstVariant = productData.variants[0];
              price = Number(firstVariant.price) || 0;
              offerPrice = Number(firstVariant.offerPrice) || price;
            } else if (productData.price || productData.offerPrice) {
              // Use direct product pricing
              price = Number(productData.price) || 0;
              offerPrice = Number(productData.offerPrice) || price;
            }
            
            fetchedProducts.push({
              ...productData,
              id: doc.id,
              price: price,
              offerPrice: offerPrice,
              originalPrice: price > offerPrice ? price : null,
              image: productData.image || productData.imageUrl || 
                     (Array.isArray(productData.imageUrls) && productData.imageUrls.length > 0 ? 
                      productData.imageUrls[0].url : 'https://placehold.co/400x300?text=No+Image')
            });
          }
        });

        console.log('Fetched products from Firebase:', fetchedProducts);
        setProducts(fetchedProducts);
        
      } catch (err) {
        console.error('Error fetching products from Firebase:', err);
        setError('Failed to load products. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

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
          if (posterData && posterData.title) {
            fetchedPosters.push({
              ...posterData,
              id: doc.id,
              formattedDate: posterData.date || formatPosterDate(posterData.createdAt)
            });
          }
        });

        console.log('Fetched posters from Firebase:', fetchedPosters);
        setPosters(fetchedPosters);
        
      } catch (err) {
        console.error('Error fetching posters from Firebase:', err);
        // You can choose to handle this error separately or use the main error state
      } finally {
        setPostersLoading(false);
      }
    };

    fetchPosters();
  }, []);

  // Fetch slides from Firebase for hero section
  useEffect(() => {
    // Define all 7 unique URLs from provided poster data for fallback
    const SLIDE_URL_1 = "https://firebasestorage.googleapis.com/v0/b/emart-ecommerce.firebasestorage.app/o/posters%2F1764734534069-paper-bags-different-colors-blue-background-top-view%20(1).jpg?alt=media&token=5d843cbb-c03b-494e-af81-f11581406735";
    const SLIDE_URL_2 = "https://firebasestorage.googleapis.com/v0/b/emart-ecommerce.firebasestorage.app/o/posters%2F1764952259854-2%20layer%20f.jpeg?alt=media&token=eb5f0b70-71cd-4d25-94f0-dab20d731fbe";
    const SLIDE_URL_3 = "https://firebasestorage.googleapis.com/v0/b/emart-ecommerce.firebasestorage.app/o/posters%2F1764941573918-computer-mouse-paper-bags-blue-background-top-view.jpg?alt=media&token=fb2d177c-0aa0-461a-b426-eb24d50c6c66";
    const SLIDE_URL_4 = "https://firebasestorage.googleapis.com/v0/b/emart-ecommerce.firebasestorage.app/o/posters%2F1764938945022-range-bright-art-supplies.jpg?alt=media&token=771dca75-7c78-43b7-8a97-6fd6b26990cc";
    const SLIDE_URL_5 = "https://firebasestorage.googleapis.com/v0/b/emart-ecommerce.firebasestorage.app/o/posters%2F1764941440608-abstract-blur-shopping-mall-retail-store.jpg?alt=media&token=0606ecd5-d2d1-42d0-ba86-5af7d2394c38";
    const SLIDE_URL_6 = "https://firebasestorage.googleapis.com/v0/b/emart-ecommerce.firebasestorage.app/o/posters%2F1764941916491-abstract-blur-shopping-mall-retail-store.jpg?alt=media&token=6d7928d2-5735-444f-a0eb-e3623f41545b";
    const SLIDE_URL_7 = "https://firebasestorage.googleapis.com/v0/b/emart-ecommerce.firebasestorage.app/o/posters%2F1764952977753-Screenshot_2025-11-14-17-01-00-18_3d9111e2d3171bf4882369f490c087b4.jpg?alt=media&token=aa8bf87a-2528-4c97-9409-d4c794ed2369";
    
    const fetchSlides = async () => {
      try {
        setSlidesLoading(true);
        const slidesCollectionRef = collection(db, 'slides');
        const q = query(slidesCollectionRef, orderBy('order', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedSlides = [];
        querySnapshot.forEach((doc) => {
          const slideData = doc.data();
          if (slideData && slideData.imageUrl) {
            fetchedSlides.push({
              ...slideData,
              id: doc.id,
              alt: slideData.alt || slideData.title || `Slide ${doc.id}`,
              // Ensure we have title and subtitle
              title: slideData.title || "Welcome to L-Mart",
              subtitle: slideData.subtitle || "A Small Attempt at Online Shopping with all"
            });
          }
        });

        console.log('Fetched slides from Firebase:', fetchedSlides);
        
        // If no slides in Firebase, use default slides with 7 UNIQUE poster URLs
        if (fetchedSlides.length === 0) {
          setSlides([
            { id: 'default-1', imageUrl: SLIDE_URL_1, alt: "Printing Services", title: "Offset Printing", subtitle: "Large F.M. available here" },
            { id: 'default-2', imageUrl: SLIDE_URL_2, alt: "Digital Printing", title: "Premium Quality Prints", subtitle: "High-quality prints for business" },
            { id: 'default-3', imageUrl: SLIDE_URL_3, alt: "Office Supplies", title: "Complete Office Solutions", subtitle: "Everything for your office" },
            { id: 'default-4', imageUrl: SLIDE_URL_4, alt: "Art Supplies", title: "Range of Art Supplies", subtitle: "New creative posters available" },
            { id: 'default-5', imageUrl: SLIDE_URL_5, alt: "Shopping Mall View", title: "Digital Solutions", subtitle: "Abstract blur of retail store" },
            { id: 'default-6', imageUrl: SLIDE_URL_6, alt: "Retail Store", title: "Digital Printing Services", subtitle: "Abstract blur of shopping mall" },
            { id: 'default-7', imageUrl: SLIDE_URL_7, alt: "Testing Poster", title: "L-Mart Testing", subtitle: "Screenshot from poster upload" }
          ]);
        } else {
          setSlides(fetchedSlides);
        }
        
      } catch (err) {
        console.error('Error fetching slides from Firebase:', err);
        // Fallback to default slides if Firebase fails (Modified to use unique URLs)
        // Using first 3 as a safe minimal fallback
        setSlides([
            { id: 'default-1', imageUrl: SLIDE_URL_1, alt: "Printing Services", title: "Offset Printing", subtitle: "Large F.M. available here" },
            { id: 'default-2', imageUrl: SLIDE_URL_2, alt: "Digital Printing", title: "Premium Quality Prints", subtitle: "High-quality prints for business" },
            { id: 'default-3', imageUrl: SLIDE_URL_3, alt: "Office Supplies", title: "Complete Office Solutions", subtitle: "Everything for your office" }
        ]);
      } finally {
        setSlidesLoading(false);
      }
    };

    fetchSlides();
  }, []);

  // Auto change slides every 4 seconds
  useEffect(() => {
    if (slides.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [slides.length]);

  // Separate featured products from regular products
  const featuredProducts = products.filter((product) => product.featured);
  const otherProducts = products.filter((product) => !product.featured);

  // If no featured products, use all products
  const displayProducts = featuredProducts.length > 0 ? featuredProducts : products;

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
              {/* Product Image */}
              <div className="relative">
                <img
                  src={toast.productImage}
                  alt={toast.productName}
                  className="w-14 h-14 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/56x56?text=No+Image';
                  }}
                />
                <div className="absolute -top-2 -right-2 bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
              </div>
              
              {/* Toast Content */}
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
              
              {/* Close Button */}
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Progress Bar */}
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

      {/* Hero Section with Slideshow */}
      <div className="relative w-full h-[70vh] sm:h-[75vh] md:h-[80vh] lg:h-[85vh] xl:h-[90vh] overflow-hidden">
        {slidesLoading ? (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading slides...</p>
            </div>
          </div>
        ) : slides.length > 0 ? (
          slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === current ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src={slide.imageUrl}
                alt={slide.alt}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.log('Slide image failed to load:', slide.alt, 'URL:', slide.imageUrl);
                  e.target.src = 'https://placehold.co/1920x1080?text=Slide+Image';
                }}
              />
            </div>
          ))
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <p className="text-white text-xl">No slides available</p>
          </div>
        )}

        {/* Welcome Text Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-40">
          <div className="text-center text-white px-4 mb-6 sm:mb-8 lg:mb-10">
            {slides.length > 0 && slides[current] ? (
              <>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-3 sm:mb-4 lg:mb-6 animate-fade-in leading-tight">
                  {slides[current].title}
                </h1>
                {slides[current].subtitle && (
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-medium animate-slide-up leading-relaxed">
                    {slides[current].subtitle}
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
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-14 sm:h-16 md:h-20 lg:h-24 xl:h-28 object-cover"
                      onError={(e) => {
                        console.log('Image failed to load for product:', product.name, 'Image URL:', product.image);
                        e.target.src = 'https://placehold.co/150x150?text=No+Image';
                      }}
                    />
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
                
                {/* Duplicate set for infinite scroll - only show if we have enough products */}
                {displayProducts.length > 3 && displayProducts.map((product, index) => (
                  <Link 
                    to={`/product/${product.id}`}
                    key={`second-${product.id}`}
                    className="bg-white bg-opacity-90 rounded-lg shadow-lg overflow-hidden border-2 border-yellow-400 hover:shadow-xl transition-all transform hover:scale-105 flex-shrink-0 w-28 sm:w-32 md:w-36 lg:w-40 xl:w-44 cursor-pointer"
                  >
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-14 sm:h-16 md:h-20 lg:h-24 xl:h-28 object-cover"
                      onError={(e) => {
                        console.log('Image failed to load for product (second set):', product.name, 'Image URL:', product.image);
                        e.target.src = 'https://placehold.co/150x150?text=No+Image';
                      }}
                    />
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
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Dots Indicator - only show if we have slides */}
        {slides.length > 0 && (
          <div className="absolute bottom-3 sm:bottom-4 md:bottom-6 lg:bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {slides.map((_, index) => (
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

      {/* Categories Section */}
      <div className="py-6 sm:py-8 md:py-10 lg:py-12 bg-gray-50">
        <div className="container-responsive">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-6 sm:mb-8 md:mb-10 lg:mb-12 animate-fade-in">
            Shop by Category
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 lg:gap-10">
            {/* Printing Category */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition transform hover:scale-105 animate-fade-in-delay">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Printing Services</h3>
              <p className="text-gray-600 mb-4">
                Business cards, banners, flyers, and more
              </p>
              <Link
                to="/printing"
                className="text-purple-500 hover:text-purple-600 font-medium transition-colors"
              >
                Explore →
              </Link>
            </div>

            {/* Office Supplies */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition transform hover:scale-105 animate-fade-in-delay">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Office Supplies</h3>
              <p className="text-gray-600 mb-4">
                Papers, pens, notebooks, and stationery
              </p>
              <Link
                to="/local-market"
                className="text-purple-600 hover:text-purple-800 font-medium transition-colors"
              >
                Explore →
              </Link>
            </div>

            {/* Digital Solutions */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition transform hover:scale-105 animate-fade-in-delay">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Digital Solutions</h3>
              <p className="text-gray-600 mb-4">
                Web design, digital marketing, and IT services
              </p>
              <Link
                to="/e-market"
                className="text-purple-600 hover:text-purple-800 font-medium transition-colors"
              >
                Explore →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Categories Section - Replaces Sub Category */}
      <div className="py-12 bg-white">
        <div className="container-responsive">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 animate-fade-in">
              Explore Our Categories
            </h2>
            <p className="text-lg text-gray-600 animate-slide-up">
              Browse through our wide range of products and services
            </p>
          </div>
          
          {/* 5 Main Category Boxes */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
            {/* E-Store */}
            <Link to="/e-market" className="flex flex-col items-center group cursor-pointer">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900 text-center">E-Store</h3>
              <p className="text-xs text-gray-500 text-center mt-1">Digital Products</p>
            </Link>

            {/* Oldee */}
            <Link to="./Oldee" className="flex flex-col items-center group cursor-pointer">
              <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900 text-center">Oldee</h3>
              <p className="text-xs text-gray-500 text-center mt-1">Vintage Items</p>
            </Link>

            {/* News Today */}
            <Link to="./news-today" className="flex flex-col items-center group cursor-pointer">
              <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900 text-center">Market News</h3>
              <p className="text-xs text-gray-500 text-center mt-1">Latest Updates</p>
            </Link>

            {/* Printing */}
            <Link to="/printing" className="flex flex-col items-center group cursor-pointer">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900 text-center">Printing</h3>
              <p className="text-xs text-gray-500 text-center mt-1">Print Services</p>
            </Link>

            {/* Local Market */}
            <Link to="/local-market" className="flex flex-col items-center group cursor-pointer">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900 text-center">Local Market</h3>
              <p className="text-xs text-gray-500 text-center mt-1">Local Products</p>
            </Link>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
              <h3 className="font-bold text-lg text-blue-700 mb-2">Wide Selection</h3>
              <p className="text-gray-600 text-sm">Thousands of products across all categories</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
              <h3 className="font-bold text-lg text-green-700 mb-2">Quality Assured</h3>
              <p className="text-gray-600 text-sm">Premium quality products and services</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
              <h3 className="font-bold text-lg text-purple-700 mb-2">Fast Delivery</h3>
              <p className="text-gray-600 text-sm">Quick and reliable delivery service</p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
              <h3 className="font-bold text-lg text-orange-700 mb-2">Easy Returns</h3>
              <p className="text-gray-600 text-sm">Hassle-free return policy</p>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Product Collection */}
      <div className="py-8 bg-white">
        <div className="container-responsive">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 animate-fade-in">
              Complete Product Collection
            </h2>
            <p className="text-lg text-gray-600 animate-slide-up">
              Discover our full range of premium printing and design solutions
            </p>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
            {otherProducts.map((product, index) => (
              <Link 
                to={`/product/${product.id}`}
                key={product.id} 
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                {/* Product Image */}
                <div className="relative">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-32 sm:h-40 md:h-48 object-cover"
                    onError={(e) => {
                      console.log('Image failed to load in featured section for product:', product.name, 'Image URL:', product.image);
                      e.target.src = 'https://placehold.co/400x300?text=No+Image';
                    }}
                  />
                  {/* Discount Badge */}
                  {product.offerPrice < product.price && (
                    <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded-md text-xs font-semibold">
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
                <div className="p-2 sm:p-3 md:p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 text-xs sm:text-sm truncate">
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
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-1">
                      <span className="text-sm sm:text-lg font-bold text-gray-900">₹{product.offerPrice}</span>
                      {product.offerPrice < product.price && (
                        <span className="text-xs sm:text-sm text-gray-500 line-through">₹{product.price}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Add to Cart Button */}
                  <button 
                    onClick={(e) => handleAddToCart(product, e)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-1.5 sm:py-2 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                    </svg>
                    <span className="hidden sm:inline">Add to Cart</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Premium Bestsellers */}
      <div className="py-8 bg-gray-50">
        <div className="container-responsive">
          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
            {featuredProducts.map((product, index) => (
              <Link 
                to={`/product/${product.id}`}
                key={product.id} 
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                {/* Product Image */}
                <div className="relative">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-32 sm:h-40 md:h-48 object-cover"
                    onError={(e) => {
                      console.log('Product grid image failed to load:', product.name, 'Image URL:', product.image);
                      e.target.src = 'https://placehold.co/400x300?text=No+Image';
                    }}
                  />
                  {/* Discount Badge */}
                  {product.offerPrice < product.price && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-semibold">
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
                <div className="p-2 sm:p-3 md:p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 text-xs sm:text-sm truncate">
                    {product.name}
                  </h3>
                  
                  {/* Rating */}
                  <div className="flex items-center mb-2 hidden sm:flex">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 ml-1">{product.rating || '4.5'}</span>
                  </div>
                  
                  {/* Price */}
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-1">
                      <span className="text-sm sm:text-lg font-bold text-gray-900">₹{product.offerPrice}</span>
                      {product.offerPrice < product.price && (
                        <span className="text-xs sm:text-sm text-gray-500 line-through">₹{product.price}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Add to Cart Button */}
                  <button 
                    onClick={(e) => handleAddToCart(product, e)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-1.5 sm:py-2 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                    </svg>
                    <span className="hidden sm:inline">Add to Cart</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Image Gallery Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 max-w-6xl mx-auto">
        {/* Left big image with text overlay */}
        <div className="relative">
          <img
            src="https://png.pngtree.com/thumb_back/fh260/background/20230612/pngtree-multiple-prints-of-flowers-on-a-machine-image_2966676.jpg"
            alt="Printing Sample"
            className="w-full h-full object-cover rounded-lg shadow-md"
          />
          <div className="absolute top-4 left-4 bg-white bg-opacity-90 p-3 rounded-md shadow">
            <h2 className="text-lg font-bold">PrintOnWeb.in</h2>
            <p className="text-sm">Makes Every Experience Unique</p>
          </div>
        </div>

        {/* Right side 2 images stacked */}
        <div className="grid grid-cols-1 gap-4">
          <img
            src="https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcTOzBuq7zogJW-CSybROTQ6DYOS8HVt_9Dv_SadbxkCaBQA6QMrHAxS5_TX9IkRwDakiELbITXNwm4TWtjHBkTHH46RiLC_bY7qpLuQA_n-"
            alt="Printing Sample 2"
            className="w-full h-48 object-cover rounded-lg shadow-md"
          />
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRFvpo_ux3dbiP7QSXHELt7oqNK_Qf2xLgSUA&s"
            alt="Printing Sample 3"
            className="w-full h-48 object-cover rounded-lg shadow-md"
          />
        </div>
      </div>

      {/* Customer Reviews Section */}
      <div className="bg-gray-50 py-8">
        <div className="container-responsive">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            {/* Left Side - Image */}
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop"
                alt="Happy Customer"
                className="w-full h-96 object-cover rounded-2xl shadow-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-2xl"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <h3 className="text-2xl font-bold mb-2">Happy Customers</h3>
                <p className="text-lg opacity-90">
                  Trusted by 10,000+ customers
                </p>
              </div>
            </div>

            {/* Right Side - Auto Scrolling Reviews */}
            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  What Our Customers Say
                </h2>
                <p className="text-gray-600 text-lg">
                  Real reviews from real customers who love our printing services
                </p>
              </div>

              {/* Auto Scrolling Reviews Container */}
              <div className="relative h-80 overflow-hidden">
                <div className="absolute inset-0 auto-scroll-reviews">
                  {/* Review 1 */}
                  <div className="bg-white p-6 rounded-xl shadow-lg mb-4 review-card">
                    <div className="flex items-center mb-4">
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face"
                        alt="Customer"
                        className="w-12 h-12 rounded-full mr-4"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Rahul Sharma
                        </h4>
                        <div className="flex text-yellow-400">★★★★★</div>
                      </div>
                    </div>
                    <p className="text-gray-700">
                      "Excellent quality prints! The colors are vibrant and the delivery was super fast. Highly recommended for all printing needs."
                    </p>
                  </div>

                  {/* Review 2 */}
                  <div className="bg-white p-6 rounded-xl shadow-lg mb-4 review-card">
                    <div className="flex items-center mb-4">
                      <img
                        src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop&crop=face"
                        alt="Customer"
                        className="w-12 h-12 rounded-full mr-4"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Priya Patel
                        </h4>
                        <div className="flex text-yellow-400">★★★★★</div>
                      </div>
                    </div>
                    <p className="text-gray-700">
                      "Amazing service! Got my wedding invitations printed here and they turned out perfect. Great customer support too."
                    </p>
                  </div>

                  {/* Review 3 */}
                  <div className="bg-white p-6 rounded-xl shadow-lg mb-4 review-card">
                    <div className="flex items-center mb-4">
                      <img
                        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face"
                        alt="Customer"
                        className="w-12 h-12 rounded-full mr-4"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Amit Kumar
                        </h4>
                        <div className="flex text-yellow-400">★★★★★</div>
                      </div>
                    </div>
                    <p className="text-gray-700">
                      "Best printing service in the city! Professional quality at affordable prices. Will definitely use again."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Company Info Section */}
      <div className="content-section p-4 bg-gradient-to-br from-white to-purple-50 rounded-3xl shadow-xl mt-4 border border-gray-200">
        <h2 className="text-3xl font-extrabold text-purple-700 mb-4 text-center">
          Welcome to <span className="text-orange-500">L-mart</span> – India's Trusted Online Printing Partner
        </h2>
        
        <p className="text-gray-700 text-lg leading-relaxed mb-4 text-center">
          At <b>PrintCo</b>, we deliver <span className="text-purple-600 font-semibold">reliable, affordable, and premium-quality online printing</span> services for students, startups, corporates, and individuals across India.
        </p>
        <p className="text-gray-600 text-base mb-4 text-center">
          From <b>business cards</b> to <b>books</b>, <b>posters</b>, <b>brochures</b>, and <b>custom marketing materials</b> – our user-friendly platform makes printing fast, easy, and stress-free with <span className="text-orange-500 font-medium">free Pan-India delivery</span> & <span className="text-purple-600 font-medium">bulk discounts</span>.
        </p>

        {/* Services */}
        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-orange-600 mb-3 flex items-center gap-2">
            📌 Our Most Popular Online Printing Services
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-700">
            <li className="bg-white rounded-xl p-4 shadow hover:shadow-md transition">
              <b>Document Printing</b> – Fast and affordable printing for assignments & business needs.
            </li>
            <li className="bg-white rounded-xl p-4 shadow hover:shadow-md transition">
              <b>Book Printing</b> – Perfect for students, authors & institutions with multiple bindings.
            </li>
            <li className="bg-white rounded-xl p-4 shadow hover:shadow-md transition">
              <b>Brochure Printing</b> – Eye-catching prints to promote your events or business.
            </li>
            <li className="bg-white rounded-xl p-4 shadow hover:shadow-md transition">
              <b>Posters & Banners</b> – High-quality large-format prints for retail & academic needs.
            </li>
            <li className="bg-white rounded-xl p-4 shadow hover:shadow-md transition">
              <b>Sticker Printing</b> – Vibrant stickers, perfect for branding & promotions.
            </li>
          </ul>
        </div>

        {/* Why Choose Us */}
        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-green-700 mb-3">
            💡 Why Choose PrintCo?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-700">
            <p className="bg-gradient-to-r from-green-50 to-white rounded-lg p-3 shadow">✅ Pan-India Delivery across all major cities</p>
            <p className="bg-gradient-to-r from-green-50 to-white rounded-lg p-3 shadow">✅ Affordable Pricing with premium quality</p>
            <p className="bg-gradient-to-r from-green-50 to-white rounded-lg p-3 shadow">✅ User-Friendly Website – upload, preview & order easily</p>
            <p className="bg-gradient-to-r from-green-50 to-white rounded-lg p-3 shadow">✅ Fast Turnaround – On-time delivery</p>
            <p className="bg-gradient-to-r from-green-50 to-white rounded-lg p-3 shadow">✅ Bulk Order Discounts – Ideal for SMEs & startups</p>
            <p className="bg-gradient-to-r from-green-50 to-white rounded-lg p-3 shadow">✅ High Print Quality – Vivid colors & durable materials</p>
          </div>
        </div>

        {/* Who We Serve */}
        <div>
          <h3 className="text-2xl font-semibold text-purple-600 mb-3">
            👥 Who We Serve
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-700">
            <li className="bg-blue-50 rounded-xl p-4 shadow">
              <b>Students & Institutions</b> – Affordable project & dissertation printing.
            </li>
            <li className="bg-blue-50 rounded-xl p-4 shadow">
              <b>Startups & Small Businesses</b> – Flyers, catalogs & pitch decks.
            </li>
            <li className="bg-blue-50 rounded-xl p-4 shadow">
              <b>Event Planners & Agencies</b> – Marketing banners & invitations.
            </li>
            <li className="bg-blue-50 rounded-xl p-4 shadow">
              <b>Authors & Publishers</b> – High-quality book printing with binding options.
            </li>
            <li className="bg-blue-50 rounded-xl p-4 shadow">
              <b>Corporate Clients</b> – Reports, manuals & branded stationery.
            </li>
          </ul>
        </div>
      </div>

      {/* Add CSS animations for toast */}
      <style jsx="true">{`
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
        
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
        
        .animate-progress {
          animation: progressBar 3s linear forwards;
        }
      `}</style>
    </div>
  );
};

export default Home;