import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Rocket, Sparkles, Send, Type, XCircle, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PublicProfileModal from '../components/PublicProfileModal';

const ROWS = 6;
const COLS = 7;

const RadicalDropGame = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const socketRef = useRef(null);

  // Game state (synced with server)
  const [gameState, setGameState] = useState({
    board: Array.from({ length: COLS }, () => []),
    turn: 1,
    p1Score: 0,
    p2Score: 0,
    logs: [],
    timeLeft: 45,
    status: 'waiting',
    winner: null,
    host_username: '...',
    guest_username: '...'
  });

  const [inputValue, setInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [playerIndex, setPlayerIndex] = useState(null); // 1 or 2
  const [selectedUsername, setSelectedUsername] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Auto-scroll logs
  const logsEndRef = useRef(null);
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.logs]);

  // WebSocket Connection
  useEffect(() => {
    if (!token || !roomId) return;

    const wsUrl = `ws://127.0.0.1:8000/api/game/ws/${roomId}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'state_update') {
        setGameState(data.state);
        
        // Determine player index if not set
        if (data.state.host_username === user?.username) setPlayerIndex(1);
        else if (data.state.guest_username === user?.username) setPlayerIndex(2);
      } else if (data.type === 'error') {
        setErrorMsg(data.message);
        setTimeout(() => setErrorMsg(''), 3000);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => ws.close();
  }, [roomId, token, user?.username]);

  const quickRadicals = ['木', '口', '日', '月', '人', '亻', '女', '子', '门', '水', '氵', '火', '土', '心', '田', '力', '又', '金', '石', '牛', '马', '雨', '鸟', '青'];

  const handleDrop = (colIndex) => {
    if (gameState.status !== 'playing') return;
    if (gameState.turn !== playerIndex) {
      setErrorMsg("Chưa tới lượt của bạn!");
      setTimeout(() => setErrorMsg(''), 2000);
      return;
    }
    if (inputValue.trim() === '') return;

    const msg = {
      type: 'drop',
      colIndex: colIndex,
      radical: inputValue.trim()[0]
    };

    socketRef.current?.send(JSON.stringify(msg));
    setInputValue('');
  };

  const isMyTurn = gameState.turn === playerIndex;

  return (
    <div className="min-h-screen bg-slate-900 bg-[url('https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center text-white p-8 font-sans flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-0"></div>

      {/* Exit Button */}
      <button 
        onClick={() => navigate('/game')}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-100 border border-red-500/30 rounded-full transition-all font-bold backdrop-blur-md shadow-lg"
      >
        <XCircle size={20} />
        Thoát Phòng
      </button>

      <div className="relative z-10 w-full max-w-7xl flex gap-8 h-[85vh]">
        
        {/* Left Panel: Logs */}
        <div className="w-80 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-6 flex flex-col shadow-2xl">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 uppercase tracking-wider text-teal-300">
            <Sparkles size={20} /> Đã Tạo
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
            {gameState.logs.map(log => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={log.id} 
                className={`p-3 rounded-xl border ${log.player === 1 ? 'bg-teal-500/20 border-teal-500/30' : 'bg-blue-400/20 border-blue-400/30'}`}
              >
                <div className="text-sm font-medium">{log.text}</div>
                <div className="text-xs opacity-70 mt-1 flex justify-between">
                  <span>{log.player === 1 ? gameState.host_username : gameState.guest_username}</span>
                  <span className="text-teal-300">+{log.score}</span>
                </div>
              </motion.div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Center: Game Board & UI */}
        <div className="flex-1 flex flex-col items-center">
          
          {/* Top Bar: Scores */}
          <div className="flex justify-between items-center w-full max-w-3xl mb-8 bg-white/10 backdrop-blur-md rounded-full p-2 border border-white/20 shadow-xl">
            <div className={`flex items-center gap-4 px-6 py-3 rounded-full transition-all ${gameState.turn === 1 ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30' : 'text-slate-300'}`}>
              <div className="text-3xl">👽</div>
              <div>
                <div className="font-bold tracking-widest text-xs uppercase opacity-70">Host</div>
                <button 
                  className="font-bold truncate max-w-[100px] hover:text-teal-200 transition-colors block text-left"
                  onClick={() => {
                    setSelectedUsername(gameState.host_username);
                    setIsProfileModalOpen(true);
                  }}
                >
                  {gameState.host_username}
                </button>
                <div className="font-black text-xl">{gameState.p1Score} PTS</div>
              </div>
            </div>
            
            <div className="text-center relative">
              <div className="text-xs uppercase tracking-[0.2em] opacity-70">Room #{roomId}</div>
              <div className="font-black text-xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-blue-400">MULTIPLAYER</div>
              {gameState.status === 'playing' && (
                <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 font-bold text-lg px-4 py-1 rounded-full ${gameState.timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>
                  ⏳ {gameState.timeLeft}s
                </div>
              )}
            </div>

            <div className={`flex items-center gap-4 px-6 py-3 rounded-full transition-all ${gameState.turn === 2 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-300'}`}>
              <div className="text-right">
                <div className="font-bold tracking-widest text-xs uppercase opacity-70">Guest</div>
                <button 
                  className="font-bold truncate max-w-[100px] hover:text-blue-200 transition-colors block text-right"
                  onClick={() => {
                    if (gameState.guest_username && gameState.guest_username !== '...') {
                      setSelectedUsername(gameState.guest_username);
                      setIsProfileModalOpen(true);
                    }
                  }}
                >
                  {gameState.guest_username || 'Waiting...'}
                </button>
                <div className="font-black text-xl">{gameState.p2Score} PTS</div>
              </div>
              <div className="text-3xl">🤖</div>
            </div>
          </div>

          {/* Status Messages */}
          {gameState.status === 'waiting' && (
            <div className="mb-4 text-yellow-400 font-bold bg-yellow-500/10 px-8 py-3 rounded-2xl border border-yellow-500/20 animate-pulse flex items-center gap-3">
              <Users size={24} />
              Đang chờ đối thủ tham gia...
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 text-red-400 font-bold bg-red-500/10 px-6 py-2 rounded-full border border-red-500/20 animate-bounce">
              ⚠️ {errorMsg}
            </div>
          )}

          {gameState.status === 'finished' && (
            <div className="text-4xl font-black mb-4 tracking-widest animate-pulse">
              {gameState.winner ? (
                <span className={gameState.winner === 1 ? 'text-teal-400' : 'text-blue-400'}>
                  🎉 {gameState.winner === 1 ? gameState.host_username : gameState.guest_username} THẮNG! 🎉
                </span>
              ) : (
                <span className="text-yellow-400">HÒA NHAU!</span>
              )}
            </div>
          )}

          {/* Grid Container */}
          <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] p-4 shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-white/20 mb-8 relative">
            {gameState.status !== 'playing' && (
               <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] rounded-[2rem] z-20 flex items-center justify-center">
                  <p className="text-2xl font-bold opacity-50 uppercase tracking-widest">
                    {gameState.status === 'waiting' ? 'Waiting for opponent' : 'Game Over'}
                  </p>
               </div>
            )}
            <div className="grid grid-cols-7 gap-4">
              {gameState.board.map((col, cIndex) => (
                <div 
                  key={cIndex} 
                  className={`flex flex-col-reverse gap-4 relative group ${isMyTurn ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  onClick={() => handleDrop(cIndex)}
                >
                  {/* Column Hover Indicator */}
                  {isMyTurn && gameState.status === 'playing' && (
                    <div className={`absolute -top-12 left-1/2 -translate-x-1/2 text-2xl opacity-0 group-hover:opacity-100 transition-opacity ${playerIndex === 1 ? 'text-teal-400' : 'text-blue-400'}`}>
                      ⬇️
                    </div>
                  )}

                  {/* Empty Slots Background */}
                  {Array.from({ length: ROWS }).map((_, rIndex) => (
                    <div key={`bg-${cIndex}-${rIndex}`} className="w-16 h-16 rounded-full bg-white/5 border-2 border-white/10 shadow-inner"></div>
                  ))}

                  {/* Actual Pieces */}
                  <div className="absolute bottom-0 w-full flex flex-col-reverse gap-4 pointer-events-none">
                    {col.map((piece) => (
                      <motion.div
                        key={piece.id}
                        initial={{ y: -500, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg ${
                          piece.player === 1 
                            ? 'bg-gradient-to-br from-teal-400 to-teal-600 text-white border-2 border-teal-300' 
                            : 'bg-gradient-to-br from-blue-500 to-blue-700 text-white border-2 border-blue-400'
                        } ${piece.isStar ? 'shadow-[0_0_20px_rgba(94,234,212,0.8)] border-teal-200' : ''}`}
                      >
                        {piece.text}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Input Panel */}
          <div className={`w-full max-w-2xl bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-2xl transition-opacity ${!isMyTurn ? 'opacity-50 grayscale' : ''}`}>
            <div className="flex gap-2 mb-4 justify-center flex-wrap">
              {quickRadicals.map(rad => (
                <button 
                  key={rad}
                  disabled={!isMyTurn}
                  onClick={() => setInputValue(rad)}
                  className={`w-10 h-10 rounded-lg bg-white/5 hover:bg-teal-500/40 border border-white/10 text-xl font-bold transition-colors ${!isMyTurn ? 'cursor-not-allowed' : ''}`}
                >
                  {rad}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Type className="text-white/50" size={20} />
                </div>
                <input
                  type="text"
                  maxLength={1}
                  disabled={!isMyTurn}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={isMyTurn ? "Lượt của bạn - Nhập bộ thủ..." : `Chờ ${gameState.turn === 1 ? gameState.host_username : gameState.guest_username}...`}
                  className="w-full bg-white/5 border-2 border-white/20 rounded-xl py-4 pl-12 pr-4 text-xl font-bold text-white placeholder-white/40 focus:outline-none focus:border-teal-400 focus:bg-white/10 transition-all"
                />
              </div>
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <span>{isMyTurn ? "Chọn ô để thả!" : "Vui lòng đợi..."}</span>
                <Rocket size={20} className={isMyTurn ? "animate-bounce" : ""} />
              </div>
            </div>
          </div>

        </div>
      </div>

      <PublicProfileModal 
        username={selectedUsername} 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </div>
  );
};

export default RadicalDropGame;
