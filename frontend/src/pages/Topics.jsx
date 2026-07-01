import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { BookOpen, ChevronRight, GraduationCap } from 'lucide-react'

import { motion } from 'framer-motion'

const API_URL = 'http://127.0.0.1:8000'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
}

const Topics = () => {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await axios.get(`${API_URL}/topics/`)
        setTopics(response.data)
      } catch (error) {
        console.error("Error fetching topics:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchTopics()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <motion.header 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-10"
      >
        <h1 className="text-3xl font-bold text-slate-800">Bài học theo chủ đề</h1>
        <p className="text-slate-500 mt-2">Học tiếng Trung theo từng chủ đề thực tế</p>
      </motion.header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {topics.map((topic) => (
          <motion.div 
            key={topic.topic_id}
            variants={itemVariants}
            onClick={() => navigate(`/topics/${topic.topic_id}`)}
            className="zen-card group cursor-pointer hover:border-teal-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col items-center text-center p-6"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="text-4xl mb-4 p-4 bg-slate-50 rounded-2xl group-hover:bg-teal-50 transition-colors">
              {topic.icon_url}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">{topic.title}</h3>
            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{topic.description}</p>
            <div className="mt-auto w-full">
              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold mb-3">
                HSK {topic.hsk_level}
              </span>
              <div className="flex items-center justify-center text-teal-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Khám phá ngay <ChevronRight size={16} className="ml-1" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

export default Topics
