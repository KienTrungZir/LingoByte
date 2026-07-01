import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Send, Sparkles, User, Bot, Loader2, Mic, MicOff, Volume2, Zap, Wifi, BarChart3, RefreshCw, X, Award, BookOpen, Target, MessageCircle, TrendingUp, ChevronRight } from 'lucide-react';

const API = 'http://localhost:8000/api';
const MAX_TURNS = 5;

// ─── Speech Recognition Setup ───
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const AIChat = () => {
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  // Voice
  const [engine, setEngine] = useState(1); // 1=Free, 2=Premium
  const [premiumAvailable, setPremiumAvailable] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [engineWarning, setEngineWarning] = useState(null);
  // Analysis
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analyzingLoad, setAnalyzingLoad] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const turnCount = messages.filter(m => m.role === 'user').length;

  useEffect(() => { fetchHistory(); checkPremium(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/chat/history`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(res.data);
    } catch (e) { console.error(e); }
    finally { setFetchingHistory(false); }
  };

  const checkPremium = async () => {
    try {
      const res = await axios.get(`${API}/voice/check-premium`);
      setPremiumAvailable(res.data.available);
    } catch { setPremiumAvailable(false); }
  };

  // ─── Engine 1: Free Web Speech ───
  const startFreeRecording = () => {
    if (!SpeechRecognition) { alert('Trình duyệt không hỗ trợ Speech Recognition'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setInput(text);
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopFreeRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const speakFree = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  // ─── Engine 2: Premium OpenAI ───
  const startPremiumRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await sendPremiumAudio(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (e) { alert('Không thể truy cập microphone: ' + e.message); }
  };

  const stopPremiumRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const sendPremiumAudio = async (blob) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    try {
      const res = await axios.post(`${API}/voice/turn`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });
      const { user_text, ai_text, audio_base64, engine_warning } = res.data;
      if (user_text) setMessages(prev => [...prev, { content: user_text, role: 'user' }]);
      if (ai_text) setMessages(prev => [...prev, { content: ai_text, role: 'assistant' }]);
      if (audio_base64) playBase64Audio(audio_base64);
      // Resiliency: auto-fallback
      if (engine_warning === 'OPENAI_LIMIT_REACHED') {
        setEngineWarning('OpenAI hết quota! Tự động chuyển sang Free Engine.');
        setEngine(1);
        if (ai_text) speakFree(ai_text);
      }
    } catch (e) {
      if (e.response?.status === 429) {
        setEngineWarning('OpenAI hết quota! Tự động chuyển sang Free Engine.');
        setEngine(1);
      } else {
        setMessages(prev => [...prev, { content: 'Lỗi kết nối voice. Hãy thử lại!', role: 'assistant' }]);
      }
    } finally { setLoading(false); }
  };

  const playBase64Audio = (b64) => {
    const audio = new Audio(`data:audio/mp3;base64,${b64}`);
    audio.play().catch(console.error);
  };

  // ─── Send Text Message ───
  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setMessages(prev => [...prev, { content: text, role: 'user' }]);
    setInput('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/chat/send`, { content: text }, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(prev => [...prev, res.data]);
      if (engine === 1) speakFree(res.data.content);
    } catch {
      setMessages(prev => [...prev, { content: 'Có lỗi xảy ra. Hãy thử lại!', role: 'assistant' }]);
    } finally { setLoading(false); }
  };

  // ─── Mic Toggle ───
  const toggleMic = () => {
    if (isRecording) { engine === 1 ? stopFreeRecording() : stopPremiumRecording(); }
    else { engine === 1 ? startFreeRecording() : startPremiumRecording(); }
  };

  // ─── Analysis ───
  const handleAnalyze = async () => {
    setAnalyzingLoad(true);
    try {
      const res = await axios.post(`${API}/chat/analyze`, {}, { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 });
      setAnalysis(res.data);
      setShowAnalysis(true);
    } catch { alert('Lỗi phân tích. Hãy thử lại!'); }
    finally { setAnalyzingLoad(false); }
  };

  const handleNewSession = async () => {
    try {
      await axios.delete(`${API}/chat/clear`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages([]);
      setShowAnalysis(false);
      setAnalysis(null);
      setEngineWarning(null);
    } catch { alert('Lỗi xóa lịch sử'); }
  };

  // ─── Score Ring Component ───
  const ScoreRing = ({ score, label, color }) => {
    const r = 36, c = 2 * Math.PI * r, offset = c - (score / 100) * c;
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
            <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-black text-slate-800">{score}</span>
          </div>
        </div>
        <span className="text-xs font-bold text-slate-500 text-center">{label}</span>
      </div>
    );
  };

  if (fetchingHistory) return <div className="p-8 text-center text-slate-500">Đang khởi động AI Trợ lý...</div>;

  // ─── Analysis Dashboard ───
  if (showAnalysis && analysis) {
    const s = analysis.scores || {};
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex p-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full shadow-lg shadow-amber-500/30">
              <Award className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-800">Kết quả buổi luyện tập</h1>
            <p className="text-slate-500">Phân tích bởi AI Gia sư LingoByte</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
            <div className="flex items-center justify-center mb-8">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="#e2e8f0" strokeWidth="7" />
                  <circle cx="40" cy="40" r="36" fill="none" stroke="url(#grad)" strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={2*Math.PI*36} strokeDashoffset={2*Math.PI*36 - ((s.overall||0)/100)*2*Math.PI*36} className="transition-all duration-1500" />
                  <defs><linearGradient id="grad"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#8b5cf6"/></linearGradient></defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-slate-800">{s.overall || 0}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tổng thể</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-8">
              <ScoreRing score={s.pronunciation||0} label="Phát âm" color="#14b8a6" />
              <ScoreRing score={s.grammar||0} label="Ngữ pháp" color="#6366f1" />
              <ScoreRing score={s.vocabulary||0} label="Từ vựng" color="#f59e0b" />
              <ScoreRing score={s.communication||0} label="Giao tiếp" color="#ec4899" />
            </div>
            {analysis.summary && <p className="text-center text-slate-600 bg-slate-50 rounded-xl p-4 mb-6">{analysis.summary}</p>}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <h4 className="font-bold text-emerald-700 text-sm mb-2 flex items-center gap-1"><TrendingUp size={14}/>Điểm mạnh</h4>
                <ul className="space-y-1">{(analysis.strengths||[]).map((s,i)=><li key={i} className="text-sm text-emerald-600">✓ {s}</li>)}</ul>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <h4 className="font-bold text-amber-700 text-sm mb-2 flex items-center gap-1"><Target size={14}/>Cần cải thiện</h4>
                <ul className="space-y-1">{(analysis.improvements||[]).map((s,i)=><li key={i} className="text-sm text-amber-600">→ {s}</li>)}</ul>
              </div>
            </div>
            {analysis.words_learned?.length > 0 && (
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 mb-6">
                <h4 className="font-bold text-indigo-700 text-sm mb-2 flex items-center gap-1"><BookOpen size={14}/>Từ đã học</h4>
                <div className="flex flex-wrap gap-2">{analysis.words_learned.map((w,i)=><span key={i} className="px-3 py-1 bg-white rounded-full text-sm font-bold text-indigo-600 border border-indigo-200">{w}</span>)}</div>
              </div>
            )}
            {analysis.next_suggestion && <p className="text-center text-sm text-slate-500 italic">💡 {analysis.next_suggestion}</p>}
          </div>
          <div className="text-center">
            <button onClick={handleNewSession} className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:shadow-xl transition-all flex items-center gap-2 mx-auto">
              <RefreshCw size={18}/> Bắt đầu buổi học mới <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Chat UI ───
  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/20">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">LingoByte AI Gia Sư</h1>
            <p className="text-xs text-emerald-500 font-bold flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Đang trực tuyến · Lượt {turnCount}/{MAX_TURNS}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Engine Selector */}
          <div className="flex bg-slate-100 rounded-xl p-1 text-xs font-bold">
            <button onClick={() => setEngine(1)} className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${engine===1?'bg-white text-teal-600 shadow-sm':'text-slate-400 hover:text-slate-600'}`}>
              <Wifi size={12}/> Free
            </button>
            <button onClick={() => {if(premiumAvailable) setEngine(2); else alert('Cần cấu hình OPENAI_API_KEY trong .env');}}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${engine===2?'bg-white text-violet-600 shadow-sm':'text-slate-400 hover:text-slate-600'} ${!premiumAvailable?'opacity-50':''}`}>
              <Zap size={12}/> Premium
            </button>
          </div>
          {turnCount >= MAX_TURNS && (
            <button onClick={handleAnalyze} disabled={analyzingLoad}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-1">
              {analyzingLoad ? <Loader2 size={14} className="animate-spin"/> : <BarChart3 size={14}/>} Phân tích
            </button>
          )}
          <button onClick={handleNewSession} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Phiên mới">
            <RefreshCw size={18}/>
          </button>
        </div>
      </header>

      {/* Engine Warning Banner */}
      {engineWarning && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm">
          <span className="text-amber-700 font-medium">⚡ {engineWarning}</span>
          <button onClick={() => setEngineWarning(null)} className="text-amber-400 hover:text-amber-600"><X size={16}/></button>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 max-w-lg mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-full flex items-center justify-center">
              <Bot size={40} className="text-indigo-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">你好! Xin chào! 👋</h2>
              <p className="text-slate-500">Tôi là Lǎo Shī - gia sư tiếng Trung của bạn. Hãy bắt đầu luyện tập nào!</p>
              <p className="text-xs text-slate-400 mt-2">
                {engine === 1 ? '🎤 Free Engine: Nhấn mic để nói tiếng Trung' : '🎤 Premium Engine: Ghi âm qua OpenAI Whisper'}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 w-full">
              {['你好，老师！', '我想学中文', 'Dạy tôi đếm số tiếng Trung'].map(q => (
                <button key={q} onClick={() => setInput(q)}
                  className="p-4 bg-white border border-slate-200 rounded-2xl text-left text-sm hover:border-indigo-300 hover:bg-indigo-50 transition-all text-slate-600">
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
                msg.role === 'user' ? 'bg-slate-800 text-white border-slate-700' : 'bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 border-indigo-100'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-4 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-sm shadow-lg shadow-indigo-600/10'
                  : 'bg-white text-slate-700 rounded-tl-sm border border-slate-100 shadow-sm'
              }`}>
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                {msg.role === 'assistant' && engine === 1 && (
                  <button onClick={() => speakFree(msg.content)} className="mt-2 text-indigo-400 hover:text-indigo-600 transition-colors" title="Đọc lại">
                    <Volume2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-sm">
                <Bot size={16} />
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-tl-sm border border-slate-100 shadow-sm flex items-center gap-2">
                <Loader2 className="animate-spin text-indigo-400" size={16} />
                <span className="text-slate-400 text-sm">{engine === 2 ? 'Đang xử lý giọng nói...' : 'Đang suy nghĩ...'}</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Session Progress Bar */}
      {turnCount > 0 && (
        <div className="px-6 py-1 bg-white border-t border-slate-50">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">Tiến độ</span>
            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
              <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full transition-all duration-500" style={{width:`${(turnCount/MAX_TURNS)*100}%`}}/>
            </div>
            <span className="text-[10px] font-bold text-slate-400">{turnCount}/{MAX_TURNS}</span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 shrink-0">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center gap-3">
          {/* Mic Button */}
          <button type="button" onClick={toggleMic} disabled={loading}
            className={`p-3 rounded-2xl transition-all shrink-0 ${
              isRecording
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600'
            }`}>
            {isRecording ? <MicOff size={20}/> : <Mic size={20}/>}
          </button>
          <input type="text" placeholder={isRecording ? '🎤 Đang nghe...' : 'Nhập tin nhắn hoặc nhấn mic để nói...'}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            value={input} onChange={e => setInput(e.target.value)} disabled={isRecording}
          />
          <button type="submit" disabled={!input.trim() || loading}
            className={`p-3 rounded-2xl transition-all shrink-0 ${
              input.trim() && !loading ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}>
            <Send size={20}/>
          </button>
        </form>
        <div className="flex justify-between max-w-4xl mx-auto mt-2">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1">
            {engine === 1 ? <><Wifi size={10}/> Free Web Speech</> : <><Zap size={10}/> Premium OpenAI</>}
          </p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">LingoByte AI</p>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
