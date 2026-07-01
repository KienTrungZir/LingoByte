import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { LayoutDashboard, Share2, BookOpen, MessageSquare, Users, User, Flame, TrendingUp, LogOut, GraduationCap, Grid3X3, Layers, ChevronRight, Clock, Sparkles, Gamepad2, Shield, PenTool, Trophy, MessageCircle } from 'lucide-react'
import axios from 'axios'

import RadicalGraph from './pages/RadicalGraph'
import RadicalExplorer from './pages/RadicalExplorer'
import Dictionary from './pages/Dictionary'
import HandwritingCanvas from './components/HandwritingCanvas'
import Login from './pages/Login'
import Register from './pages/Register'
import Topics from './pages/Topics'
import TopicDetail from './pages/TopicDetail'
import SentencePractice from './pages/SentencePractice'
import Flashcards from './pages/Flashcards'
import RadicalDropGame from './pages/RadicalDropGame'
import GameLobby from './pages/GameLobby'
import FastCard from './components/FastCard'
import Community from './pages/Community'
import AIChat from './pages/AIChat'
import Profile from './pages/Profile'
import Leaderboard from './pages/Leaderboard'
import FriendChat from './pages/FriendChat'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import TopicsAdmin from './pages/admin/TopicsAdmin'
import CharactersAdmin from './pages/admin/CharactersAdmin'
import VocabularyAdmin from './pages/admin/VocabularyAdmin'
import RadicalsAdmin from './pages/admin/RadicalsAdmin'
import UsersAdmin from './pages/admin/UsersAdmin'
import PostsAdmin from './pages/admin/PostsAdmin'
import AiProviderAdmin from './pages/admin/AiProviderAdmin'

const API_URL = 'http://localhost:8000'

// --- Protected Route Component ---
const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>
  if (!token) return <Navigate to="/login" />
  return children
}

