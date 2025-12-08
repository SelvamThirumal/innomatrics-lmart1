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
      a.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    return matchC && matchS
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ⭐ Category Buttons – NOT FIXED NOW */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-4 py-2 rounded-full font-semibold transition-all ${
                selectedCategory === c
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ⭐ Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">

        <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span>📰</span> Latest Articles
        </h2>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Articles Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition">

              <img
                src={a.image}
                alt={a.title}
                className="w-full h-48 object-cover"
              />

              <div className="p-4">
                <h3 className="text-xl font-bold">{a.title}</h3>
                <p className="text-gray-600 mt-1 line-clamp-2">{a.excerpt}</p>

                <button
                  onClick={() => setSelectedArticle(a)}
                  className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700">
                  Read →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ⭐ Popup */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">

            <div className="flex justify-between items-center px-6 py-4 border-b bg-white">
              <h2 className="text-2xl font-bold">{selectedArticle.title}</h2>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-2xl text-gray-600 hover:text-black">
                ✕
              </button>
            </div>

            <img
              src={selectedArticle.image}
              className="w-full h-72 object-cover"
              alt="selected"
            />

            <div className="p-6">
              <p className="text-gray-700 text-lg leading-relaxed">
                {selectedArticle.excerpt}
              </p>

              <div className="mt-6 pt-4 border-t text-sm text-gray-500">
                <p>Category: {selectedArticle.category}</p>
                <p>Published: {selectedArticle.date}</p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default NewsToday
