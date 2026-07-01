import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, MessageCircle, X } from 'lucide-react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [invite, setInvite] = useState(null);
  const [lastDirectMessage, setLastDirectMessage] = useState(null);
  const [dmToast, setDmToast] = useState(null);
  const wsRef = useRef(null);
  const navigate = useNavigate();
  const locationRef = useRef(window.location.pathname);

  // Track current path
  useEffect(() => {
    const interval = setInterval(() => {
      locationRef.current = window.location.pathname;
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!token || !user) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const connectWebSocket = () => {
      const wsUrl = `ws://localhost:8000/api/notifications/ws?token=${token}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'game_invite') {
            setInvite({
              senderId: data.sender_id,
              senderUsername: data.sender_username,
              roomId: data.room_id
            });
          } else if (data.type === 'direct_message') {
            setLastDirectMessage(data.message);
            
            // Show toast if NOT on the messages page
            if (!locationRef.current.startsWith('/messages')) {
              setDmToast({
                senderUsername: data.message.sender_username,
                senderAvatar: data.message.sender_avatar,
                content: data.message.content,
                senderId: data.message.sender_id
              });
              setTimeout(() => setDmToast(null), 5000);
            }
          }
        } catch (e) {
          console.error("Failed to parse notification", e);
        }
      };
      
      wsRef.current.onclose = () => {
        setTimeout(connectWebSocket, 5000);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [token, user]);

  const acceptInvite = () => {
    if (invite) {
      navigate(`/game/${invite.roomId}`);
      setInvite(null);
    }
  };

  const declineInvite = () => {
    setInvite(null);
  };

  return (
    <NotificationContext.Provider value={{ lastDirectMessage }}>
      {children}
      
      {/* Global Game Invite Toast */}
      {invite && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-bounce-in">
          <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-2xl border border-slate-700 flex flex-col gap-3 min-w-[300px]">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="bg-teal-500 p-2 rounded-lg">
                  <Gamepad2 size={24} className="text-white animate-pulse"/>
                </div>
                <div>
                  <h4 className="font-bold text-lg">Lời mời chơi game!</h4>
                  <p className="text-sm text-slate-300"><span className="font-bold text-teal-400">{invite.senderUsername}</span> đã mời bạn.</p>
                </div>
              </div>
              <button onClick={declineInvite} className="text-slate-400 hover:text-white transition-colors">
                <X size={20}/>
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={acceptInvite} className="flex-1 bg-teal-500 hover:bg-teal-600 font-bold py-2 rounded-xl transition-colors">Tham gia ngay</button>
              <button onClick={declineInvite} className="flex-1 bg-slate-700 hover:bg-slate-600 font-bold py-2 rounded-xl transition-colors">Để sau</button>
            </div>
          </div>
        </div>
      )}

      {/* Global DM Toast */}
      {dmToast && (
        <div className="fixed bottom-6 right-6 z-[9998]">
          <div 
            onClick={() => { navigate('/messages'); setDmToast(null); }}
            className="bg-white text-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-200 flex items-center gap-3 min-w-[300px] max-w-[380px] cursor-pointer hover:shadow-3xl transition-shadow"
          >
            <div className="bg-teal-100 p-2.5 rounded-xl shrink-0">
              <MessageCircle size={20} className="text-teal-600"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{dmToast.senderUsername}</p>
              <p className="text-sm text-slate-500 truncate">{dmToast.content}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setDmToast(null); }} className="text-slate-400 hover:text-slate-600 shrink-0">
              <X size={16}/>
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
