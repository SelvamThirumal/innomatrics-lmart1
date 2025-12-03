import React, { useState, useEffect } from 'react'

const NewsToday = () => {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const newsArticles = [
    {
      id: 1,
      title: "Revolutionary 3D Printing Technology Transforms Custom Product Manufacturing",
      excerpt: "Latest advancements in 3D printing are enabling businesses to create personalized products at scale, reducing costs and delivery times significantly.",
      category: "3D Printing",
      author: "Tech Innovation Team",
      date: "2024-01-15",
      readTime: "5 min read",
      image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=400&fit=crop",
      featured: true,
      trending: true
    },
    {
      id: 2,
      title: "Sustainable Packaging Solutions Drive E-commerce Growth",
      excerpt: "Eco-friendly packaging materials are becoming the new standard in online retail, with 78% of consumers preferring sustainable options.",
      category: "Sustainability",
      author: "Green Business Reporter",
      date: "2024-01-14",
      readTime: "4 min read",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop",
      featured: false,
      trending: true
    },
    {
      id: 3,
      title: "Digital Printing Market Reaches $28 Billion Milestone",
      excerpt: "The digital printing industry continues its rapid expansion, driven by demand for personalized marketing materials and custom products.",
      category: "Business",
      author: "Market Analysis Team",
      date: "2024-01-13",
      readTime: "6 min read",
      image: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&h=400&fit=crop",
      featured: false,
      trending: true
    },
    {
      id: 4,
      title: "AI-Powered Design Tools Revolutionize Print Production",
      excerpt: "Artificial intelligence is streamlining the design process, enabling faster turnaround times and improved quality control in printing services.",
      category: "Technology",
      author: "AI Research Team",
      date: "2024-01-12",
      readTime: "7 min read",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop",
      featured: false,
      trending: false
    },
    {
      id: 5,
      title: "Custom Merchandise Trends Shaping Brand Marketing",
      excerpt: "Personalized promotional products are becoming essential for brand engagement, with custom printing services seeing 40% growth year-over-year.",
      category: "Marketing",
      author: "Brand Strategy Expert",
      date: "2024-01-11",
      readTime: "5 min read",
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop",
      featured: false,
      trending: false
    },
    {
      id: 6,
      title: "E-commerce Packaging Innovation Reduces Shipping Costs by 30%",
      excerpt: "New lightweight packaging solutions are helping online retailers cut shipping expenses while maintaining product protection standards.",
      category: "E-commerce",
      author: "Logistics Specialist",
      date: "2024-01-10",
      readTime: "4 min read",
      image: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800&h=400&fit=crop",
      featured: false,
      trending: false
    },
    {
      id: 7,
      title: "Print-on-Demand Services Transform Small Business Operations",
      excerpt: "Small businesses are leveraging print-on-demand technology to offer custom products without inventory investment, boosting profit margins.",
      category: "Business",
      author: "Small Business Advisor",
      date: "2024-01-09",
      readTime: "6 min read",
      image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=400&fit=crop",
      featured: false,
      trending: false
    },
    {
      id: 8,
      title: "Quality Control Automation in Modern Printing Facilities",
      excerpt: "Advanced quality control systems are ensuring consistent print quality while reducing waste and improving customer satisfaction rates.",
      category: "Technology",
      author: "Quality Assurance Team",
      date: "2024-01-08",
      readTime: "5 min read",
      image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=400&fit=crop",
      featured: false,
      trending: false
    }
  ]

  const categories = [
    { id: 'all', name: 'All News', icon: '📰', count: newsArticles.length },
    { id: '3D Printing', name: '3D Printing', icon: '🖨️', count: newsArticles.filter(article => article.category === '3D Printing').length },
    { id: 'Technology', name: 'Technology', icon: '💻', count: newsArticles.filter(article => article.category === 'Technology').length },
    { id: 'Business', name: 'Business', icon: '📈', count: newsArticles.filter(article => article.category === 'Business').length },
    { id: 'E-commerce', name: 'E-commerce', icon: '🛒', count: newsArticles.filter(article => article.category === 'E-commerce').length },
    { id: 'Sustainability', name: 'Sustainability', icon: '🌱', count: newsArticles.filter(article => article.category === 'Sustainability').length },
    { id: 'Marketing', name: 'Marketing', icon: '📢', count: newsArticles.filter(article => article.category === 'Marketing').length }
  ]

  const filteredArticles = newsArticles.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         article.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const featuredArticle = filteredArticles.find(article => article.featured)
  const trendingArticles = filteredArticles.filter(article => article.trending && !article.featured).slice(0, 3)
  const otherArticles = filteredArticles.filter(article => !article.featured && !article.trending)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      {/* Custom CSS for animations - moved to index.css */}

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-400/20 rounded-full animate-float"></div>
          <div className="absolute top-32 right-20 w-16 h-16 bg-purple-400/20 rounded-full animate-float delay-200"></div>
          <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-indigo-400/20 rounded-full animate-float delay-500"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <div className={`transition-all duration-1000 ${isVisible ? 'animate-fadeInUp' : 'opacity-0'}`}>
            <span className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 mb-6">
              <span className="text-yellow-400 mr-2">🔥</span>
              <span className="text-sm font-medium">Latest Industry News</span>
            </span>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
              News Today
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto">
              Stay updated with the latest trends in printing, e-commerce, and digital innovation
            </p>
          </div>
          
          {/* Search Bar */}
          <div className={`max-w-2xl mx-auto transition-all duration-1000 delay-300 ${isVisible ? 'animate-fadeInUp' : 'opacity-0'}`}>
            <div className="relative">
              <input
                type="text"
                placeholder="Search news articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-6 py-4 pl-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
              />
              <div className="absolute left-5 top-1/2 transform -translate-y-1/2">
                <span className="text-gray-300 text-xl">🔍</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="bg-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-4">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
              </svg>
              Categories
            </button>
          </div>
          
          <div className={`${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((category, index) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center px-4 lg:px-6 py-2 lg:py-3 rounded-full font-semibold transition-all transform hover:scale-105 animate-slideInLeft delay-${index * 100} text-sm lg:text-base ${
                    selectedCategory === category.id
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-1 lg:mr-2">{category.icon}</span>
                  <span>{category.name}</span>
                  <span className="ml-1 lg:ml-2 bg-white/20 px-1 lg:px-2 py-1 rounded-full text-xs">{category.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Featured Article */}
        {featuredArticle && (
          <div className="mb-16 animate-zoomIn">
            <div className="text-center mb-8">
              <span className="inline-flex items-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                <span className="mr-2">⭐</span>
                Featured Story
              </span>
            </div>
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2">
              <div className="md:flex">
                <div className="md:w-1/2">
                  <div className="relative h-64 md:h-full overflow-hidden">
                    <img 
                      src={featuredArticle.image} 
                      alt={featuredArticle.title}
                      className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute top-4 left-4">
                      <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 px-3 py-1 rounded-full text-sm font-bold">
                        {featuredArticle.category}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="md:w-1/2 p-8 md:p-12">
                  <div className="flex items-center text-gray-500 text-sm mb-4">
                    <span className="mr-4">📅 {featuredArticle.date}</span>
                    <span className="mr-4">👤 {featuredArticle.author}</span>
                    <span>⏱️ {featuredArticle.readTime}</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                    {featuredArticle.title}
                  </h2>
                  <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                    {featuredArticle.excerpt}
                  </p>
                  <button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-4 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg">
                    📖 Read Full Article
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trending Articles */}
        {trendingArticles.length > 0 && (
          <div className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 animate-fadeInUp">🔥 Trending Now</h2>
              <p className="text-xl text-gray-600 animate-fadeInUp delay-200">Most popular articles this week</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {trendingArticles.map((article, index) => (
                <div key={article.id} className={`bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 animate-fadeInUp delay-${index * 200}`}>
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={article.image} 
                      alt={article.title}
                      className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute top-4 left-4">
                      <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        🔥 Trending
                      </span>
                    </div>
                    <div className="absolute top-4 right-4">
                      <span className="bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs">
                        {article.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center text-gray-500 text-sm mb-3">
                      <span className="mr-3">📅 {article.date}</span>
                      <span>⏱️ {article.readTime}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">By {article.author}</span>
                      <button className="text-purple-600 hover:text-purple-800 font-semibold transition-colors">
                        Read More →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Results Message */}
        {filteredArticles.length === 0 && (
          <div className="py-16 bg-gray-50 rounded-3xl">
            <div className="container-responsive text-center">
              <div className="text-8xl mb-6 animate-pulse-slow">🔍</div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">No articles found</h3>
              <p className="text-gray-600 mb-8 text-lg">We couldn't find any articles matching your search criteria</p>
              <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                <button 
                  onClick={() => {
                    setSelectedCategory('all')
                    setSearchTerm('')
                  }}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-4 rounded-full font-bold transition transform hover:scale-105 shadow-lg"
                >
                  🔄 Reset Filters
                </button>
                <button className="border-2 border-purple-600 text-purple-600 px-8 py-4 rounded-full font-bold hover:bg-purple-600 hover:text-white transition transform hover:scale-105">
                  📝 Suggest a Topic
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Regular Articles Grid */}
        {otherArticles.length > 0 && (
          <div className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 animate-fadeInUp">📰 Latest Articles</h2>
              <p className="text-xl text-gray-600 animate-fadeInUp delay-200">Stay informed with our comprehensive coverage</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {otherArticles.map((article, index) => (
                <div key={article.id} className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 animate-fadeInUp delay-${index * 100}`}>
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={article.image} 
                      alt={article.title}
                      className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                    <div className="absolute top-4 left-4">
                      <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        {article.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center text-gray-500 text-sm mb-3">
                      <span className="mr-3">📅 {article.date}</span>
                      <span>⏱️ {article.readTime}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">By {article.author}</span>
                      <button className="text-purple-600 hover:text-purple-800 font-semibold transition-colors">
                        Read More →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Newsletter Subscription */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 text-white py-16 rounded-3xl relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-400/10 rounded-full animate-float"></div>
            <div className="absolute bottom-10 right-10 w-16 h-16 bg-purple-400/10 rounded-full animate-float delay-300"></div>
          </div>
          <div className="relative container-responsive text-center">
            <div className="animate-fadeInUp">
              <span className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 mb-6">
                <span className="text-yellow-400 mr-2">📧</span>
                <span className="text-sm font-medium">Stay Updated</span>
              </span>
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-yellow-200 bg-clip-text text-transparent">
                Never Miss an Update
              </h2>
              <p className="text-xl text-gray-200 mb-8">
                Subscribe to our newsletter and get the latest industry news delivered to your inbox
              </p>
            </div>
            
            <div className="max-w-md mx-auto animate-fadeInUp delay-300">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  className="flex-1 px-6 py-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <button className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 px-8 py-4 rounded-full font-bold hover:from-yellow-300 hover:to-orange-400 transition transform hover:scale-105 shadow-lg">
                  📧 Subscribe
                </button>
              </div>
              <p className="text-sm text-gray-300 mt-4">
                Join 10,000+ professionals who trust our insights
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-3xl mt-16 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-5 right-5 w-12 h-12 bg-white/10 rounded-full animate-pulse-slow"></div>
            <div className="absolute bottom-5 left-5 w-8 h-8 bg-yellow-400/20 rounded-full animate-float"></div>
          </div>
          <div className="relative container-responsive text-center">
            <div className="mb-8 animate-fadeInUp">
              <span className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 mb-6">
                <span className="text-yellow-400 mr-2">✨</span>
                <span className="text-sm font-medium">Share Your Expertise</span>
              </span>
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-yellow-200 bg-clip-text text-transparent">
                Become a Contributor
              </h2>
              <p className="text-xl text-gray-200 mb-8">
                Have a success story or industry insight? Join our community of expert writers and share your knowledge.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6 animate-fadeInUp delay-300">
              <button className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 px-8 py-4 rounded-full font-bold hover:from-yellow-300 hover:to-orange-400 transition transform hover:scale-105 shadow-lg">
                📝 Submit Your Article
              </button>
              <button className="border-2 border-white/30 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/10 transition transform hover:scale-105 backdrop-blur-sm">
                💬 Contact Our Editor
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewsToday