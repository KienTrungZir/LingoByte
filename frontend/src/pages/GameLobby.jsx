import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Gamepad2, Plus, Users, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import PublicProfileModal from '../components/PublicProfileModal';

const API_URL = 'http://localhost:8000';

const GameLobby = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [selectedUsername, setSelectedUsername] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Friends & Online status
  const [friends, setFriends] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [invitingId, setInvitingId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomsRes, friendsRes, onlineRes] = await Promise.all([
        axios.get(`${API_URL}/api/game/rooms`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/friends/list`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/notifications/online`)
      ]);
      setRooms(roomsRes.data);
      setFriends(friendsRes.data.filter(f => f.status === 'accepted'));
      setOnlineUsers(onlineRes.data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu sảnh:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
    const interval = setInterval(fetchData, 5000); // Auto refresh every 5s
    return () => clearInterval(interval);
  }, [token]);

  const handleCreateRoom = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/game/rooms`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate(`/game/${response.data.room_id}`);
    } catch (error) {
      alert("Không thể tạo phòng lúc này.");
    }
  };

  const handleJoinRoom = (roomId) => {
    navigate(`/game/${roomId}`);
  };

  const handleInviteFriend = async (friendId) => {
    setInvitingId(friendId);
    try {
      // 1. Create Room
      const roomRes = await axios.post(`${API_URL}/api/game/rooms`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const roomId = roomRes.data.room_id;
      
      // 2. Send Invite via Notification API
      await axios.post(`${API_URL}/api/notifications/game/invite`, {
        friend_id: friendId,
        room_id: roomId
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      // 3. Navigate to room
      navigate(`/game/${roomId}`);
    } catch(e) { 
      alert("Không thể gửi lời mời. Người dùng có thể đã offline.");
      setInvitingId(null);
    }
  }

  const getInitials = (name) => name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div className="min-h-screen bg-slate-900 bg-[url('https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center text-white p-8 font-sans flex items-center justify-center relative">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-0"></div>

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LOBBY SECTION */}
        <div className="lg:col-span-2 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
            <div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-blue-400 flex items-center gap-4">
                <Gamepad2 size={40} className="text-teal-400" />
                SẢNH CHỜ
              </h1>
              <p className="text-slate-300 mt-2 font-medium tracking-wider uppercase text-sm">Tìm đối thủ xứng tầm</p>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={fetchData}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-slate-300"
                title="Làm mới"
              >
                <RefreshCw size={24} className={loading ? "animate-spin" : ""} />
              </button>
              <button 
                onClick={handleCreateRoom}
                className="flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 rounded-xl font-bold transition-all shadow-lg shadow-teal-500/30 whitespace-nowrap"
              >
                <Plus size={20} />
                TẠO PHÒNG
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {rooms.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                <Gamepad2 size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-xl font-bold">Chưa có phòng nào đang chờ.</p>
                <p className="text-sm mt-2 opacity-70">Hãy là người đầu tiên tạo phòng nhé!</p>
              </div>
            ) : (
              rooms.map((room) => (
                <div key={room.id} className="bg-white/5 hover:bg-white/10 rounded-2xl p-6 border border-white/10 transition-all flex flex-col justify-between group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-teal-300 font-bold mb-1">
                        PHÒNG #{room.id}
                      </div>
                      <div className="text-xl font-black flex items-center gap-2">
                        <Users size={20} className="text-slate-400" />
                        <button 
                          className="hover:text-teal-400 transition-colors text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUsername(room.host);
                            setIsProfileModalOpen(true);
                          }}
                        >
                          {room.host}
                        </button> 
                        <span className="text-sm font-normal text-slate-400">vs</span> ?
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={room.host === user?.username}
                    className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg ${
                      room.host === user?.username 
                      ? 'bg-slate-600/50 text-slate-400 cursor-not-allowed border border-white/5' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/30 group-hover:-translate-y-1'
                    }`}
                  >
                    {room.host === user?.username ? 'Đang chờ đối thủ...' : 'THAM GIA NGAY'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FRIENDS SECTION */}
        <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 p-8 shadow-2xl flex flex-col h-full max-h-[600px]">
          <h2 className="text-2xl font-black text-white flex items-center gap-3 mb-6">
            <Users size={28} className="text-pink-400" />
            Bạn bè Online
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {friends.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                <Users size={32} className="mx-auto mb-3 opacity-30" />
                <p>Bạn chưa có bạn bè nào.</p>
                <p className="text-sm mt-1">Hãy kết bạn để cùng chơi game nhé!</p>
              </div>
            ) : (
              friends.map(f => {
                const isOnline = onlineUsers.includes(f.user.user_id);
                return (
                  <div key={f.friendship_id} className="bg-white/5 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {f.user.avatar_url ? (
                          <img src={f.user.avatar_url} className="w-10 h-10 rounded-full object-cover border border-white/20" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center font-bold text-white">
                            {getInitials(f.user.username)}
                          </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-800 ${isOnline ? 'bg-emerald-400' : 'bg-slate-500'}`}></div>
                      </div>
                      <div>
                        <button 
                          onClick={() => { setSelectedUsername(f.user.username); setIsProfileModalOpen(true); }}
                          className="font-bold text-slate-200 hover:text-white transition-colors block text-left"
                        >
                          {f.user.username}
                        </button>
                        <p className="text-[11px] text-slate-400">{isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}</p>
                      </div>
                    </div>
                    {isOnline && (
                      <button
                        onClick={() => handleInviteFriend(f.user.user_id)}
                        disabled={invitingId === f.user.user_id}
                        className="p-2 bg-teal-500/20 text-teal-300 hover:bg-teal-500 hover:text-white rounded-lg transition-all"
                        title="Mời chơi game"
                      >
                        {invitingId === f.user.user_id ? <CheckCircle2 size={18} /> : <Send size={18} />}
                      </button>
                    )}
                  </div>
                );
              })
            )}
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

export default GameLobby;
