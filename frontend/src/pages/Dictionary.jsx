import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Book, Bookmark, Volume2, Info, X, ChevronRight, Sparkles, Hash, ExternalLink, Copy, Check, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'http://127.0.0.1:8000';

const Dictionary = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchMode, setSearchMode] = useState('all');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [randomVocab, setRandomVocab] = useState([]);
    const [selectedWord, setSelectedWord] = useState(null);
    const searchTimerRef = useRef(null);

    useEffect(() => {
        if (searchQuery.trim()) {
            handleSearch();
        }
    }, [searchMode]);

    useEffect(() => {
        fetchRandom();
    }, []);

    // Debounced live search — triggers 400ms after user stops typing
    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }
        searchTimerRef.current = setTimeout(() => {
            handleSearch();
        }, 400);
        return () => clearTimeout(searchTimerRef.current);
    }, [searchQuery]);

    const fetchRandom = async () => {
        try {
            const response = await fetch(`${API_URL}/dictionary/random?limit=6`);
            const data = await response.json();
            setRandomVocab(data);
        } catch (error) {
            console.error('Error fetching random vocab:', error);
        }
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/dictionary/search?q=${encodeURIComponent(searchQuery)}&search_by=${searchMode}`);
            const data = await response.json();
            setResults(data);
        } catch (error) {
            console.error('Error searching dictionary:', error);
        } finally {
            setLoading(false);
        }
    };

    const playAudio = (word, pinyin) => {
        // Use Web Speech API for Chinese TTS
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'zh-CN';
            utterance.rate = 0.8;
            utterance.pitch = 1;
            window.speechSynthesis.speak(utterance);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-12 text-center">
                <h1 className="text-4xl font-extrabold text-slate-900 mb-4 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                    Từ điển Hán tự Thông minh
                </h1>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                    Tra cứu hơn 5,000 từ vựng HSK, chữ Hán và bộ thủ với nghĩa tiếng Việt đầy đủ.
                </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto mb-16">
                <form onSubmit={handleSearch} className="relative group">
                    <input
                        type="text"
                        placeholder="Tìm kiếm bằng Chữ Hán, Pinyin hoặc Tiếng Việt..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-6 py-5 pl-14 text-lg bg-white border-2 border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none"
                    />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={24} />
                    <button 
                        type="submit"
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/20"
                    >
                        Tra cứu
                    </button>
                </form>

                {/* Search Mode Toggles */}
                <div className="flex gap-3 mt-6 justify-center">
                    <button 
                        onClick={() => setSearchMode('all')}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${searchMode === 'all' ? 'bg-teal-600 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                    >
                        Tất cả
                    </button>
                    <button 
                        onClick={() => setSearchMode('vi')}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${searchMode === 'vi' ? 'bg-teal-600 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                    >
                        Nghĩa tiếng Việt
                    </button>
                </div>

                {/* Result count */}
                {results.length > 0 && (
                    <p className="text-center text-sm text-slate-400 mt-4">
                        Tìm thấy <span className="font-bold text-teal-600">{results.length}</span> kết quả
                    </p>
                )}
            </div>

            {/* Results Section */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500/30 border-t-teal-500"></div>
                        <p className="text-slate-400 text-sm">Đang tìm kiếm...</p>
                    </div>
                </div>
            ) : results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.map((item) => (
                        <VocabCard key={item.vocab_id} item={item} onDetail={setSelectedWord} onPlayAudio={playAudio} />
                    ))}
                </div>
            ) : searchQuery && !loading ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <Info className="mx-auto text-slate-300 mb-4" size={48} />
                    <h3 className="text-xl font-bold text-slate-600">Không tìm thấy kết quả nào cho "{searchQuery}"</h3>
                    <p className="text-slate-400 mt-2">Hãy thử tìm kiếm với từ khóa khác.</p>
                </div>
            ) : (
                /* Random Suggestions */
                <div>
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Bookmark className="text-teal-500" />
                            Từ vựng gợi ý
                        </h2>
                        <button onClick={fetchRandom} className="text-teal-600 font-medium hover:underline">Làm mới</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {randomVocab.map((item) => (
                            <VocabCard key={item.vocab_id} item={item} onDetail={setSelectedWord} onPlayAudio={playAudio} />
                        ))}
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedWord && (
                    <DetailModal 
                        item={selectedWord} 
                        onClose={() => setSelectedWord(null)} 
                        onPlayAudio={playAudio}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const VocabCard = ({ item, onDetail, onPlayAudio }) => {
    const [isPlaying, setIsPlaying] = useState(false);

    const handlePlayAudio = (e) => {
        e.stopPropagation();
        setIsPlaying(true);
        onPlayAudio(item.word, item.pinyin);
        setTimeout(() => setIsPlaying(false), 1500);
    };

    return (
        <div className="zen-card group hover:scale-[1.02] transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${getHSKStyle(item.hsk_level)}`}>
                        HSK {item.hsk_level}
                    </span>
                </div>
                <button className="text-slate-300 hover:text-teal-500 transition-colors">
                    <Bookmark size={20} />
                </button>
            </div>
            <div className="flex items-end gap-3 mb-4">
                <h3 className="text-4xl font-bold text-slate-800">{item.word}</h3>
                <div className="flex items-center gap-1 pb-1">
                    <button 
                        onClick={handlePlayAudio}
                        className={`p-1 rounded-full transition-all ${isPlaying ? 'text-teal-500 bg-teal-50 scale-110' : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50'}`}
                        title="Nghe phát âm"
                    >
                        <Volume2 size={16} className={isPlaying ? 'animate-pulse' : ''} />
                    </button>
                    <span className="text-sm italic text-slate-500">{item.pinyin}</span>
                </div>
            </div>
            <div className="space-y-2 border-t border-slate-50 pt-4">
                <div className="flex gap-2">
                    <span className="text-xs font-bold text-teal-600 uppercase tracking-wider flex-shrink-0">Việt:</span>
                    <p className="text-slate-700 font-medium">{item.meaning_vi || 'Đang cập nhật...'}</p>
                </div>
                {item.meaning_en && (
                    <div className="flex gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">Anh:</span>
                        <p className="text-slate-500 text-sm">{item.meaning_en}</p>
                    </div>
                )}
            </div>
            <button 
                onClick={() => onDetail(item)}
                className="w-full mt-6 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors flex items-center justify-center gap-2 hover:shadow-md"
            >
                Chi tiết <ChevronRight size={14} />
            </button>
        </div>
    );
};

