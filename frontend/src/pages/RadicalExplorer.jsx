import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, BookOpen, Hash, Link2, ChevronDown, Sparkles, Volume2 } from 'lucide-react'

const API = 'http://127.0.0.1:8000'

const STROKE_COLORS = {
  1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#22c55e', 5: '#14b8a6',
  6: '#3b82f6', 7: '#6366f1', 8: '#8b5cf6', 9: '#a855f7', 10: '#ec4899',
  11: '#f43f5e', 12: '#d946ef', 13: '#7c3aed', 14: '#2563eb', 15: '#0d9488',
  16: '#059669', 17: '#ca8a04'
}

const playAudio = (char) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(char)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.7
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
  }
}

const RadicalExplorer = () => {
  const [radicals, setRadicals] = useState([])
  const [stats, setStats] = useState(null)
  const [search, setSearch] = useState('')
  const [strokeFilter, setStrokeFilter] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/radicals`).then(r => r.json()),
      fetch(`${API}/radicals/stats`).then(r => r.json())
    ]).then(([rads, st]) => {
      setRadicals(rads)
      setStats(st)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) { setDetail(null); return }
    fetch(`${API}/radicals/${selected.radical_id}`)
      .then(r => r.json())
      .then(setDetail)
  }, [selected])

  const filtered = radicals.filter(r => {
    const matchSearch = !search || r.character.includes(search) ||
      (r.meaning || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.pinyin || '').toLowerCase().includes(search.toLowerCase())
    const matchStroke = !strokeFilter || r.stroke_count === strokeFilter
    return matchSearch && matchStroke
  })

  const grouped = filtered.reduce((acc, r) => {
    const s = r.stroke_count || 0
    if (!acc[s]) acc[s] = []
    acc[s].push(r)
    return acc
  }, {})

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="text-teal-500" size={24} />
                214 Bộ thủ Khang Hy
              </h1>
              <p className="text-slate-500 text-sm mt-1">Khám phá hệ thống bộ thủ chữ Hán</p>
            </div>
            {stats && (
              <div className="flex gap-3">
                <div className="bg-teal-50 px-4 py-2 rounded-xl">
                  <p className="text-xs text-teal-600">Bộ thủ</p>
                  <p className="text-lg font-bold text-teal-700">{stats.total_radicals}</p>
                </div>
                <div className="bg-blue-50 px-4 py-2 rounded-xl">
                  <p className="text-xs text-blue-600">Chữ Hán</p>
                  <p className="text-lg font-bold text-blue-700">{stats.total_characters}</p>
                </div>
                <div className="bg-purple-50 px-4 py-2 rounded-xl">
                  <p className="text-xs text-purple-600">Liên kết</p>
                  <p className="text-lg font-bold text-purple-700">{stats.total_links}</p>
                </div>
              </div>
            )}
          </div>

          {/* Search + Filter */}
          <div className="flex gap-3">
            <div className="flex-1 flex items-center bg-slate-50 rounded-xl px-4 py-2 border border-slate-200 focus-within:border-teal-400 transition-colors">
              <Search className="text-slate-400 mr-2" size={18} />
              <input
                type="text"
                placeholder="Tìm bộ thủ theo tên, ý nghĩa, pinyin..."
                className="bg-transparent border-none outline-none w-full text-slate-700"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button onClick={() => setSearch('')}><X size={16} className="text-slate-400" /></button>}
            </div>
            <div className="relative">
              <select
                className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 pr-8 text-slate-700 cursor-pointer focus:border-teal-400 outline-none"
                value={strokeFilter || ''}
                onChange={e => setStrokeFilter(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">Tất cả nét</option>
                {Object.keys(grouped).sort((a, b) => a - b).map(s => (
                  <option key={s} value={s}>{s} nét ({grouped[s]?.length || 0})</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Search result count */}
          {search && (
            <p className="text-sm text-slate-400 mt-2">
              Tìm thấy <span className="font-bold text-teal-600">{filtered.length}</span> bộ thủ
            </p>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {filtered.length === 0 && search ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Search className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-xl font-bold text-slate-600">Không tìm thấy bộ thủ nào cho "{search}"</h3>
            <p className="text-slate-400 mt-2">Hãy thử từ khóa khác hoặc tìm bằng pinyin.</p>
          </div>
        ) : (
          Object.keys(grouped).sort((a, b) => a - b).map(strokeCount => (
            <div key={strokeCount} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                  style={{ background: STROKE_COLORS[strokeCount] || '#64748b' }}
                >
                  {strokeCount} nét
                </span>
                <span className="text-sm text-slate-400">{grouped[strokeCount].length} bộ</span>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14 gap-2">
                {grouped[strokeCount].map(rad => (
                  <motion.button
                    key={rad.radical_id}
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelected(rad)}
                    className={`relative group flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 cursor-pointer
                      ${selected?.radical_id === rad.radical_id
                        ? 'bg-teal-50 border-teal-400 shadow-lg shadow-teal-100'
                        : 'bg-white border-slate-100 hover:border-teal-200 hover:shadow-md'
                      }`}
                  >
                    <span className="text-2xl font-bold text-slate-800 group-hover:text-teal-600 transition-colors">
                      {rad.character}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 truncate w-full text-center">
                      {rad.pinyin}
                    </span>
                    {rad.variants && rad.variants.trim() && (
                      <span className="absolute -top-1 -right-1 bg-amber-400 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        +
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed inset-x-4 top-[8%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[580px] max-h-[84vh] overflow-y-auto bg-white rounded-3xl shadow-2xl z-50"
            >
              <div className="p-6">
                <button onClick={() => setSelected(null)} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} className="text-slate-400" />
                </button>

                {/* Character display */}
                <div className="flex items-start gap-6 mb-6">
                  <div
                    className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-5xl font-bold shadow-lg relative group cursor-pointer"
                    style={{ background: `linear-gradient(135deg, ${STROKE_COLORS[selected.stroke_count] || '#64748b'}, ${STROKE_COLORS[(selected.stroke_count || 0) + 1] || '#475569'})` }}
                    onClick={() => playAudio(selected.character)}
                  >
                    {selected.character}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-2xl transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Volume2 size={24} className="text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-800">{selected.meaning}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-slate-500">{selected.pinyin}</p>
                      <button 
                        onClick={() => playAudio(selected.character)}
                        className="p-1 hover:bg-teal-50 rounded-full transition-colors"
                        title="Nghe phát âm"
                      >
                        <Volume2 size={16} className="text-teal-500" />
                      </button>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs text-slate-600 font-medium">
                        {selected.stroke_count} nét
                      </span>
                      {selected.variants && selected.variants.trim() && (
                        <span className="px-2.5 py-1 bg-amber-50 rounded-lg text-xs text-amber-700 font-medium">
                          Biến thể: {selected.variants}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mnemonic tip */}
                {selected.mnemonic_tip && (
                  <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 mb-6">
                    <p className="text-sm font-medium text-teal-700 flex items-center gap-2">
                      <Sparkles size={14} /> Mẹo ghi nhớ
                    </p>
                    <p className="text-teal-600 mt-1">{selected.mnemonic_tip}</p>
                  </div>
                )}

                {/* Related characters */}
                <div>
                  <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <BookOpen size={16} />
                    Chữ Hán chứa bộ này
                    {detail && <span className="text-sm text-slate-400 font-normal">({detail.characters?.length || 0})</span>}
                  </h3>
                  {!detail ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent"></div>
                    </div>
                  ) : detail.characters?.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-60 overflow-y-auto">
                      {detail.characters.map(c => (
                        <div 
                          key={c.char_id} 
                          className="bg-slate-50 rounded-xl p-3 text-center hover:bg-teal-50 hover:shadow-md transition-all cursor-pointer group"
                          onClick={() => playAudio(c.hanzi)}
                        >
                          <p className="text-xl font-bold text-slate-800 group-hover:text-teal-600 transition-colors">{c.hanzi}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{c.pinyin}</p>
                          <p className="text-[10px] text-slate-400 truncate">{c.meaning_vi}</p>
                          <div className="flex items-center justify-center gap-1 mt-1">
                            {c.hsk_level && (
                              <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[9px] font-medium">
                                HSK {c.hsk_level}
                              </span>
                            )}
                            <Volume2 size={10} className="text-slate-300 group-hover:text-teal-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-6">Chưa có chữ Hán nào được liên kết</p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default RadicalExplorer
