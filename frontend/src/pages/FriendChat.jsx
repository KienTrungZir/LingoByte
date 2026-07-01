import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageCircle, Send, ArrowLeft, Search, Circle, 
  Users, Smile, ImageIcon, Check, CheckCheck
} from 'lucide-react'

const API_URL = 'http://localhost:8000/api'

const FriendChat = () => {
  const { token, user } = useAuth()
  const { lastDirectMessage } = useNotification()
  const [conversations, setConversations] = useState([])
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loadingConv, setLoadingConv] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [onlineUsers, setOnlineUsers] = useState([])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch conversations list
  const fetchConversations = async () => {
    try {
      const [convRes, onlineRes] = await Promise.all([
        axios.get(`${API_URL}/friends/messages/conversations`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/notifications/online`)
      ])
      setConversations(convRes.data)
      setOnlineUsers(onlineRes.data)
    } catch (err) {
      console.error('Fetch conversations failed:', err)
    } finally {
      setLoadingConv(false)
    }
  }

  // Fetch messages with selected friend
  const fetchMessages = async (friendId) => {
    setLoadingMsgs(true)
    try {
      const res = await axios.get(`${API_URL}/friends/messages/${friendId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessages(res.data)
      setTimeout(scrollToBottom, 100)
    } catch (err) {
      console.error('Fetch messages failed:', err)
    } finally {
      setLoadingMsgs(false)
    }
  }

  useEffect(() => {
    if (token) fetchConversations()
  }, [token])

  // Handle incoming real-time messages
  useEffect(() => {
    if (!lastDirectMessage) return
    const msg = lastDirectMessage

    // If we're chatting with this person, add to messages
    if (selectedFriend && msg.sender_id === selectedFriend.friend_id) {
      setMessages(prev => [...prev, {
        id: msg.id,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        content: msg.content,
        is_read: true,
        created_at: msg.created_at
      }])
      setTimeout(scrollToBottom, 100)
    }

    // Update conversations list
    fetchConversations()
  }, [lastDirectMessage])

  const handleSelectFriend = (conv) => {
    setSelectedFriend(conv)
    fetchMessages(conv.friend_id)
    // Mark unread as 0 locally
    setConversations(prev => prev.map(c => 
      c.friend_id === conv.friend_id ? { ...c, unread: 0 } : c
    ))
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedFriend || sending) return
    const content = newMessage.trim()
    setNewMessage('')
    setSending(true)

    // Optimistic update
    const tempMsg = {
      id: Date.now(),
      sender_id: user.user_id,
      receiver_id: selectedFriend.friend_id,
      content,
      is_read: false,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMsg])
    setTimeout(scrollToBottom, 50)

    try {
      await axios.post(`${API_URL}/friends/messages/${selectedFriend.friend_id}`, 
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchConversations()
    } catch (err) {
      console.error('Send message failed:', err)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getInitials = (name) => name ? name.charAt(0).toUpperCase() : '?'

  const formatTime = (isoStr) => {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    const now = new Date()
    const diffMs = now - d
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Hôm qua'
    } else if (diffDays < 7) {
      return d.toLocaleDateString('vi-VN', { weekday: 'short' })
    }
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  }

  const formatMsgTime = (isoStr) => {
    if (!isoStr) return ''
    return new Date(isoStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }

  const filteredConversations = conversations.filter(c => 
    c.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="h-[calc(100vh-0px)] flex bg-slate-50">
      {/* ===== SIDEBAR: Conversations List ===== */}
      <div className={`w-full md:w-[360px] bg-white border-r border-slate-200 flex flex-col shrink-0 ${selectedFriend ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100">
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl text-white">
              <MessageCircle size={22} />
            </div>
            Tin nhắn
          </h1>
          
          {/* Search */}
          <div className="mt-4 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm bạn bè..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loadingConv ? (
            <div className="p-8 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              Đang tải...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Chưa có cuộc trò chuyện nào</p>
              <p className="text-xs mt-1">Hãy kết bạn để bắt đầu nhắn tin!</p>
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isOnline = onlineUsers.includes(conv.friend_id)
              const isSelected = selectedFriend?.friend_id === conv.friend_id
              return (
                <button
                  key={conv.friend_id}
                  onClick={() => handleSelectFriend(conv)}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-all border-b border-slate-50 hover:bg-slate-50 ${
                    isSelected ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {conv.avatar_url ? (
                      <img src={conv.avatar_url} className="w-12 h-12 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                        {getInitials(conv.username)}
                      </div>
                    )}
                    {isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full"></div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-800 truncate">{conv.username}</p>
                      {conv.last_message_time && (
                        <span className="text-[11px] text-slate-400 shrink-0 ml-2">{formatTime(conv.last_message_time)}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-sm text-slate-500 truncate max-w-[200px]">
                        {conv.last_message ? (
                          <>
                            {conv.last_message_is_mine && <span className="text-slate-400">Bạn: </span>}
                            {conv.last_message}
                          </>
                        ) : (
                          <span className="italic text-slate-400">Bắt đầu trò chuyện...</span>
                        )}
                      </p>
                      {conv.unread > 0 && (
                        <span className="ml-2 shrink-0 bg-teal-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ===== MAIN: Chat Area ===== */}
      <div className={`flex-1 flex flex-col ${!selectedFriend ? 'hidden md:flex' : 'flex'}`}>
        {!selectedFriend ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircle size={40} className="text-slate-300" />
            </div>
            <p className="text-xl font-bold text-slate-500">Chọn một cuộc trò chuyện</p>
            <p className="text-sm mt-1">Chọn bạn bè từ danh sách bên trái để bắt đầu nhắn tin</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shrink-0 shadow-sm">
              <button onClick={() => setSelectedFriend(null)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg">
                <ArrowLeft size={20} />
              </button>
              <div className="relative">
                {selectedFriend.avatar_url ? (
                  <img src={selectedFriend.avatar_url} className="w-11 h-11 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                    {getInitials(selectedFriend.username)}
                  </div>
                )}
                {onlineUsers.includes(selectedFriend.friend_id) && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{selectedFriend.username}</h3>
                <p className="text-xs text-slate-400">
                  {onlineUsers.includes(selectedFriend.friend_id) ? (
                    <span className="text-emerald-500 font-medium">● Đang hoạt động</span>
                  ) : 'Ngoại tuyến'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1 bg-gradient-to-b from-slate-50 to-white">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Smile size={48} className="mb-3 opacity-30" />
                  <p className="font-medium">Chưa có tin nhắn nào</p>
                  <p className="text-sm">Hãy gửi lời chào đầu tiên! 👋</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    const isMine = msg.sender_id === user?.user_id
                    const prevMsg = messages[idx - 1]
                    const showGap = prevMsg && prevMsg.sender_id !== msg.sender_id
                    
                    return (
                      <div key={msg.id} className={`${showGap ? 'mt-4' : 'mt-1'}`}>
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isMine 
                              ? 'bg-gradient-to-br from-teal-500 to-emerald-500 text-white rounded-br-md shadow-md shadow-teal-500/15' 
                              : 'bg-white text-slate-700 rounded-bl-md shadow-sm border border-slate-100'
                          }`}>
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                              <span className={`text-[10px] ${isMine ? 'text-white/60' : 'text-slate-400'}`}>
                                {formatMsgTime(msg.created_at)}
                              </span>
                              {isMine && (
                                msg.is_read 
                                  ? <CheckCheck size={12} className="text-white/60" />
                                  : <Check size={12} className="text-white/60" />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-slate-200 px-6 py-4 shrink-0">
              <div className="flex items-end gap-3">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-400 transition-all">
                  <textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nhập tin nhắn..."
                    rows={1}
                    className="w-full bg-transparent text-sm text-slate-700 resize-none focus:outline-none max-h-[120px]"
                    style={{ height: 'auto', minHeight: '24px' }}
                    onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="p-3 bg-gradient-to-br from-teal-500 to-emerald-500 text-white rounded-xl hover:from-teal-600 hover:to-emerald-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-teal-500/20 shrink-0"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default FriendChat