const DetailModal = ({ item, onClose, onPlayAudio }) => {
    const [copied, setCopied] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(item.word);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePlay = () => {
        setIsPlaying(true);
        onPlayAudio(item.word, item.pinyin);
        setTimeout(() => setIsPlaying(false), 2000);
    };

    // Phân tích từng chữ trong từ
    const characters = item.word ? [...item.word] : [];
    
    // Tách pinyin thành các âm tiết (ước lượng)
    const pinyinParts = item.pinyin ? item.pinyin.split(/\s+/) : [];

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed inset-x-4 top-[8%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[600px] max-h-[84vh] overflow-y-auto bg-white rounded-3xl shadow-2xl z-50"
            >
                {/* Header */}
                <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getHSKStyle(item.hsk_level)}`}>
                            HSK {item.hsk_level}
                        </span>
                        <span className="text-sm text-slate-400">Chi tiết từ vựng</span>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Main Character Display */}
                    <div className="text-center py-6 bg-gradient-to-br from-slate-50 to-teal-50/30 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-2 right-2 flex gap-1">
                            <button 
                                onClick={handleCopy}
                                className="p-2 bg-white/80 hover:bg-white rounded-lg shadow-sm transition-all"
                                title="Sao chép"
                            >
                                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-slate-400" />}
                            </button>
                        </div>
                        
                        <h2 className="text-7xl font-bold text-slate-800 mb-3 tracking-wider">
                            {item.word}
                        </h2>
                        
                        {/* Audio + Pinyin */}
                        <div className="flex items-center justify-center gap-3">
                            <button 
                                onClick={handlePlay}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                                    isPlaying 
                                        ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30 scale-105' 
                                        : 'bg-white text-slate-600 hover:bg-teal-50 hover:text-teal-600 shadow-md'
                                }`}
                            >
                                <Volume2 size={18} className={isPlaying ? 'animate-pulse' : ''} />
                                <span className="font-medium text-lg italic">{item.pinyin}</span>
                            </button>
                        </div>
                    </div>

                    {/* Meanings Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <BookOpen size={14} />
                            Nghĩa
                        </h3>
                        
                        {/* Vietnamese Meaning */}
                        <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <span className="px-2 py-0.5 bg-teal-600 text-white text-xs font-bold rounded-md flex-shrink-0 mt-0.5">VN</span>
                                <p className="text-slate-800 font-medium text-lg leading-relaxed">
                                    {item.meaning_vi || 'Đang cập nhật...'}
                                </p>
                            </div>
                        </div>
                        
                        {/* English Meaning */}
                        {item.meaning_en && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-md flex-shrink-0 mt-0.5">EN</span>
                                    <p className="text-slate-700 text-base leading-relaxed">
                                        {item.meaning_en}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Character Breakdown */}
                    {characters.length > 1 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Hash size={14} />
                                Phân tích từng chữ
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {characters.map((char, idx) => (
                                    <div 
                                        key={idx} 
                                        className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 hover:shadow-md hover:border-teal-200 transition-all cursor-pointer group"
                                        onClick={() => onPlayAudio(char)}
                                    >
                                        <span className="text-4xl font-bold text-slate-800 group-hover:text-teal-600 transition-colors">
                                            {char}
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm text-slate-500 italic">
                                                {pinyinParts[idx] || '—'}
                                            </p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Volume2 size={12} className="text-slate-300 group-hover:text-teal-400" />
                                                <span className="text-xs text-slate-400">Nhấn để nghe</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Word Properties */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Info size={14} />
                            Thông tin
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 rounded-xl p-4">
                                <p className="text-xs text-slate-400 mb-1">Cấp độ HSK</p>
                                <p className="text-2xl font-black text-slate-800">{item.hsk_level || '—'}</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4">
                                <p className="text-xs text-slate-400 mb-1">Số chữ</p>
                                <p className="text-2xl font-black text-slate-800">{characters.length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2 pb-2">
                        <button 
                            onClick={handlePlay}
                            className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20"
                        >
                            <Volume2 size={18} />
                            Nghe phát âm
                        </button>
                        <button 
                            onClick={handleCopy}
                            className="py-3 px-6 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
                        >
                            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                            {copied ? 'Đã sao chép' : 'Sao chép'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    );
};

const getHSKStyle = (level) => {
    const styles = {
        1: 'bg-green-100 text-green-700',
        2: 'bg-blue-100 text-blue-700',
        3: 'bg-yellow-100 text-yellow-700',
        4: 'bg-orange-100 text-orange-700',
        5: 'bg-red-100 text-red-700',
        6: 'bg-purple-100 text-purple-700',
    };
    return styles[level] || 'bg-slate-100 text-slate-700';
};

export default Dictionary;
