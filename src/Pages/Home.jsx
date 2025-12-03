import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart } from '../context/CartContext';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';

const Home = () => {
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const images = [
    "https://trios.qa/wp-content/uploads/2024/10/Printing.jpeg",
    "https://simplife.ae/uploads/business_sliders/slider-1692617396-951.jpg",
    "https://www.indusdubai.com/wp-content/uploads/2021/10/slide44-scaled.jpg",
    "https://descoonline.com/wp-content/uploads/2020/10/Same-Day-Printing-in-Dubai.jpg",
    "https://macedoniaprojects.co.zw/wp-content/uploads/2023/12/Digital-Printing-Services.jpg",
  ];
  const [current, setCurrent] = useState(0);

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

  // Auto change every 4 sec
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

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

      {/* Hero Section */}
      <div className="relative w-full h-[70vh] sm:h-[75vh] md:h-[80vh] lg:h-[85vh] xl:h-[90vh] overflow-hidden">
        {images.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === current ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={img}
              alt={`Slide ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}

        {/* Welcome Text Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-40">
          <div className="text-center text-white px-4 mb-6 sm:mb-8 lg:mb-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-3 sm:mb-4 lg:mb-6 animate-fade-in leading-tight">
              Welcome to L-Mart
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-medium animate-slide-up leading-relaxed">
              A Small Attempt at Online Shopping with all
            </p>
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

        {/* Dots Indicator */}
        <div className="absolute bottom-3 sm:bottom-4 md:bottom-6 lg:bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {images.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 rounded-full transition-colors ${
                index === current ? "bg-white" : "bg-gray-400"
              }`}
              onClick={() => setCurrent(index)}
            ></button>
          ))}
        </div>
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

      {/* Sub Category Section */}
      <div className="py-12 bg-white">
        <div className="container-responsive">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center px-6 py-2 bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-full text-sm font-semibold mb-4">
              <span className="mr-2">◀</span>
              SUB CATEGORY
              <span className="ml-2">▶</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
            {/* Logo Design */}
            <Link to="/newstoday" className="flex flex-col items-center group cursor-pointer">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80&q=80" 
                  alt="Logo Design" 
                  className="w-20 h-20 rounded-full object-cover shadow-md"
                />
              </div>
              <h3 className="text-sm font-medium text-gray-900 text-center">Logo Design</h3>
            </Link>

            {/* Web Design */}
            <Link to="/e-market" className="flex flex-col items-center group cursor-pointer">
              <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1547658719-da2b51169166?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80&q=80" 
                  alt="Web Design" 
                  className="w-20 h-20 rounded-full object-cover shadow-md"
                />
              </div>
              <h3 className="text-sm font-medium text-gray-900 text-center">Web Design</h3>
            </Link>

            {/* T-shirt Design */}
            <Link to="/printing" className="flex flex-col items-center group cursor-pointer">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80&q=80" 
                  alt="T-shirt Design" 
                  className="w-20 h-20 rounded-full object-cover shadow-md"
                />
              </div>
              <h3 className="text-sm font-medium text-gray-900 text-center">T-shirt Design</h3>
            </Link>

            {/* Flyer Design */}
            <Link to="/printing" className="flex flex-col items-center group cursor-pointer">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80&q=80" 
                  alt="Flyer Design" 
                  className="w-20 h-20 rounded-full object-cover shadow-md"
                />
              </div>
              <h3 className="text-sm font-medium text-gray-900 text-center">Flyer Design</h3>
            </Link>

            {/* Brochure Design */}
            <Link to="/printing" className="flex flex-col items-center group cursor-pointer">
              <div className="w-24 h-24 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80&q=80" 
                  alt="Brochure Design" 
                  className="w-20 h-20 rounded-full object-cover shadow-md"
                />
              </div>
              <h3 className="text-sm font-medium text-gray-900 text-center">Brochure Design</h3>
            </Link>

            {/* Business Card Design */}
            <Link to="/printing" className="flex flex-col items-center group cursor-pointer">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80&q=80" 
                  alt="Business Card Design" 
                  className="w-20 h-20 rounded-full object-cover shadow-md"
                />
              </div>
              <h3 className="text-sm font-medium text-gray-900 text-center">Business Card Design</h3>
            </Link>
          </div>

          {/* Sample Work Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Sample 1 */}
            <Link to="/printing" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <img 
                src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" 
                alt="Sample Work 1" 
                className="w-full h-48 object-cover"
              />
            </Link>

            {/* Sample 2 */}
            <Link to="/e-market" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" 
                alt="Sample Work 2" 
                className="w-full h-48 object-cover"
              />
            </Link>

            {/* Sample 3 */}
            <Link to="/local-market" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <img 
                src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" 
                alt="Sample Work 3" 
                className="w-full h-48 object-cover"
              />
            </Link>

            {/* Sample 4 */}
            <Link to="/newstoday" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <img 
                src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" 
                alt="Sample Work 4" 
                className="w-full h-48 object-cover"
              />
            </Link>
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
                    onClick={(e) => {
                      e.preventDefault();
                      addToCart({
                        ...product, 
                        image: product.image,
                        id: product.id
                      });
                    }}
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
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 animate-fade-in">
              Premium Bestsellers
            </h2>
            <p className="text-lg text-gray-600 animate-slide-up">
              Our most loved and highly-rated printing services
            </p>
          </div>

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
                    onClick={(e) => {
                      e.preventDefault();
                      addToCart({
                        ...product, 
                        image: product.image,
                        id: product.id
                      });
                    }}
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
    </div>
  );
};

export default Home;