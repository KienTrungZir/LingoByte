import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Volume2, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Sparkles, BookOpen, Search, CornerDownLeft, Type } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'

const API_URL = 'http://127.0.0.1:8000'

const SentencePractice = () => {
  const { topicId } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()

  const [topic, setTopic] = useState(null)
  const [exercises, setExercises] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [score, setScore] = useState(0)
  const [totalAttempted, setTotalAttempted] = useState(0)

  // Main input field state
  const [inputValue, setInputValue] = useState('')
  const [filledWord, setFilledWord] = useState('')  // The word currently displayed in the sentence
  const [isChecked, setIsChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(-1)
  const suggestionsRef = useRef(null)
  const mainInputRef = useRef(null)
  const debounceTimer = useRef(null)

  // Fetch topic and items
  useEffect(() => {
    const fetchData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } }
        const [topicRes, itemsRes] = await Promise.all([
          axios.get(`${API_URL}/topics/${topicId}`, config),
          axios.get(`${API_URL}/topics/${topicId}/items`, config)
        ])
        setTopic(topicRes.data)

        // Build exercises from items that have example_sentence
        const exerciseList = []
        for (const item of itemsRes.data) {
          const data = item.data
          const sentence = data.example_sentence
          const targetWord = data.hanzi || data.word

          if (!sentence || !targetWord) continue

          // Find the target word in the sentence
          const wordIndex = sentence.indexOf(targetWord)
          if (wordIndex === -1) continue

          const beforeBlank = sentence.substring(0, wordIndex)
          const afterBlank = sentence.substring(wordIndex + targetWord.length)

          exerciseList.push({
            item_id: item.item_id,
            word: targetWord,
            pinyin: data.pinyin || '',
            meaning_vi: data.meaning_vi || '',
            sentence: sentence,
            beforeBlank,
            afterBlank,
            blankLength: [...targetWord].length,
            type: item.type,
            vocab_id: data.vocab_id || null,
            srs_level: item.srs_level
          })
        }

        setExercises(exerciseList)
      } catch (error) {
        console.error("Error fetching topic data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (token) fetchData()
  }, [topicId, token])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          mainInputRef.current && !mainInputRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset state when exercise changes
  useEffect(() => {
    if (exercises.length > 0 && currentIndex < exercises.length) {
      setInputValue('')
      setFilledWord('')
      setIsChecked(false)
      setIsCorrect(false)
      setShowSuggestions(false)
      setSuggestions([])
      setSelectedSuggestionIdx(-1)
      // Focus input
      setTimeout(() => mainInputRef.current?.focus(), 100)
    }
  }, [currentIndex, exercises])

  const currentExercise = exercises[currentIndex]

  // Debounced search for autocomplete
  const searchVocab = useCallback((query) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    if (!query || query.trim().length === 0) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    debounceTimer.current = setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const res = await axios.get(`${API_URL}/dictionary/search`, {
          params: { q: query }
        })
        setSuggestions(res.data.slice(0, 8))
        setShowSuggestions(true)
        setSelectedSuggestionIdx(-1)
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        setLoadingSuggestions(false)
      }
    }, 300)
  }, [])

  // Handle main input change
  const handleInputChange = (e) => {
    if (isChecked) return
    const value = e.target.value
    setInputValue(value)
    searchVocab(value)
  }

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e) => {
    if (isChecked) return

    if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault()
      setSelectedSuggestionIdx(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp' && showSuggestions) {
      e.preventDefault()
      setSelectedSuggestionIdx(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (showSuggestions && selectedSuggestionIdx >= 0) {
        // Select the highlighted suggestion
        handleSuggestionClick(suggestions[selectedSuggestionIdx])
      } else if (filledWord) {
        // Check the answer
        handleCheck()
      } else if (inputValue.trim()) {
        // Fill the word into sentence from input
        fillWordFromInput()
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  // Fill word from direct input (when user types and presses Enter)
  const fillWordFromInput = () => {
    setFilledWord(inputValue.trim())
    setShowSuggestions(false)
  }

  // Handle suggestion click — fill word into sentence
  const handleSuggestionClick = (suggestion) => {
    const word = suggestion.word
    setInputValue(word)
    setFilledWord(word)
    setShowSuggestions(false)
    setSelectedSuggestionIdx(-1)
  }

  // Clear filled word to re-type
  const handleClearFilled = () => {
    if (isChecked) return
    setFilledWord('')
    setInputValue('')
    setTimeout(() => mainInputRef.current?.focus(), 50)
  }

  // Check answer
  const handleCheck = async () => {
    if (isChecked || !currentExercise || !filledWord) return

    const correct = filledWord === currentExercise.word
    setIsChecked(true)
    setIsCorrect(correct)
    setTotalAttempted(prev => prev + 1)
    if (correct) setScore(prev => prev + 1)

    // Record SRS if it's vocabulary
    if (currentExercise.vocab_id) {
      try {
        await axios.post(`${API_URL}/users/me/srs/record`,
          { vocab_id: currentExercise.vocab_id, success: correct },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      } catch (error) {
        console.error("Error recording SRS:", error)
      }
    }
  }

  // Navigation
  const goNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  // Audio
  const playAudio = (text, rate = 1) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'zh-CN'
      utterance.rate = rate
      window.speechSynthesis.speak(utterance)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  // No exercises available
  if (exercises.length === 0) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <button
          onClick={() => navigate(`/topics/${topicId}`)}
          className="flex items-center text-slate-500 hover:text-teal-600 transition-colors mb-6"
        >
          <ArrowLeft size={20} className="mr-2" /> Quay lại chủ đề
        </button>
        <div className="zen-card text-center py-20">
          <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-600 mb-2">Chưa có bài tập điền câu</h2>
          <p className="text-slate-400">Chủ đề này chưa có câu ví dụ để tạo bài tập. Hãy thử chủ đề khác!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20">
      {/* Top Header Bar */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(`/topics/${topicId}`)}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Quay lại</span>
          </button>

          <div className="text-center">
            <h1 className="text-sm font-bold tracking-wide">{topic?.title}</h1>
            <p className="text-[11px] text-teal-100">Luyện viết câu</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold">
              {currentIndex + 1}/{exercises.length}
            </div>
            <div className="bg-yellow-400/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-yellow-100">
              ⭐ {score}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-teal-700/50">
          <motion.div
            className="h-full bg-yellow-400"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Meaning hint */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-full text-sm">
                💡 Gợi ý: <strong>{currentExercise.meaning_vi}</strong>
                <span className="text-xs text-amber-500 ml-1">({currentExercise.pinyin})</span>
              </div>
            </div>

            {/* Sentence Card — displays the sentence with blank/filled word */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden mb-6">
              <div className="px-6 py-10 flex flex-wrap items-center justify-center gap-0.5 text-2xl md:text-3xl leading-relaxed select-none">
                {/* Before blank */}
                {currentExercise.beforeBlank && (
                  <span className="text-slate-800 font-medium">{currentExercise.beforeBlank}</span>
                )}

                {/* Blank area — shows underlines or filled word */}
                {filledWord ? (
                  // Word has been filled in
                  <span
                    onClick={handleClearFilled}
                    className={`relative inline-flex items-center px-1 mx-0.5 cursor-pointer group transition-all ${
                      isChecked
                        ? isCorrect
                          ? 'text-emerald-600'
                          : 'text-red-500 line-through decoration-2'
                        : 'text-teal-600'
                    }`}
                  >
                    {/* Underline decoration */}
                    <span className={`absolute bottom-0 left-0 right-0 h-1 rounded-full ${
                      isChecked
                        ? isCorrect ? 'bg-emerald-400' : 'bg-red-400'
                        : 'bg-teal-400'
                    }`} />
                    <span className="font-bold">{filledWord}</span>
                    {!isChecked && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <XCircle size={12} className="text-slate-500" />
                      </span>
                    )}
                  </span>
                ) : (
                  // Empty blanks — show underline placeholders for each character
                  <span className="inline-flex items-center gap-1 mx-1">
                    {Array.from({ length: currentExercise.blankLength }).map((_, i) => (
                      <span
                        key={i}
                        className="w-10 h-10 md:w-12 md:h-12 border-b-[3px] border-dashed border-teal-400 inline-flex items-center justify-center text-teal-300"
                      >
                        ?
                      </span>
                    ))}
                  </span>
                )}

                {/* After blank */}
                {currentExercise.afterBlank && (
                  <span className="text-slate-800 font-medium">{currentExercise.afterBlank}</span>
                )}
              </div>

              {/* Show correct answer after checking (if wrong) */}
              <AnimatePresence>
                {isChecked && !isCorrect && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="px-6 pb-4 text-center"
                  >
                    <p className="text-sm text-slate-500">Câu đúng:</p>
                    <p className="text-xl font-medium text-slate-700">
                      {currentExercise.beforeBlank}
                      <strong className="text-emerald-600 underline decoration-emerald-400 decoration-2 underline-offset-4">{currentExercise.word}</strong>
                      {currentExercise.afterBlank}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Result feedback bar */}
              <AnimatePresence>
                {isChecked && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`px-6 py-4 flex items-center gap-3 ${
                      isCorrect
                        ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-t-2 border-emerald-300'
                        : 'bg-gradient-to-r from-red-50 to-orange-50 border-t-2 border-red-300'
                    }`}>
                      {isCorrect ? (
                        <>
                          <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
                          <div>
                            <p className="font-bold text-emerald-700">Chính xác! 🎉</p>
                            <p className="text-sm text-emerald-600">
                              {currentExercise.word} ({currentExercise.pinyin}) — {currentExercise.meaning_vi}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <XCircle size={24} className="text-red-500 shrink-0" />
                          <div>
                            <p className="font-bold text-red-700">Chưa đúng rồi 😅</p>
                            <p className="text-sm text-red-600">
                              Đáp án: <strong className="text-lg">{currentExercise.word}</strong> ({currentExercise.pinyin}) — {currentExercise.meaning_vi}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input Area — separated from sentence */}
            {!isChecked && (
              <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-visible mb-6 relative">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <Type size={14} className="text-teal-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Nhập từ vào đây
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">
                    Gõ pinyin hoặc chữ Hán, rồi chọn gợi ý
                  </span>
                </div>

                <div className="p-4 relative" ref={suggestionsRef}>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <input
                        ref={mainInputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                          if (inputValue.length > 0 && suggestions.length > 0) setShowSuggestions(true)
                        }}
                        placeholder="Gõ pinyin hoặc chữ Hán..."
                        className="w-full px-4 py-3 text-lg border-2 border-slate-200 rounded-xl outline-none transition-all focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 placeholder:text-slate-300"
                        autoComplete="off"
                        disabled={!!filledWord}
                      />
                      {inputValue && !filledWord && (
                        <button
                          onClick={() => { setInputValue(''); setSuggestions([]); setShowSuggestions(false); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-slate-500 transition-colors"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                    </div>

                    {/* Fill / Check button */}
                    {!filledWord ? (
                      <button
                        onClick={fillWordFromInput}
                        disabled={!inputValue.trim()}
                        className={`px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 ${
                          inputValue.trim()
                            ? 'bg-teal-500 text-white shadow-md hover:bg-teal-600 active:scale-95'
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        }`}
                        title="Điền vào câu"
                      >
                        <CornerDownLeft size={18} />
                        Điền
                      </button>
                    ) : (
                      <button
                        onClick={handleCheck}
                        className="px-5 py-3 rounded-xl font-bold bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/25 hover:shadow-xl transition-all flex items-center gap-2 shrink-0 active:scale-95"
                      >
                        <CheckCircle2 size={18} />
                        Kiểm tra
                      </button>
                    )}
                  </div>

                  {/* Filled word preview */}
                  {filledWord && !isChecked && (
                    <div className="mt-3 flex items-center gap-2 px-1">
                      <span className="text-sm text-slate-500">Đã điền:</span>
                      <span className="text-lg font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-lg border border-teal-200">
                        {filledWord}
                      </span>
                      <button
                        onClick={handleClearFilled}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors underline ml-2"
                      >
                        Xóa & nhập lại
                      </button>
                    </div>
                  )}

                  {/* Autocomplete Dropdown */}
                  <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && !filledWord && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-4 right-4 top-[calc(100%-8px)] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
                      >
                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                          <Search size={12} className="text-slate-400" />
                          <span className="text-xs text-slate-500 font-medium">
                            Gợi ý cho "<strong>{inputValue}</strong>"
                          </span>
                          {loadingSuggestions && (
                            <div className="ml-auto w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
                          )}
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {suggestions.map((sug, idx) => {
                            const isMatch = sug.word === currentExercise.word
                            const isHighlighted = idx === selectedSuggestionIdx
                            return (
                              <button
                                key={sug.vocab_id || idx}
                                onClick={() => handleSuggestionClick(sug)}
                                className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors border-b border-slate-50 last:border-0 ${
                                  isHighlighted
                                    ? 'bg-teal-100'
                                    : isMatch
                                      ? 'bg-teal-50 hover:bg-teal-100'
                                      : 'hover:bg-slate-50'
                                }`}
                              >
                                <span className={`text-2xl font-bold min-w-[3rem] text-center ${
                                  isMatch ? 'text-teal-700' : 'text-slate-800'
                                }`}>
                                  {sug.word}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-teal-600 font-medium">{sug.pinyin}</p>
                                  <p className="text-xs text-slate-500 truncate">{sug.meaning_vi}</p>
                                </div>
                                {isMatch && (
                                  <span className="text-[10px] bg-teal-500 text-white px-2 py-0.5 rounded-full font-bold shrink-0">
                                    ✓ Phù hợp
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
                  currentIndex === 0
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-white text-slate-600 shadow-md hover:shadow-lg hover:text-teal-600 active:scale-95'
                }`}
              >
                <ChevronLeft size={18} />
                Trước
              </button>

              <button
                onClick={() => playAudio(currentExercise.sentence)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium bg-white text-slate-600 shadow-md hover:shadow-lg hover:text-teal-600 transition-all active:scale-95"
              >
                <Volume2 size={18} />
                Nghe
              </button>

              <button
                onClick={() => playAudio(currentExercise.sentence, 0.6)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium bg-white text-slate-600 shadow-md hover:shadow-lg hover:text-orange-500 transition-all active:scale-95"
              >
                <Volume2 size={18} />
                Nghe chậm
              </button>

              {isChecked && (
                <button
                  onClick={goNext}
                  disabled={currentIndex >= exercises.length - 1}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all active:scale-95 ${
                    currentIndex < exercises.length - 1
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/25 hover:shadow-xl'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Câu tiếp
                  <ChevronRight size={18} />
                </button>
              )}
            </div>

            {/* Sentence list overview */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-100 p-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Danh sách câu</h3>
              <div className="flex flex-wrap gap-2">
                {exercises.map((ex, idx) => {
                  let dotClass = "w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer "

                  if (idx === currentIndex) {
                    dotClass += "bg-teal-500 text-white shadow-md shadow-teal-500/30 scale-110"
                  } else if (idx < currentIndex) {
                    dotClass += "bg-teal-100 text-teal-700 hover:bg-teal-200"
                  } else {
                    dotClass += "bg-slate-100 text-slate-400 hover:bg-slate-200"
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={dotClass}
                      title={ex.word}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Completion modal */}
        <AnimatePresence>
          {isChecked && currentIndex === exercises.length - 1 && totalAttempted === exercises.length && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
              >
                <div className="text-6xl mb-4">
                  {score === exercises.length ? '🏆' : score >= exercises.length * 0.7 ? '🎉' : '💪'}
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Hoàn thành!</h2>
                <p className="text-lg text-slate-500 mb-6">
                  Bạn đúng <strong className="text-teal-600">{score}/{exercises.length}</strong> câu
                </p>
                <div className="w-full bg-slate-100 rounded-full h-3 mb-6">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all"
                    style={{ width: `${(score / exercises.length) * 100}%` }}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCurrentIndex(0)
                      setScore(0)
                      setTotalAttempted(0)
                    }}
                    className="flex-1 px-6 py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    Làm lại
                  </button>
                  <button
                    onClick={() => navigate(`/topics/${topicId}`)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/25 hover:shadow-xl transition-all"
                  >
                    Về chủ đề
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default SentencePractice
