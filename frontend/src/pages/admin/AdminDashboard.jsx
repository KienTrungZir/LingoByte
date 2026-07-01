import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, FolderTree, Type, Book, Hash, List, TrendingUp, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://localhost:8000';

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
    <div className={`p-4 rounded-2xl ${colorClass}`}>
      <Icon size={28} />
    </div>
    <div>
      <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-3xl font-black text-slate-800">{value.toLocaleString()}</h3>
    </div>
  </div>
);

const AdminDashboard = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState({
    total_users: 0,
    total_topics: 0,
    total_characters: 0,
    total_vocabulary: 0,
    total_radicals: 0,
    total_lesson_items: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch admin stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><p className="text-slate-500 font-medium">Đang tải dữ liệu...</p></div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 mb-2">Tổng quan hệ thống</h1>
        <p className="text-slate-500 font-medium">Theo dõi hoạt động và số lượng nội dung của LingoByte.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard title="Người dùng" value={stats.total_users} icon={Users} colorClass="bg-blue-50 text-blue-600" />
        <StatCard title="Chủ đề học" value={stats.total_topics} icon={FolderTree} colorClass="bg-teal-50 text-teal-600" />
        <StatCard title="Nội dung bài học" value={stats.total_lesson_items} icon={Layers} colorClass="bg-indigo-50 text-indigo-600" />
        <StatCard title="Hán tự" value={stats.total_characters} icon={Type} colorClass="bg-rose-50 text-rose-600" />
        <StatCard title="Từ vựng" value={stats.total_vocabulary} icon={Book} colorClass="bg-orange-50 text-orange-600" />
        <StatCard title="Bộ thủ" value={stats.total_radicals} icon={Hash} colorClass="bg-purple-50 text-purple-600" />
      </div>
      
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-10 text-white relative overflow-hidden shadow-xl shadow-slate-900/20">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">Xin chào Admin 👋</h2>
          <p className="text-slate-300 mb-6 leading-relaxed font-medium">Chào mừng bạn đến với bảng điều khiển dành cho Quản trị viên. Tại đây bạn có thể quản lý toàn bộ nội dung học tập, bài viết cộng đồng và thông tin người dùng của hệ thống LingoByte.</p>
          <div className="flex gap-4">
             <button className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-xl transition-colors">
               Xem báo cáo chi tiết
             </button>
          </div>
        </div>
        <TrendingUp className="absolute -bottom-10 -right-10 text-white/5 w-64 h-64" />
      </div>
    </div>
  );
};

export default AdminDashboard;
