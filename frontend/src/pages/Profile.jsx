import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, Mail, Calendar, Trophy, Flame, Star, Target, Shield,
  Edit3, Save, X, Lock, Eye, EyeOff, ChevronRight, Gamepad2,
  MessageSquare, BookOpen, Check, AlertCircle, TrendingUp, Users as UsersIcon, UserMinus, CheckCircle2
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const API_URL = 'http://localhost:8000/api'

const Profile = () => {
  const { user, token, setUser } = useAuth()
  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(true)

  // Friends
  const [friends, setFriends] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(true)

  // Edit mode
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ bio: '', avatar_url: '', hsk_target: 1 })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState(null)

  useEffect(() => {
    if (token) {
      fetchActivity()
      fetchFriends()
    }
  }, [token])

  useEffect(() => {
    if (user) {
      setEditForm({
        bio: user.bio || '',
        avatar_url: user.avatar_url || '',
        hsk_target: user.hsk_target || 1
      })
    }
  }, [user])

  const fetchActivity = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/users/me/activity`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setActivity(res.data)
    } catch (err) {
      console.error('Fetch activity failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchFriends = async () => {
    try {
      const res = await axios.get(`${API_URL}/friends/list`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFriends(res.data)
    } catch (err) {
      console.error('Fetch friends failed:', err)
    } finally {
      setLoadingFriends(false)
    }
  }

  const handleAcceptFriend = async (friendshipId) => {
    try {
      await axios.put(`${API_URL}/friends/accept/${friendshipId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchFriends()
    } catch (err) { alert('Lỗi khi chấp nhận kết bạn') }
  }

  const handleRemoveFriend = async (friendshipId) => {
    if(!confirm("Bạn có chắc muốn xóa liên kết này?")) return;
    try {
      await axios.delete(`${API_URL}/friends/remove/${friendshipId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchFriends()
    } catch (err) { alert('Lỗi khi xóa') }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await axios.put(`http://localhost:8000/users/me`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUser(res.data)
      setIsEditing(false)
      setSaveMsg({ type: 'success', text: 'Cập nhật hồ sơ thành công!' })
      setTimeout(() => setSaveMsg(null), 3000)
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.response?.data?.detail || 'Lỗi khi cập nhật' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPwMsg({ type: 'error', text: 'Mật khẩu mới không khớp!' })
      return
    }
    if (passwordForm.new_password.length < 4) {
      setPwMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 4 ký tự!' })
      return
    }
    setPwSaving(true)
    setPwMsg(null)
    try {
      await axios.put(`http://localhost:8000/users/me/password`, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPwMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' })
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => { setPwMsg(null); setShowPasswordSection(false) }, 2500)
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.detail || 'Đổi mật khẩu thất bại' })
    } finally {
      setPwSaving(false)
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
    const labels = { 1: 'HSK 1 — Sơ cấp', 2: 'HSK 2 — Cơ bản', 3: 'HSK 3 — Trung cấp', 4: 'HSK 4 — Nâng cao', 5: 'HSK 5 — Cao cấp', 6: 'HSK 6 — Thông thạo' }
    return labels[level] || `HSK ${level}`
  }

  if (!user) return null

  const role = getRoleBadge(user.role_id)
  const RoleIcon = role.icon

  const statCards = [
    { label: 'Tổng XP', value: (user.xp || 0).toLocaleString(), icon: Star, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-600' },
    { label: 'Chuỗi ngày', value: `${user.streak || 0} ngày`, icon: Flame, gradient: 'from-red-500 to-pink-500', bg: 'bg-red-50', text: 'text-red-500' },
    { label: 'Elo Rating', value: (user.elo_rating || 1200).toLocaleString(), icon: Trophy, gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600' },
    { label: 'Mục tiêu', value: `HSK ${user.hsk_target || 1}`, icon: Target, gradient: 'from-teal-500 to-cyan-500', bg: 'bg-teal-50', text: 'text-teal-600' },
  ]

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Toast message */}
      <AnimatePresence>
        {saveMsg && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl text-white font-medium ${
              saveMsg.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          >
            {saveMsg.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            {saveMsg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== HERO HEADER ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="zen-card bg-white relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 opacity-90" />
        <div className="relative pt-16 pb-8 px-8">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
            <div className="relative -mt-8">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.username} className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-xl" />
              ) : (
                <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center border-4 border-white shadow-xl">
                  <span className="text-4xl font-black text-white">{getInitials(user.username)}</span>
                </div>
              )}
              <div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-lg bg-gradient-to-r ${role.color} text-white text-xs font-bold shadow-lg flex items-center gap-1`}>
                <RoleIcon size={12} /> {role.label}
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">{user.username}</h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><Mail size={14} /> {user.email}</span>
                <span className="flex items-center gap-1.5"><Calendar size={14} /> Tham gia {activity?.days_joined || 0} ngày trước</span>
              </div>
              {user.bio && !isEditing && <p className="mt-3 text-slate-600 max-w-lg italic">"{user.bio}"</p>}
            </div>

            <div className="flex gap-3">
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-900 transition-all shadow-lg">
                  <Edit3 size={16} /> Chỉnh sửa
                </button>
              ) : (
                <>
                  <button onClick={handleSaveProfile} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-all">
                    <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu'}
                  </button>
                  <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">
                    <X size={16} /> Hủy
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== STATS CARDS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }} className="zen-card bg-white p-5 group hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${card.bg}`}><card.icon size={20} className={card.text} /></div>
            </div>
            <p className="text-2xl font-black text-slate-800">{card.value}</p>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ===== LEFT COLUMN: Activity Chart + Stats ===== */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="zen-card bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp size={20} className="text-teal-500" /> Hoạt động học tập
                </h2>
              </div>
            </div>
            {loading ? (
              <div className="h-48 flex items-center justify-center text-slate-400">Đang tải...</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={activity?.study_history || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                  <Bar dataKey="chars_learned" fill="#14b8a6" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <div className="grid grid-cols-3 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="zen-card bg-white p-5 text-center">
              <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center"><BookOpen size={20} className="text-indigo-500" /></div>
              <p className="text-2xl font-black text-slate-800">{activity?.words_learned || 0}</p>
              <p className="text-xs font-medium text-slate-400 uppercase mt-1">Từ vựng</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="zen-card bg-white p-5 text-center">
              <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center"><Gamepad2 size={20} className="text-pink-500" /></div>
              <p className="text-2xl font-black text-slate-800">{activity?.games_count || 0}</p>
              <p className="text-xs font-medium text-slate-400 uppercase mt-1">Trận đấu</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="zen-card bg-white p-5 text-center">
              <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center"><MessageSquare size={20} className="text-sky-500" /></div>
              <p className="text-2xl font-black text-slate-800">{activity?.posts_count || 0}</p>
              <p className="text-xs font-medium text-slate-400 uppercase mt-1">Bài viết</p>
            </motion.div>
          </div>
        </div>

        {/* ===== RIGHT COLUMN: Edit Form + Password + Friends ===== */}
        <div className="space-y-6">
          
          {/* Edit Form */}
          {isEditing && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="zen-card bg-white p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Chỉnh sửa thông tin</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tiểu sử</label>
                  <textarea value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Avatar URL</label>
                  <input value={editForm.avatar_url} onChange={e => setEditForm({ ...editForm, avatar_url: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Friends List */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="zen-card bg-white p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UsersIcon size={20} className="text-teal-500" />
              Bạn bè
            </h2>
            
            {loadingFriends ? (
              <p className="text-sm text-slate-400">Đang tải...</p>
            ) : friends.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Chưa có bạn bè nào.</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {friends.map(f => (
                  <div key={f.friendship_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold overflow-hidden">
                        {f.user.avatar_url ? <img src={f.user.avatar_url} className="w-full h-full object-cover" /> : getInitials(f.user.username)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800 truncate max-w-[100px]">{f.user.username}</p>
                        <p className="text-[10px] text-slate-500">
                          {f.status === 'accepted' ? 'Bạn bè' : (f.is_requester ? 'Đã gửi lời mời' : 'Chờ xác nhận')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {f.status === 'pending' && !f.is_requester && (
                        <button onClick={() => handleAcceptFriend(f.friendship_id)} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200" title="Chấp nhận">
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      <button onClick={() => handleRemoveFriend(f.friendship_id)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200" title="Xóa/Hủy">
                        <UserMinus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Password Change */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="zen-card bg-white p-6">
            <button onClick={() => setShowPasswordSection(!showPasswordSection)} className="w-full flex items-center justify-between text-lg font-bold text-slate-800">
              <span className="flex items-center gap-2"><Lock size={20} className="text-slate-400" /> Đổi mật khẩu</span>
              <ChevronRight size={18} className={`text-slate-400 transition-transform ${showPasswordSection ? 'rotate-90' : ''}`} />
            </button>
            <AnimatePresence>
              {showPasswordSection && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="space-y-4 mt-5">
                    <div>
                      <input type={showCurrentPw ? 'text' : 'password'} placeholder="Mật khẩu hiện tại" value={passwordForm.current_password} onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })} className="w-full px-4 py-3 border rounded-xl text-sm" />
                    </div>
                    <div>
                      <input type={showNewPw ? 'text' : 'password'} placeholder="Mật khẩu mới" value={passwordForm.new_password} onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })} className="w-full px-4 py-3 border rounded-xl text-sm" />
                    </div>
                    <div>
                      <input type="password" placeholder="Xác nhận mật khẩu" value={passwordForm.confirm_password} onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} className="w-full px-4 py-3 border rounded-xl text-sm" />
                    </div>
                    {pwMsg && <div className={`text-sm ${pwMsg.type==='success'?'text-emerald-500':'text-red-500'}`}>{pwMsg.text}</div>}
                    <button onClick={handleChangePassword} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold text-sm">Xác nhận</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Profile
