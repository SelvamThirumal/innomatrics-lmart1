import React, { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase'

const NewsToday = () => {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [newsArticles, setNewsArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedArticle, setSelectedArticle] = useState(null)

  useEffect(() => {
    const newsCollection = collection(db, 'news')
    const q = query(newsCollection, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const articles = querySnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            title: data.title || 'Untitled',
            excerpt: data.excerpt || '',
            content: data.content || data.excerpt || '',
            category: data.subcategory || 'General',
            author: data.author || 'Admin',
            date: formatDate(data.createdAt || data.date),
            image:
              data.imageUrl ||
              'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=400&fit=crop',
            createdAt: data.createdAt
          }
        })

        setNewsArticles(articles)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error(err)
        setError('Failed to load news.')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const formatDate = (dateInput) => {
    if (!dateInput) return '2024-01-01'
    if (dateInput?.toDate) return dateInput.toDate().toISOString().split('T')[0]
    return dateInput
  }

  const categories = ['all', ...new Set(newsArticles.map((a) => a.category))]

  const filtered = newsArticles.filter((a) => {
    const matchC = selectedCategory === 'all' || a.category === selectedCategory
    const matchS =
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.content.toLowerCase().includes(searchTerm.toLowerCase())
    return matchC && matchS
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">📰 News Today</h1>
          <p className="text-xl text-purple-100">Stay updated with the latest articles and insights</p>
        </div>
      </div>

      {/* Categories Filter */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex overflow-x-auto pb-2 space-x-2 scrollbar-hide">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${
                  selectedCategory === c
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {c === 'all' ? 'All News' : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">

     

        {/* Results Count */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {selectedCategory === 'all' ? 'Latest Articles' : `${selectedCategory} Articles`}
            <span className="ml-2 text-purple-600">({filtered.length})</span>
          </h2>
          {searchTerm && (
            <p className="text-gray-600">
              Search results for: "<span className="font-semibold">{searchTerm}</span>"
            </p>
          )}
        </div>

        {/* Articles Grid - IMAGE ON TOP LAYOUT */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((article) => (
            <div
              key={article.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-2xl transition-all duration-300 flex flex-col">
              
              {/* Image - TOP */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
                {/* Category Badge on Image */}
                <div className="absolute top-3 left-3">
                  <span className="inline-block bg-white/90 backdrop-blur-sm text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
                    {article.category}
                  </span>
                </div>
              </div>
              
              {/* Content Container */}
              <div className="p-5 flex-grow flex flex-col">
                {/* Date & Author */}
                <div className="mb-2">
                  <p className="text-gray-500 text-sm">
                    {article.date} - By {article.author}
                  </p>
                </div>
                
                {/* Headline/Title */}
                <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2">
                  {article.title}
                </h3>
                
                {/* Content/Excerpt */}
                <div className="mb-4 flex-grow">
                  <p className="text-gray-600 line-clamp-3">
                    {article.excerpt}
                  </p>
                </div>
                
                {/* Read More Button */}
                <div className="mt-auto">
                  <button
                    onClick={() => setSelectedArticle(article)}
                    className="w-full inline-flex items-center justify-center text-purple-600 font-semibold hover:text-purple-800 transition-colors group py-2 border border-purple-200 hover:border-purple-300 rounded-lg">
                    <span>READ MORE →</span>
                    <span className="ml-1 opacity-0 group-hover:opacity-100 group-hover:ml-2 transition-all duration-300">→</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results Message */}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-6 opacity-50">📰</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-3">No articles found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              {searchTerm 
                ? `No articles match your search for "${searchTerm}". Try different keywords.`
                : `No articles available in the ${selectedCategory} category.`}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-6 text-purple-600 font-semibold hover:text-purple-800">
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Full Article Modal/Page */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl my-8">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <span className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold mr-3">
                  {selectedArticle.category}
                </span>
                <span className="text-gray-500 text-sm">
                  {selectedArticle.date} • By {selectedArticle.author}
                </span>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-2xl text-gray-600 hover:text-black transition-colors p-2 hover:bg-gray-100 rounded-full">
                ✕
              </button>
            </div>

            {/* Article Hero Image */}
            <div className="relative h-96">
              <img
                src={selectedArticle.image}
                alt={selectedArticle.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <h1 className="text-4xl font-bold text-white mb-4">
                  {selectedArticle.title}
                </h1>
              </div>
            </div>

            {/* Article Content */}
            <div className="p-8">
              <div className="prose prose-lg max-w-none">
                <p className="text-xl text-gray-700 leading-relaxed mb-8 border-l-4 border-purple-500 pl-4 italic">
                  {selectedArticle.excerpt}
                </p>
                
                {/* Full Content */}
                <div className="text-gray-800 space-y-6 text-lg leading-relaxed">
                  <p>
                    {selectedArticle.content || selectedArticle.excerpt}
                  </p>
                  <p>
                    This is the full article content. In a real application, you would have 
                    the complete article text stored in your database. The excerpt shown 
                    above is just a preview of the full content.
                  </p>
                  <p>
                    The "READ MORE →" button opens this detailed view where users can read 
                    the entire article without leaving the page.
                  </p>
                </div>
              </div>

              {/* Back to List Button */}
              <div className="mt-12 pt-8 border-t">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="inline-flex items-center px-5 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg">
                  ← Back to Articles List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default NewsToday