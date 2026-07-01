import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronRight, ChevronLeft, RotateCcw, Play, CheckCircle2, XCircle, Zap, Volume2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../assets/flashcards.css';

const API_URL = 'http://127.0.0.1:8000';

const Flashcards = () => {
  const { token } = useAuth();
  const [levels, setLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]); // Track word results in session
  const [userStats, setUserStats] = useState(null); // Total accumulated words etc.

  // Quiz state
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Learned words modal
  const [learnedWords, setLearnedWords] = useState([]);
  const [showLearnedModal, setShowLearnedModal] = useState(false);
  const [loadingLearned, setLoadingLearned] = useState(false);

  const handleShowLearned = async () => {
    setShowLearnedModal(true);
    setLoadingLearned(true);
    try {
      const response = await axios.get(`${API_URL}/users/me/srs/learned`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLearnedWords(response.data);
    } catch (error) {
      console.error("Error fetching learned words:", error);
    } finally {
      setLoadingLearned(false);
    }
  };

  const speakWord = (text, e) => {
    if (e) e.stopPropagation(); // Prevent card flip
    if (!text || isSpeaking) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.8;
    utterance.pitch = 1;
    
    setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    fetchLevels();
    fetchUserStats();
  }, []);

  useEffect(() => {
    if (cards.length > 0 && sessionActive) {
      const currentCard = cards[currentIndex];
      // get 3 random wrong answers
      let distractors = cards.filter(c => c.vocab_id !== currentCard.vocab_id);
      // shuffle distractors
      distractors = distractors.sort(() => 0.5 - Math.random()).slice(0, 3);
      
      let newOptions = [currentCard, ...distractors].map(c => c.meaning_vi);
      // shuffle options
      newOptions = newOptions.sort(() => 0.5 - Math.random());
      
      // Filter out empty meanings and duplicates just in case
      newOptions = [...new Set(newOptions)].filter(Boolean);
      
      // If we don't have exactly 4 due to duplicates, it's okay, but normally we should
      setOptions(newOptions);
      setSelectedOption(null);
      setIsFlipped(false);
    }
  }, [currentIndex, cards, sessionActive]);

  const fetchUserStats = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/users/me/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserStats(response.data);
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  const fetchLevels = async () => {
    try {
      const response = await axios.get(`${API_URL}/flashcard/levels`);
      setLevels(response.data);
      if (response.data.length > 0) {
        setSelectedLevel(response.data[0].level);
      }
    } catch (error) {
      console.error("Error fetching levels:", error);
    } finally {
      setLoading(false);
    }
  };

  const startReviewSession = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/users/me/srs/reviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const reviews = response.data;
      if (reviews.length === 0) {
        alert("Bạn không có từ nào cần ôn tập ngay bây giờ!");
        setLoading(false);
        return;
      }
      
      setCards(reviews.map(r => r.vocabulary));
      setCurrentIndex(0);
      setScore(0);
      setSessionHistory([]); // Reset history
      setIsReviewMode(true);
      setSessionActive(true);
    } catch (error) {
      console.error("Error starting review session:", error);
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    if (!selectedLevel) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/flashcard/cards`, {
        params: { hsk_level: selectedLevel, count: 20 },
        headers: { Authorization: `Bearer ${token}` }
      });
      setCards(response.data);
      setCurrentIndex(0);
      setScore(0);
      setSessionHistory([]); // Reset history
      setSessionActive(true);
    } catch (error) {
      console.error("Error fetching cards:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionClick = async (opt) => {
    if (selectedOption) return; // prevent multiple clicks
    setSelectedOption(opt);
    
    const currentCard = cards[currentIndex];
    const isCorrect = opt === currentCard?.meaning_vi;
    
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    
    // Call SRS Record API
    try {
      await axios.post(`${API_URL}/users/me/srs/record`, 
        { vocab_id: currentCard.vocab_id, success: isCorrect },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update stats counter in real-time for newly learned words
      const existsInHistory = sessionHistory.find(h => h.vocab_id === currentCard.vocab_id);
      if (!existsInHistory && userStats) {
        setUserStats(prev => ({ ...prev, words_learned: prev.words_learned + 1 }));
      }
    } catch (error) {
      console.error("Error recording SRS progress:", error);
    }
    
    // Auto flip to show details
    setIsFlipped(true);

    // Add to session history
    setSessionHistory(prev => [
      ...prev.filter(h => h.vocab_id !== currentCard.vocab_id),
      { vocab_id: currentCard.vocab_id, word: currentCard.word, success: isCorrect }
    ]);
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Finished
      setSessionActive(false);
      setIsReviewMode(false);
      fetchLevels();
      fetchUserStats(); // Update total words learned
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (loading && !sessionActive) {
    return <div className="p-8 text-slate-500 flex justify-center mt-20">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Thẻ ghi nhớ (Flashcards)</h1>
        
        {/* Total accumulated counter */}
        {userStats && (
          <button 
            onClick={handleShowLearned}
            className="bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
              <Zap size={20} className="fill-teal-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng tích lũy</p>
              <p className="text-xl font-black text-slate-800">
                {userStats.words_learned} <span className="text-sm font-medium text-slate-400">từ vựng</span>
              </p>
            </div>
          </button>
        )}
      </div>
      
      {!sessionActive ? (
        <div className="space-y-6">
          <div className="zen-card p-6 border-2 border-orange-100 bg-orange-50/30 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-orange-500 p-3 rounded-2xl text-white">
                <Zap size={24} className="fill-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Chế độ Ôn tập SRS</h3>
                <p className="text-slate-600 text-sm">Học các từ vựng đã đến hạn để tối ưu trí nhớ.</p>
              </div>
            </div>
            <button 
              onClick={startReviewSession}
              className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
            >
              <Play size={18} fill="currentColor" />
              Ôn tập ngay
            </button>
          </div>

          <div className="zen-card max-w-md mx-auto text-center">
            <h2 className="text-xl font-bold mb-6">Học theo cấp độ HSK</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {levels.map((lvl) => (
                <button
                  key={lvl.level}
                  onClick={() => setSelectedLevel(lvl.level)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedLevel === lvl.level 
                      ? 'border-teal-500 bg-teal-50 text-teal-700' 
                      : 'border-slate-200 hover:border-teal-300'
                  }`}
                >
                  <div className="font-bold text-lg">HSK {lvl.level}</div>
                  <div className="text-sm text-slate-500">{lvl.count} từ vựng</div>
                </button>
              ))}
            </div>
            <button 
              onClick={startSession}
              disabled={!selectedLevel || levels.length === 0}
              className="zen-button w-full flex items-center justify-center gap-2"
            >
              <Play size={20} />
              Bắt đầu học mới
            </button>
          </div>
        </div>
      ) : (
          <div className="flex flex-col lg:flex-row gap-8 w-full">
            {/* Left side: Current Card */}
            <div className="flex-1 flex flex-col items-center">
              <div className="flex justify-between w-full max-w-lg mb-4 text-slate-500 font-medium">
                <span>HSK {selectedLevel} (Điểm: {score})</span>
                <span>{currentIndex + 1} / {cards.length}</span>
              </div>

              <div 
                className="w-full max-w-lg h-72 md:h-80 relative cursor-pointer perspective-1000"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <div className={`w-full h-full absolute top-0 left-0 transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                  
                  {/* Front side */}
                  <div className="absolute w-full h-full backface-hidden bg-white rounded-2xl shadow-md flex flex-col items-center justify-center border border-slate-100">
                    <span className="text-7xl font-bold text-slate-800 mb-4">{cards[currentIndex]?.word}</span>
                    <button
                      onClick={(e) => speakWord(cards[currentIndex]?.word, e)}
                      className={`mt-2 p-3 rounded-full transition-all ${
                        isSpeaking 
                          ? 'bg-teal-500 text-white animate-pulse shadow-lg shadow-teal-500/30' 
                          : 'bg-slate-100 text-slate-500 hover:bg-teal-100 hover:text-teal-600 hover:shadow-md'
                      }`}
                      title="Nghe phát âm"
                    >
                      <Volume2 size={22} />
                    </button>
                    <span className="text-sm text-slate-400 mt-3">Nhấn để lật thẻ</span>
                  </div>

                  {/* Back side */}
                  <div className="absolute w-full h-full backface-hidden bg-teal-50 rounded-2xl shadow-md flex flex-col items-center justify-center border border-teal-100 rotate-y-180 p-8 text-center">
                    <span className="text-3xl font-medium text-teal-800 mb-2">{cards[currentIndex]?.pinyin}</span>
                    <button
                      onClick={(e) => speakWord(cards[currentIndex]?.word, e)}
                      className={`mb-3 p-2.5 rounded-full transition-all ${
                        isSpeaking 
                          ? 'bg-teal-500 text-white animate-pulse shadow-lg shadow-teal-500/30' 
                          : 'bg-teal-200/60 text-teal-700 hover:bg-teal-300 hover:shadow-md'
                      }`}
                      title="Nghe phát âm"
                    >
                      <Volume2 size={18} />
                    </button>
                    <div className="h-px w-16 bg-teal-200 mb-4"></div>
                    <span className="text-xl text-slate-700 mb-2">{cards[currentIndex]?.meaning_vi}</span>
                    {cards[currentIndex]?.meaning_en && (
                      <span className="text-md text-slate-500 italic">{cards[currentIndex]?.meaning_en}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Multiple Choice Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg mt-8">
                {options.map((opt, idx) => {
                  const isCorrect = opt === cards[currentIndex]?.meaning_vi;
                  const isSelected = selectedOption === opt;
                  let btnClass = "bg-white border-2 border-slate-200 text-slate-700 hover:border-teal-500 hover:bg-teal-50 shadow-sm";
                  
                  if (selectedOption) {
                    if (isCorrect) {
                      btnClass = "bg-green-50 border-2 border-green-500 text-green-800";
                    } else if (isSelected) {
                      btnClass = "bg-red-50 border-2 border-red-500 text-red-800";
                    } else {
                      btnClass = "bg-slate-50 border-2 border-slate-200 text-slate-400 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={selectedOption !== null}
                      onClick={() => handleOptionClick(opt)}
                      className={`p-4 rounded-xl font-medium transition-all text-center flex items-center justify-center min-h-[4rem] relative ${btnClass}`}
                    >
                      <span className="line-clamp-2">{opt}</span>
                      {selectedOption && isCorrect && <CheckCircle2 className="absolute right-3 text-green-500" size={20} />}
                      {selectedOption && isSelected && !isCorrect && <XCircle className="absolute right-3 text-red-500" size={20} />}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-6 mt-10">
                <button 
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className={`p-4 rounded-full ${currentIndex === 0 ? 'bg-slate-100 text-slate-300' : 'bg-white shadow-md text-slate-600 hover:text-teal-600 hover:shadow-lg transition-all'}`}
                >
                  <ChevronLeft size={28} />
                </button>
                <button 
                  onClick={() => {
                    setSessionActive(false);
                    setIsReviewMode(false);
                    fetchLevels();
                    fetchUserStats();
                  }}
                  className="p-4 rounded-full bg-white shadow-md text-slate-600 hover:text-red-500 hover:shadow-lg transition-all"
                  title="Kết thúc"
                >
                  <RotateCcw size={28} />
                </button>
                <button 
                  onClick={handleNext}
                  className="p-4 rounded-full bg-white shadow-md text-teal-600 hover:text-teal-700 hover:shadow-lg transition-all"
                >
                  <ChevronRight size={28} />
                </button>
              </div>
            </div>

            {/* Right side: Session Stack/History */}
            <div className="w-full lg:w-72 mt-8 lg:mt-0">
              <div className="zen-card h-full flex flex-col p-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <RotateCcw size={14} />
                  Danh sách ôn tập (Stack)
                </h3>
                <div className="flex-1 overflow-y-auto max-h-[500px] space-y-2 pr-2 custom-scrollbar">
                  {cards.map((card, idx) => {
                    const historyItem = sessionHistory.find(h => h.vocab_id === card.vocab_id);
                    const isCurrent = idx === currentIndex;
                    const isPassed = idx < currentIndex;
                    
                    return (
                      <div 
                        key={card.vocab_id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                          isCurrent 
                            ? 'border-teal-500 bg-teal-50 shadow-sm' 
                            : isPassed 
                              ? 'border-slate-100 bg-slate-50' 
                              : 'border-transparent text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                            isCurrent ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <p className={`font-bold ${isCurrent ? 'text-teal-700' : isPassed ? 'text-slate-600' : 'text-slate-300'}`}>
                              {card.word}
                            </p>
                            {isPassed && historyItem && (
                              <p className="text-[10px] text-slate-400 italic">{card.pinyin}</p>
                            )}
                          </div>
                        </div>
                        {historyItem && (
                          historyItem.success 
                            ? <CheckCircle2 size={16} className="text-green-500" />
                            : <XCircle size={16} className="text-red-500" />
                        )}
                      </div>
                    );
                  })}
                  {cards.length === 0 && (
                    <p className="text-slate-400 text-xs text-center py-4">Chưa có dữ liệu</p>
                  )}
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Learned Words Modal */}
      {showLearnedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden relative">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Zap className="text-teal-500 fill-teal-500" size={24} />
                Từ vựng đã học ({learnedWords.length})
              </h2>
              <button onClick={() => setShowLearnedModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {loadingLearned ? (
                <div className="text-center py-12 text-slate-400">Đang tải...</div>
              ) : learnedWords.length === 0 ? (
                <div className="text-center py-12 text-slate-400">Bạn chưa học từ nào.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {learnedWords.map(item => (
                    <div key={item.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex justify-between items-center hover:border-teal-300 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-slate-800">{item.vocabulary.word}</span>
                          <span className="text-sm text-slate-500">{item.vocabulary.pinyin}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{item.vocabulary.meaning_vi}</p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-md mb-1">
                          Cấp độ {item.srs_level}
                        </div>
                        <button
                          onClick={(e) => speakWord(item.vocabulary.word, e)}
                          className="p-1.5 rounded-full text-slate-400 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                          title="Nghe phát âm"
                        >
                          <Volume2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Flashcards;
