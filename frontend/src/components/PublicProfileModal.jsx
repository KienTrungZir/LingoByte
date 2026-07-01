import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { X, Shield, BookOpen, Star, Flame, Trophy, Target, Calendar, UserPlus, Check } from 'lucide-react'

const API_URL = 'http://localhost:8000'

const PublicProfileModal = ({ username, isOpen, onClose }) => {
  const { token, user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [friendStatus, setFriendStatus] = useState(null)

  useEffect(() => {
    if (isOpen && username) {
      setFriendStatus(null)
      fetchProfile()
    }
  }, [isOpen, username])

  const fetchProfile = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(`${API_URL}/users/profile/${username}`)
      setProfile(res.data)

      if (token && user) {
        const friendsRes = await axios.get(`${API_URL}/api/friends/list`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const friendship = friendsRes.data.find(f => f.user.user_id === res.data.user_id)
        if (friendship) {
          if (friendship.status === 'accepted') {
            setFriendStatus('friends')
          } else {
            setFriendStatus('sent')
          }
        } else {
          setFriendStatus(null)
        }
      }

    } catch (err) {
      setError(err.response?.data?.detail || 'Không thể tải thông tin người dùng')
    } finally {
      setLoading(false)
    }
  }

  const handleAddFriend = async () => {
    if (!token || !profile) return;
    try {
      await axios.post(`${API_URL}/api/friends/request`, { friend_id: profile.user_id }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFriendStatus('sent')
    } catch (err) {
      if (err.response?.data?.detail === "Already friends" || err.response?.data?.detail === "Friend request already exists") {
        setFriendStatus('sent')
      } else {
        alert("Lỗi khi kết bạn")
      }
    }
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.charAt(0).toUpperCase()
  }

  const getRoleBadge = (roleId) => {
    if (roleId === 1) return { label: 'Admin', color: 'from-red-500 to-orange-500', icon: Shield }
    return { label: 'Học viên', color: 'from-teal-500 to-emerald-500', icon: BookOpen }
  }

  const getHskLabel = (level) => {
    return `HSK ${level || 1}`
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10"
        >
          {/* Decorative Header */}
          <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500" />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors z-20"
          >
            <X size={20} />
          </button>

          {loading ? (
            <div className="p-12 text-center mt-20">
              <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500">Đang tải hồ sơ...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center mt-20">
              <p className="text-red-500 font-medium mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>
          ) : profile ? (
            <div className="px-8 pb-8 pt-16">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
                {/* Avatar */}
                <div className="relative -mt-8">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.username}
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-xl"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center border-4 border-white shadow-xl">
                      <span className="text-4xl font-black text-white">{getInitials(profile.username)}</span>
                    </div>
                  )}
                  {/* Role Badge */}
                  <div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-lg bg-gradient-to-r ${getRoleBadge(profile.role_id).color} text-white text-xs font-bold shadow-lg flex items-center gap-1`}>
                    {React.createElement(getRoleBadge(profile.role_id).icon, { size: 12 })}
                    {getRoleBadge(profile.role_id).label}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 mt-4 md:mt-0">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">{profile.username}</h2>
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-1 text-sm text-slate-500">
                    <Calendar size={14} /> 
                    <span>Tham gia từ {new Date(profile.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                  {user && user.username !== profile.username && friendStatus !== 'friends' && (
                    <button 
                      onClick={handleAddFriend}
                      disabled={friendStatus === 'sent'}
                      className="mt-4 flex items-center justify-center md:justify-start gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-900 transition-all disabled:bg-emerald-500 disabled:opacity-100 disabled:cursor-not-allowed shadow-lg mx-auto md:mx-0"
                    >
                      {friendStatus === 'sent' ? <Check size={16} /> : <UserPlus size={16} />}
                      {friendStatus === 'sent' ? 'Đã gửi yêu cầu' : 'Thêm bạn bè'}
                    </button>
                  )}
                  {user && user.username !== profile.username && friendStatus === 'friends' && (
                    <div className="mt-4 inline-flex items-center justify-center md:justify-start gap-2 px-4 py-2 bg-emerald-100 text-emerald-600 rounded-xl font-bold text-sm mx-auto md:mx-0">
                      <Check size={16} /> Đã là bạn bè
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div className="mt-6">
                <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 italic">
                  {profile.bio ? `"${profile.bio}"` : "Người dùng này chưa cập nhật tiểu sử."}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4">
                  <div className="bg-amber-100 text-amber-600 p-2.5 rounded-xl">
                    <Star size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tổng XP</p>
                    <p className="font-black text-xl text-slate-800">{(profile.xp || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4">
                  <div className="bg-red-100 text-red-500 p-2.5 rounded-xl">
                    <Flame size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Chuỗi ngày</p>
                    <p className="font-black text-xl text-slate-800">{profile.streak || 0} <span className="text-sm font-bold text-slate-500">ngày</span></p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4">
                  <div className="bg-violet-100 text-violet-600 p-2.5 rounded-xl">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Elo Rating</p>
                    <p className="font-black text-xl text-slate-800">{(profile.elo_rating || 1200).toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4">
                  <div className="bg-teal-100 text-teal-600 p-2.5 rounded-xl">
                    <Target size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mục tiêu</p>
                    <p className="font-black text-xl text-slate-800">{getHskLabel(profile.hsk_target)}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default PublicProfileModal
