import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Trophy, TrendingUp, Swords, Flame, BookOpen, Crown, Medal, Award, ChevronUp, ChevronDown, Minus, Star, Zap, Target } from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000';

const Leaderboard = () => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('progress'); // 'progress' | 'elo'
  const [progressData, setProgressData] = useState(null);
  const [eloData, setEloData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchData();
  }, [token, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'progress') {
        const res = await axios.get(`${API_URL}/api/leaderboard/progress`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProgressData(res.data);
      } else {
        const res = await axios.get(`${API_URL}/api/leaderboard/elo`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEloData(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải bảng xếp hạng:', err);
    } finally {
      setLoading(false);
    }
  };

  const data = activeTab === 'progress' ? progressData : eloData;
  const entries = data?.entries || [];
  const myEntry = data?.my_entry;
  const myRank = data?.my_rank;

  // Rank tier colors
  const getRankTier = (elo) => {
    if (elo >= 2000) return { name: 'Grandmaster', color: 'from-red-500 to-orange-500', textColor: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
    if (elo >= 1800) return { name: 'Master', color: 'from-purple-500 to-pink-500', textColor: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' };
    if (elo >= 1600) return { name: 'Diamond', color: 'from-cyan-400 to-blue-500', textColor: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' };
    if (elo >= 1400) return { name: 'Gold', color: 'from-yellow-400 to-amber-500', textColor: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
    if (elo >= 1200) return { name: 'Silver', color: 'from-slate-300 to-slate-400', textColor: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/30' };
    return { name: 'Bronze', color: 'from-amber-600 to-amber-800', textColor: 'text-amber-600', bg: 'bg-amber-600/10', border: 'border-amber-600/30' };
  };

  const podiumColors = [
    { bg: 'bg-gradient-to-br from-yellow-400 to-amber-500', shadow: 'shadow-yellow-500/40', ring: 'ring-yellow-300', icon: <Crown size={28} className="text-yellow-900" /> },
    { bg: 'bg-gradient-to-br from-slate-300 to-slate-400', shadow: 'shadow-slate-400/40', ring: 'ring-slate-200', icon: <Medal size={24} className="text-slate-700" /> },
    { bg: 'bg-gradient-to-br from-amber-600 to-amber-700', shadow: 'shadow-amber-700/40', ring: 'ring-amber-500', icon: <Award size={24} className="text-amber-200" /> },
  ];

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2 flex items-center gap-3">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-3 rounded-2xl shadow-lg shadow-amber-500/20">
            <Trophy className="text-white" size={28} />
          </div>
          Bảng Xếp Hạng
        </h1>
        <p className="text-slate-500 font-medium ml-16">Chinh phục đỉnh cao — Cạnh tranh cùng cộng đồng</p>
      </header>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-8 bg-slate-100 p-1.5 rounded-2xl max-w-md">
        <button
          onClick={() => setActiveTab('progress')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 ${
            activeTab === 'progress'
              ? 'bg-white text-teal-700 shadow-lg shadow-teal-500/10'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <TrendingUp size={18} />
          Tiến Độ Học Tập
        </button>
        <button
          onClick={() => setActiveTab('elo')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 ${
            activeTab === 'elo'
              ? 'bg-white text-indigo-700 shadow-lg shadow-indigo-500/10'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Swords size={18} />
          Đấu Trường Elo
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin"></div>
            <p className="text-slate-400 font-medium">Đang tải bảng xếp hạng...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Podium - Top 3 */}
          {entries.length >= 3 && (
            <div className="flex justify-center items-end gap-4 mb-12">
              {/* 2nd Place */}
              <div className="flex flex-col items-center group" style={{ animation: 'slideUp 0.6s ease-out 0.2s both' }}>
                <div className={`w-20 h-20 rounded-full ${podiumColors[1].bg} ${podiumColors[1].shadow} shadow-xl flex items-center justify-center text-2xl font-black text-white ring-4 ${podiumColors[1].ring} mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  {getInitials(entries[1]?.username)}
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 justify-center mb-1">{podiumColors[1].icon}</div>
                  <p className="font-bold text-slate-800 text-sm truncate max-w-[100px]">{entries[1]?.username}</p>
                  <p className="text-xs text-slate-500 font-medium">
                    {activeTab === 'progress' ? `${(entries[1]?.xp || 0).toLocaleString()} XP` : `${entries[1]?.elo_rating} Elo`}
                  </p>
                </div>
                <div className="w-24 h-20 bg-gradient-to-t from-slate-300 to-slate-200 rounded-t-2xl mt-3 flex items-center justify-center">
                  <span className="text-3xl font-black text-slate-500/60">2</span>
                </div>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center group -mt-8" style={{ animation: 'slideUp 0.6s ease-out both' }}>
                <div className="relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 animate-bounce">
                    <Star size={20} className="text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className={`w-24 h-24 rounded-full ${podiumColors[0].bg} ${podiumColors[0].shadow} shadow-2xl flex items-center justify-center text-3xl font-black text-white ring-4 ${podiumColors[0].ring} mb-3 group-hover:scale-110 transition-transform duration-300`}>
                    {getInitials(entries[0]?.username)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 justify-center mb-1">{podiumColors[0].icon}</div>
                  <p className="font-bold text-slate-800 truncate max-w-[120px]">{entries[0]?.username}</p>
                  <p className="text-sm text-slate-500 font-medium">
                    {activeTab === 'progress' ? `${(entries[0]?.xp || 0).toLocaleString()} XP` : `${entries[0]?.elo_rating} Elo`}
                  </p>
                </div>
                <div className="w-28 h-28 bg-gradient-to-t from-yellow-400 to-amber-300 rounded-t-2xl mt-3 flex items-center justify-center shadow-inner">
                  <span className="text-4xl font-black text-yellow-700/60">1</span>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center group" style={{ animation: 'slideUp 0.6s ease-out 0.4s both' }}>
                <div className={`w-18 h-18 w-[72px] h-[72px] rounded-full ${podiumColors[2].bg} ${podiumColors[2].shadow} shadow-xl flex items-center justify-center text-xl font-black text-white ring-4 ${podiumColors[2].ring} mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  {getInitials(entries[2]?.username)}
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 justify-center mb-1">{podiumColors[2].icon}</div>
                  <p className="font-bold text-slate-800 text-sm truncate max-w-[100px]">{entries[2]?.username}</p>
                  <p className="text-xs text-slate-500 font-medium">
                    {activeTab === 'progress' ? `${(entries[2]?.xp || 0).toLocaleString()} XP` : `${entries[2]?.elo_rating} Elo`}
                  </p>
                </div>
                <div className="w-24 h-16 bg-gradient-to-t from-amber-700 to-amber-500 rounded-t-2xl mt-3 flex items-center justify-center">
                  <span className="text-3xl font-black text-amber-900/50">3</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Leaderboard Table */}
            <div className="lg:col-span-2">
              <div className="zen-card bg-white p-0 overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-6 py-4 bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider font-bold text-slate-400">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-4">Người chơi</div>
                  {activeTab === 'progress' ? (
                    <>
                      <div className="col-span-2 text-center">XP</div>
                      <div className="col-span-2 text-center">Chuỗi ngày</div>
                      <div className="col-span-3 text-center">Từ đã học</div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-2 text-center">Elo</div>
                      <div className="col-span-2 text-center">Thắng/Thua</div>
                      <div className="col-span-3 text-center">Tỷ lệ thắng</div>
                    </>
                  )}
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-50">
                  {entries.map((entry, idx) => {
                    const isMe = entry.user_id === user?.user_id;
                    const tier = getRankTier(entry.elo_rating);
                    
                    return (
                      <div
                        key={entry.user_id}
                        className={`grid grid-cols-12 gap-2 px-6 py-4 items-center transition-all duration-200 hover:bg-slate-50/80 ${
                          isMe ? 'bg-teal-50/60 border-l-4 border-l-teal-500' : ''
                        } ${idx < 3 ? 'bg-gradient-to-r from-amber-50/30 to-transparent' : ''}`}
                        style={{ animation: `fadeIn 0.3s ease-out ${idx * 0.05}s both` }}
                      >
                        {/* Rank */}
                        <div className="col-span-1 text-center">
                          {idx < 3 ? (
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-black text-white ${
                              idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-slate-400' : 'bg-amber-600'
                            }`}>
                              {entry.rank}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-bold">{entry.rank}</span>
                          )}
                        </div>

                        {/* User */}
                        <div className="col-span-4 flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                            isMe ? 'bg-teal-500' : 'bg-gradient-to-br from-slate-600 to-slate-800'
                          }`}>
                            {getInitials(entry.username)}
                          </div>
                          <div>
                            <p className={`font-bold text-sm ${isMe ? 'text-teal-700' : 'text-slate-800'}`}>
                              {entry.username} {isMe && <span className="text-teal-500 text-xs ml-1">(Bạn)</span>}
                            </p>
                            {activeTab === 'elo' && (
                              <p className={`text-xs font-medium ${tier.textColor}`}>{tier.name}</p>
                            )}
                          </div>
                        </div>

                        {activeTab === 'progress' ? (
                          <>
                            {/* XP */}
                            <div className="col-span-2 text-center">
                              <span className="font-bold text-slate-800 text-sm">{(entry.xp || 0).toLocaleString()}</span>
                            </div>
                            {/* Streak */}
                            <div className="col-span-2 text-center">
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-orange-600">
                                <Flame size={14} className="text-orange-500" />
                                {entry.streak || 0}
                              </span>
                            </div>
                            {/* Words */}
                            <div className="col-span-3 text-center">
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-600">
                                <BookOpen size={14} />
                                {entry.words_learned || 0} từ
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Elo */}
                            <div className="col-span-2 text-center">
                              <span className={`font-black text-sm bg-gradient-to-r ${tier.color} bg-clip-text text-transparent`}>
                                {entry.elo_rating}
                              </span>
                            </div>
                            {/* W/L */}
                            <div className="col-span-2 text-center">
                              <span className="text-sm font-medium">
                                <span className="text-emerald-600">{entry.wins}W</span>
                                <span className="text-slate-300 mx-1">/</span>
                                <span className="text-red-500">{entry.losses}L</span>
                              </span>
                            </div>
                            {/* Win Rate */}
                            <div className="col-span-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(entry.win_rate, 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-bold text-slate-600">{entry.win_rate}%</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {entries.length === 0 && (
                    <div className="py-16 text-center text-slate-400">
                      <Trophy size={48} className="mx-auto mb-4 opacity-30" />
                      <p className="text-lg font-bold">Chưa có dữ liệu xếp hạng</p>
                      <p className="text-sm mt-1">Hãy bắt đầu học và chơi game để lên bảng!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar — My Stats */}
            <div className="space-y-6">
              {/* My Rank Card */}
              {myEntry && (
                <div className="zen-card bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-teal-500/20 to-transparent rounded-bl-full"></div>
                  <div className="relative z-10">
                    <p className="text-xs uppercase tracking-widest text-teal-300 font-bold mb-4">Vị Trí Của Bạn</p>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-2xl font-black shadow-lg shadow-teal-500/30">
                        #{myRank}
                      </div>
                      <div>
                        <p className="font-bold text-lg">{myEntry.username}</p>
                        {activeTab === 'elo' && (
                          <p className={`text-sm font-medium ${getRankTier(myEntry.elo_rating).textColor}`}>
                            {getRankTier(myEntry.elo_rating).name}
                          </p>
                        )}
                      </div>
                    </div>

                    {activeTab === 'progress' ? (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/5 rounded-xl p-3 text-center backdrop-blur-sm">
                          <Zap size={18} className="mx-auto text-yellow-400 mb-1" />
                          <p className="font-black text-lg">{(myEntry.xp || 0).toLocaleString()}</p>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">XP</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-center backdrop-blur-sm">
                          <Flame size={18} className="mx-auto text-orange-400 mb-1" />
                          <p className="font-black text-lg">{myEntry.streak || 0}</p>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">Streak</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-center backdrop-blur-sm">
                          <BookOpen size={18} className="mx-auto text-teal-400 mb-1" />
                          <p className="font-black text-lg">{myEntry.words_learned || 0}</p>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">Từ</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white/5 rounded-xl p-3">
                          <span className="text-sm text-slate-300">Elo Rating</span>
                          <span className={`font-black text-xl bg-gradient-to-r ${getRankTier(myEntry.elo_rating).color} bg-clip-text text-transparent`}>
                            {myEntry.elo_rating}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-emerald-500/10 rounded-xl p-3 text-center border border-emerald-500/20">
                            <p className="font-black text-lg text-emerald-400">{myEntry.wins}</p>
                            <p className="text-[10px] uppercase text-emerald-300/60">Thắng</p>
                          </div>
                          <div className="bg-red-500/10 rounded-xl p-3 text-center border border-red-500/20">
                            <p className="font-black text-lg text-red-400">{myEntry.losses}</p>
                            <p className="text-[10px] uppercase text-red-300/60">Thua</p>
                          </div>
                          <div className="bg-slate-500/10 rounded-xl p-3 text-center border border-slate-500/20">
                            <p className="font-black text-lg text-slate-300">{myEntry.draws}</p>
                            <p className="text-[10px] uppercase text-slate-400/60">Hòa</p>
                          </div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3">
                          <div className="flex justify-between mb-2">
                            <span className="text-xs text-slate-400">Tỷ lệ thắng</span>
                            <span className="text-sm font-bold text-teal-300">{myEntry.win_rate}%</span>
                          </div>
                          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-700"
                              style={{ width: `${Math.min(myEntry.win_rate, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Elo Tier Legend (only for elo tab) */}
              {activeTab === 'elo' && (
                <div className="zen-card bg-white p-6">
                  <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                    <Target size={16} className="text-indigo-500" />
                    Cấp Bậc Elo
                  </h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Grandmaster', min: '2000+', color: 'from-red-500 to-orange-500' },
                      { name: 'Master', min: '1800+', color: 'from-purple-500 to-pink-500' },
                      { name: 'Diamond', min: '1600+', color: 'from-cyan-400 to-blue-500' },
                      { name: 'Gold', min: '1400+', color: 'from-yellow-400 to-amber-500' },
                      { name: 'Silver', min: '1200+', color: 'from-slate-300 to-slate-400' },
                      { name: 'Bronze', min: '<1200', color: 'from-amber-600 to-amber-800' },
                    ].map(tier => (
                      <div key={tier.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${tier.color}`}></div>
                          <span className="text-sm font-medium text-slate-700">{tier.name}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{tier.min}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Stats for Progress Tab */}
              {activeTab === 'progress' && (
                <div className="zen-card bg-gradient-to-br from-teal-600 to-emerald-700 text-white p-6 relative overflow-hidden">
                  <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="relative z-10">
                    <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                      <Star size={16} className="text-teal-200" />
                      Mẹo Tăng Hạng
                    </h3>
                    <ul className="space-y-3 text-sm text-teal-100">
                      <li className="flex items-start gap-2">
                        <ChevronUp size={16} className="text-teal-300 mt-0.5 flex-shrink-0" />
                        Hoàn thành bài học mỗi ngày để giữ streak
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronUp size={16} className="text-teal-300 mt-0.5 flex-shrink-0" />
                        Ôn tập Flashcard để nhận XP bonus
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronUp size={16} className="text-teal-300 mt-0.5 flex-shrink-0" />
                        Luyện viết chữ Hán để kiếm thêm điểm
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default Leaderboard;
