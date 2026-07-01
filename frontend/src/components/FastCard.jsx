import React from 'react'
import { Link } from 'react-router-dom'
import { Clock, CheckCircle2, ChevronRight, Zap, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

const srsLevels = [
  { label: 'Mới', color: 'bg-blue-500' },
  { label: 'Đang học', color: 'bg-orange-500' },
  { label: 'Đang ôn', color: 'bg-teal-500' },
  { label: 'Thành thạo', color: 'bg-purple-500' }
]

const FastCard = ({ stats }) => {
  const { review_count, upcoming_reviews } = stats || { review_count: 0, upcoming_reviews: [] }
  
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Chưa ôn'
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString()
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="zen-card overflow-hidden relative group"
    >
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-all duration-700"></div>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Zap size={20} className="text-orange-500 fill-orange-500" />
            Ôn tập nhanh
          </h2>
          <p className="text-sm text-slate-500">Duy trì trí nhớ bằng Spaced Repetition</p>
        </div>
        <div className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-bold border border-orange-100 animate-pulse">
          {review_count} từ đến hạn
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {upcoming_reviews.length > 0 ? (
          upcoming_reviews.map((item, idx) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold text-slate-800 w-10 text-center">
                  {item.vocabulary.word}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-700">{item.vocabulary.pinyin}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock size={10} /> {formatDate(item.last_reviewed)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${srsLevels[item.srs_level]?.color || 'bg-slate-300'}`}></span>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                  {srsLevels[item.srs_level]?.label}
                </span>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-8 text-center bg-teal-50/50 rounded-2xl border border-dashed border-teal-200">
            <Sparkles className="mx-auto text-teal-400 mb-2" size={32} />
            <p className="text-teal-700 font-medium">Bạn đã hoàn thành hết mục tiêu!</p>
            <p className="text-teal-600/70 text-xs">Hãy quay lại sau khi đến hạn ôn tập.</p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {review_count > 0 ? (
          <Link 
            to="/flashcards" 
            className="flex-1 zen-button bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 border-none text-white shadow-lg shadow-teal-900/20 flex items-center justify-center gap-2 py-3"
          >
            Bắt đầu ôn tập ngay
            <ChevronRight size={18} />
          </Link>
        ) : (
          <Link 
            to="/topics" 
            className="flex-1 zen-button flex items-center justify-center gap-2 py-3"
          >
            Học từ mới
            <ChevronRight size={18} />
          </Link>
        )}
      </div>
    </motion.div>
  )
}

export default FastCard
