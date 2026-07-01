import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Book, Volume2, Play, X, CheckCircle2, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AnimatePresence } from 'framer-motion'

import { motion } from 'framer-motion'

const API_URL = 'http://127.0.0.1:8000'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const itemVariants = {
  hidden: { x: -10, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1
  }
}

const TopicDetail = () => {
  const { topicId } = useParams()
  const [topic, setTopic] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { token } = useAuth()

  // Study Mode State
  const [isStudying, setIsStudying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [options, setOptions] = useState([])
  const [selectedOption, setSelectedOption] = useState(null)
  const [score, setScore] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } }
        const [topicRes, itemsRes] = await Promise.all([
          axios.get(`${API_URL}/topics/${topicId}`, config),
          axios.get(`${API_URL}/topics/${topicId}/items`, config)
        ])
        setTopic(topicRes.data)
        setItems(itemsRes.data)
      } catch (error) {
        console.error("Error fetching topic detail:", error)
      } finally {
        setLoading(false)
      }
    }
    
    if (token) {
      fetchData()
    }
  }, [topicId, token])

  const playAudio = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN'; // Set language to Mandarin Chinese
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Speech Synthesis not supported in this browser.");
    }
  }

  const getSrsBadge = (level) => {
    switch(level) {
      case -1: return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-bold">Mới</span>;
      case 0: return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-bold">Mới</span>;
      case 1: return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-bold">Đang học</span>;
      case 2: return <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full font-bold">Đang ôn</span>;
      case 3: return <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-bold">Thành thạo</span>;
      default: return null;
    }
  }

  // --- Study Mode Logic ---
  const startStudyMode = () => {
    if (items.length === 0) return;
    setIsStudying(true);
    setCurrentIndex(0);
    setScore(0);
    generateOptions(0);
  }

  const generateOptions = (index) => {
    const currentItem = items[index];
    if (!currentItem) return;

    const currentMeaning = currentItem.data.meaning_vi;
    
    // Get 3 random wrong answers from the SAME topic
    let distractors = items.filter(i => i.item_id !== currentItem.item_id);
    distractors = distractors.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    let newOptions = [currentMeaning, ...distractors.map(d => d.data.meaning_vi)];
    newOptions = newOptions.sort(() => 0.5 - Math.random());
    newOptions = [...new Set(newOptions)].filter(Boolean); // Remove duplicates/empty
    
    setOptions(newOptions);
    setSelectedOption(null);
    setIsFlipped(false);
  }

  const handleOptionClick = async (opt) => {
    if (selectedOption) return; // Prevent double click
    setSelectedOption(opt);
    
    const currentItem = items[currentIndex];
    const isCorrect = opt === currentItem.data.meaning_vi;
    
    if (isCorrect) setScore(prev => prev + 1);
    
    // Only record SRS if it's a vocabulary item (not character-only)
    if (currentItem.type === 'vocabulary') {
      try {
        await axios.post(`${API_URL}/users/me/srs/record`, 
          { vocab_id: currentItem.data.vocab_id, success: isCorrect },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (error) {
        console.error("Error recording progress:", error);
      }
    }
    
    setIsFlipped(true);

    // Wait a bit, then go to next or finish
    setTimeout(() => {
      if (currentIndex < items.length - 1) {
        setCurrentIndex(prev => prev + 1);
        generateOptions(currentIndex + 1);
      } else {
        // Finished
        setIsStudying(false);
        // Refresh items to get updated SRS badges
        const config = { headers: { Authorization: `Bearer ${token}` } };
        axios.get(`${API_URL}/topics/${topicId}/items`, config).then(res => setItems(res.data));
      }
    }, 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  if (!topic) return <div className="p-8">Topic not found</div>

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button 
        onClick={() => navigate('/topics')}
        className="flex items-center text-slate-500 hover:text-teal-600 transition-colors mb-6"
      >
        <ArrowLeft size={20} className="mr-2" /> Quay lại danh sách
      </button>

      <header className="zen-card mb-8 flex flex-col md:flex-row items-center gap-6 p-8">
        <div className="text-6xl p-6 bg-slate-50 rounded-3xl">
          {topic.icon_url}
        </div>
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-slate-800">{topic.title}</h1>
            <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-bold">HSK {topic.hsk_level}</span>
          </div>
          <p className="text-lg text-slate-500">{topic.description}</p>
        </div>
        <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
          <button 
            onClick={startStudyMode}
            disabled={items.length === 0}
            className={`w-full md:w-auto px-8 py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${items.length > 0 ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            <Play size={20} fill="currentColor" />
            Bắt đầu học
          </button>
          <button 
            onClick={() => navigate(`/topics/${topicId}/sentence-practice`)}
            disabled={items.length === 0}
            className={`w-full md:w-auto px-8 py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${items.length > 0 ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            <Book size={20} />
            Luyện viết câu
          </button>
        </div>
      </header>

      {/* --- Study Mode Overlay --- */}
      <AnimatePresence>
        {isStudying && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <span className="font-bold text-slate-500">Tiến độ: {currentIndex + 1} / {items.length}</span>
                <span className="font-bold text-teal-600">Điểm: {score}</span>
                <button onClick={() => setIsStudying(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 flex-1 overflow-y-auto flex flex-col items-center">
                <div 
                  className="w-full max-w-sm h-64 relative perspective-1000 mb-8"
                >
                  <div className={`w-full h-full absolute top-0 left-0 transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                    {/* Front */}
                    <div className="absolute w-full h-full backface-hidden bg-white rounded-2xl shadow-md border border-slate-200 flex flex-col items-center justify-center">
                      <span className="text-8xl font-black text-slate-800">{items[currentIndex]?.data.hanzi || items[currentIndex]?.data.word}</span>
                    </div>
                    {/* Back */}
                    <div className="absolute w-full h-full backface-hidden bg-teal-50 rounded-2xl shadow-md border border-teal-200 rotate-y-180 flex flex-col items-center justify-center p-6 text-center">
                      <span className="text-4xl font-bold text-teal-800 mb-2">{items[currentIndex]?.data.pinyin}</span>
                      <span className="text-2xl text-slate-700">{items[currentIndex]?.data.meaning_vi}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {options.map((opt, idx) => {
                    const isCorrect = opt === items[currentIndex]?.data.meaning_vi;
                    const isSelected = selectedOption === opt;
                    let btnClass = "bg-white border-2 border-slate-200 text-slate-700 hover:border-teal-500 hover:bg-teal-50 shadow-sm";
                    
                    if (selectedOption) {
                      if (isCorrect) btnClass = "bg-green-50 border-2 border-green-500 text-green-800";
                      else if (isSelected) btnClass = "bg-red-50 border-2 border-red-500 text-red-800";
                      else btnClass = "bg-slate-50 border-2 border-slate-200 text-slate-400 opacity-50";
                    }

                    return (
                      <button
                        key={idx}
                        disabled={selectedOption !== null}
                        onClick={() => handleOptionClick(opt)}
                        className={`p-4 rounded-xl font-bold transition-all text-center flex items-center justify-center relative min-h-[4rem] ${btnClass}`}
                      >
                        {opt}
                        {selectedOption && isCorrect && <CheckCircle2 className="absolute right-3 text-green-500" size={20} />}
                        {selectedOption && isSelected && !isCorrect && <XCircle className="absolute right-3 text-red-500" size={20} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {items.length === 0 ? (
          <div className="md:col-span-2 text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <Book size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">Chưa có nội dung cho chủ đề này. Chúng tôi sẽ cập nhật sớm!</p>
          </div>
        ) : (
          items.map((item) => (
            <motion.div 
              key={item.item_id} 
              variants={itemVariants}
              className="zen-card hover:border-teal-100 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-4xl font-bold text-slate-800">{item.data.hanzi || item.data.word}</h2>
                    {getSrsBadge(item.srs_level)}
                  </div>
                  <p className="text-xl text-teal-600 font-medium">{item.data.pinyin}</p>
                </div>
                <button 
                  onClick={() => playAudio(item.data.hanzi || item.data.word)}
                  className="p-2 bg-slate-50 rounded-full text-slate-400 group-hover:text-teal-500 group-hover:bg-teal-50 transition-colors"
                >
                  <Volume2 size={24} />
                </button>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-slate-700">{item.data.meaning_vi}</p>
              </div>
              {item.data.example_sentence && (
                <div className="mt-4 pt-4 border-t border-slate-100 italic text-sm text-slate-500">
                   "{item.data.example_sentence}"
                </div>
              )}
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  )
}

export default TopicDetail