// --- Dashboard Page ---
const Dashboard = () => {
  const { user, token } = useAuth()
  const [stats, setStats] = useState(null)
  const [topUsers, setTopUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, leaderboardRes] = await Promise.all([
          axios.get(`${API_URL}/users/me/stats`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_URL}/api/leaderboard/progress?limit=3`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ data: { entries: [] } }))
        ])
        setStats(statsRes.data)
        setTopUsers(leaderboardRes.data.entries || [])
      } catch (error) {
        console.error("Fetch stats failed:", error)
      } finally {
        setLoading(false)
      }
    }
    if (token) fetchData()
  }, [token])

  if (loading) return <div className="p-8 text-slate-500">Đang tải thông số...</div>

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">
            Chào buổi chiều, <span className="text-teal-600">{user?.username}</span>! 👋
          </h1>
          <p className="text-slate-500 font-medium">Hôm nay bạn muốn chinh phục thêm bao nhiêu Hán tự?</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="zen-card py-3 px-6 flex items-center gap-3 bg-white shadow-xl shadow-orange-500/10 border-orange-50">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Flame className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Chuỗi ngày</p>
              <p className="font-black text-xl text-slate-800">{stats?.streak || 0} Ngày</p>
            </div>
          </div>
          <div className="zen-card py-3 px-6 flex items-center gap-3 bg-white shadow-xl shadow-teal-500/10 border-teal-50">
            <div className="bg-teal-100 p-2 rounded-lg">
              <TrendingUp className="text-teal-600" size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Tổng XP</p>
              <p className="font-black text-xl text-slate-800">{stats?.xp?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="zen-card p-8 bg-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-teal-500"></div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Layers className="text-teal-500" size={24} />
              Tiến độ mục tiêu HSK {stats?.hsk_target}
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Từ vựng đã thuộc</p>
                    <p className="text-3xl font-black text-slate-800">{stats?.words_learned} <span className="text-sm font-normal text-slate-400">/ {stats?.words_total}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-teal-600">{stats?.progress_percentage}%</p>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-4 p-1 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-teal-500 to-emerald-400 h-2 rounded-full transition-all duration-1000 shadow-lg shadow-teal-500/20" 
                    style={{ width: `${stats?.progress_percentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 flex flex-col justify-center border border-slate-100">
                <p className="text-slate-500 text-sm mb-2">Ước tính hoàn thành</p>
                <div className="flex items-center gap-3">
                  <Clock className="text-slate-400" size={20} />
                  <p className="text-lg font-bold text-slate-700">12 ngày nữa</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link to="/topics" className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all flex items-center gap-2">
                Tiếp tục bài học
                <ChevronRight size={18} />
              </Link>
              <Link to="/graph" className="px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
                Khám phá đồ thị
              </Link>
            </div>
          </div>

          <div className="zen-card p-0 bg-slate-800 text-white overflow-hidden group flex flex-col justify-between">
            <div className="p-8 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <Users size={20} className="text-teal-400" />
                    Bảng xếp hạng
                  </h2>
                  <p className="text-slate-400 text-sm">Cạnh tranh cùng bạn bè — Chinh phục đỉnh cao!</p>
                </div>
                <Link to="/leaderboard" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition-colors">
                  Xem tất cả
                </Link>
              </div>
              
              <div className="space-y-3">
                {topUsers.length === 0 ? (
                  <div className="p-3 bg-white/5 rounded-xl text-center text-slate-400 text-sm">
                    Chưa có dữ liệu
                  </div>
                ) : (
                  topUsers.map((user, index) => (
                    <div key={user.user_id} className="p-3 bg-white/5 rounded-xl flex items-center justify-between border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-amber-500 text-white' : index === 1 ? 'bg-slate-300 text-slate-800' : index === 2 ? 'bg-orange-400 text-white' : 'bg-slate-700 text-slate-300'}`}>
                          {index + 1}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-600 overflow-hidden">
                            <img src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="avatar" className="w-full h-full object-cover" />
                          </div>
                          <p className="font-bold text-sm">{user.username}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-teal-400 font-bold text-sm">{user.xp} XP</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-teal-500/20 to-transparent pointer-events-none"></div>
            <Users className="absolute -bottom-8 -right-8 text-teal-500/10 w-48 h-48 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-8">
          <FastCard stats={stats} />
          
          <div className="zen-card bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-6 relative overflow-hidden">
            <div className="relative z-10">
              <Sparkles className="text-indigo-200 mb-4" size={32} />
              <h3 className="text-lg font-bold mb-2">AI Trợ lý học tập</h3>
              <p className="text-indigo-100 text-sm mb-6">"Hôm nay bạn nên tập trung vào các từ liên quan đến 'Gia đình' để chuẩn bị cho HSK 2."</p>
              <Link to="/chat" className="w-full py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-center font-bold text-sm transition-all inline-block">
                Trò chuyện ngay
              </Link>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

const Practice = () => (
  <div className="p-8 max-w-4xl mx-auto">
    <h1 className="text-3xl font-bold text-slate-800 mb-8">Luyện viết Hán tự</h1>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
      <div className="zen-card">
        <h2 className="text-xl font-bold mb-4">Hướng dẫn</h2>
        <div className="space-y-4 text-slate-600">
          <p>1. Quan sát thứ tự nét vẽ phía trên.</p>
          <p>2. Viết lại chữ Hán vào ô canvas bên cạnh.</p>
          <p>3. Nhấn "Kiểm tra" để nhận phản hồi từ AI.</p>
        </div>
        <div className="mt-8 p-4 bg-teal-50 rounded-xl">
          <p className="text-teal-700 font-medium">Mẹo ghi nhớ:</p>
          <p className="text-teal-600 text-sm">Chữ "你" (Bạn) gồm bộ Nhân đứng (亻) và chữ Nhĩ (尔).</p>
        </div>
      </div>
      <HandwritingCanvas charToPractice="你" />
    </div>
  </div>
)

const SidebarItem = ({ icon: Icon, label, to, active }) => (
  <Link to={to} className={`zen-sidebar-item ${active ? 'active' : ''}`}>
    <Icon size={20} />
    <span>{label}</span>
  </Link>
)

const Layout = ({ children }) => {
  const location = useLocation()
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Don't show sidebar on login/register pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'
  if (isAuthPage) return <main className="flex-1">{children}</main>

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-100 p-4 flex flex-col fixed h-full">
        <div className="flex items-center gap-2 px-4 py-6 mb-8">
          <div className="bg-teal-600 p-2 rounded-lg">
            <BookOpen className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold text-slate-800">LingoByte</span>
        </div>
        
        <nav className="flex-1 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Bảng điều khiển" to="/" active={location.pathname === '/'} />
          <SidebarItem icon={GraduationCap} label="Bài học chủ đề" to="/topics" active={location.pathname.startsWith('/topics')} />
          <SidebarItem icon={Grid3X3} label="214 Bộ thủ" to="/radicals" active={location.pathname === '/radicals'} />
          <SidebarItem icon={Gamepad2} label="Mini Game" to="/game" active={location.pathname.startsWith('/game')} />
          <SidebarItem icon={Trophy} label="Bảng xếp hạng" to="/leaderboard" active={location.pathname === '/leaderboard'} />
          <SidebarItem icon={Layers} label="Thẻ ghi nhớ" to="/flashcards" active={location.pathname === '/flashcards'} />
          <SidebarItem icon={Share2} label="Đồ thị Bộ thủ" to="/graph" active={location.pathname === '/graph'} />
          <SidebarItem icon={BookOpen} label="Từ điển" to="/dictionary" active={location.pathname === '/dictionary'} />
          <SidebarItem icon={MessageSquare} label="AI Chat" to="/chat" active={location.pathname === '/chat'} />
          {/* <SidebarItem icon={PenTool} label="Luyện viết" to="/practice" active={location.pathname === '/practice'} /> */}
          <SidebarItem icon={Users} label="Cộng đồng" to="/community" active={location.pathname === '/community'} />
          <SidebarItem icon={MessageCircle} label="Tin nhắn" to="/messages" active={location.pathname === '/messages'} />
          
          {user?.role_id === 1 && (
            <div className="pt-4 mt-4 border-t border-slate-100">
              <p className="px-4 text-[10px] uppercase font-bold text-slate-400 mb-2">Quản trị</p>
              <Link 
                to="/admin" 
                className="zen-sidebar-item text-teal-600 hover:bg-teal-50"
              >
                <Shield size={20} />
                <span>Hệ thống Admin</span>
              </Link>
            </div>
          )}
        </nav>

        <div className="mt-auto border-t border-slate-100 pt-4 space-y-1">
          <SidebarItem icon={User} label="Hồ sơ cá nhân" to="/profile" active={location.pathname === '/profile'} />
          <button 
            onClick={handleLogout}
            className="zen-sidebar-item w-full text-red-500 hover:bg-red-50"
          >
            <LogOut size={20} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-64 overflow-auto">
        {children}
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <NotificationProvider>
          <Layout>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/topics" element={<ProtectedRoute><Topics /></ProtectedRoute>} />
            <Route path="/topics/:topicId" element={<ProtectedRoute><TopicDetail /></ProtectedRoute>} />
            <Route path="/topics/:topicId/sentence-practice" element={<ProtectedRoute><SentencePractice /></ProtectedRoute>} />
            <Route path="/radicals" element={<ProtectedRoute><RadicalExplorer /></ProtectedRoute>} />
            <Route path="/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
            <Route path="/graph" element={<ProtectedRoute><RadicalGraph /></ProtectedRoute>} />
            <Route path="/game" element={<ProtectedRoute><GameLobby /></ProtectedRoute>} />
            <Route path="/game/:roomId" element={<ProtectedRoute><RadicalDropGame /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            {/* <Route path="/practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} /> */}
            <Route path="/dictionary" element={<ProtectedRoute><Dictionary /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><FriendChat /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="topics" element={<TopicsAdmin />} />
              <Route path="characters" element={<CharactersAdmin />} />
              <Route path="vocabulary" element={<VocabularyAdmin />} />
              <Route path="radicals" element={<RadicalsAdmin />} />
              <Route path="users" element={<UsersAdmin />} />
              <Route path="posts" element={<PostsAdmin />} />
              <Route path="ai-providers" element={<AiProviderAdmin />} />
            </Route>
          </Routes>
          </Layout>
        </NotificationProvider>
      </Router>
    </AuthProvider>
  )
}

export default App
