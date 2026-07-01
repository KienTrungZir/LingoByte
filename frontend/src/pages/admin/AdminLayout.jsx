import React from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Book, Type, Hash, FolderTree, FileText, ArrowLeft, LogOut, Shield, Bot } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AdminSidebarItem = ({ icon: Icon, label, to, active }) => (
  <Link to={to} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-teal-600'}`}>
    <Icon size={20} />
    <span className="font-semibold">{label}</span>
  </Link>
);

const AdminLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Redirect or block if not admin
  if (!user || user.role_id !== 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-sm w-full">
          <Shield className="mx-auto text-red-500 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Truy cập bị từ chối</h1>
          <p className="text-slate-500 mb-6">Bạn không có quyền truy cập trang quản trị này.</p>
          <Link to="/" className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors">
            <ArrowLeft size={18} />
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col fixed h-full z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3 px-4 py-4 mb-4">
          <div className="bg-slate-800 p-2 rounded-xl text-white shadow-lg shadow-slate-800/20">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 leading-tight">Admin</h1>
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">LingoByte</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-2 space-y-1 custom-scrollbar">
          <p className="px-4 text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 mt-2">Tổng quan</p>
          <AdminSidebarItem icon={LayoutDashboard} label="Dashboard" to="/admin" active={location.pathname === '/admin'} />
          
          <p className="px-4 text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 mt-6">Nội dung học</p>
          <AdminSidebarItem icon={FolderTree} label="Chủ đề" to="/admin/topics" active={location.pathname.startsWith('/admin/topics')} />
          <AdminSidebarItem icon={Type} label="Hán tự" to="/admin/characters" active={location.pathname.startsWith('/admin/characters')} />
          <AdminSidebarItem icon={Book} label="Từ vựng" to="/admin/vocabulary" active={location.pathname.startsWith('/admin/vocabulary')} />
          <AdminSidebarItem icon={Hash} label="Bộ thủ" to="/admin/radicals" active={location.pathname.startsWith('/admin/radicals')} />
          
          <p className="px-4 text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 mt-6">Hệ thống</p>
          <AdminSidebarItem icon={Users} label="Người dùng" to="/admin/users" active={location.pathname.startsWith('/admin/users')} />
          <AdminSidebarItem icon={FileText} label="Bài viết" to="/admin/posts" active={location.pathname.startsWith('/admin/posts')} />
          <AdminSidebarItem icon={Bot} label="AI Provider" to="/admin/ai-providers" active={location.pathname.startsWith('/admin/ai-providers')} />
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100 space-y-2">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all font-medium">
            <ArrowLeft size={18} />
            <span>Về ứng dụng</span>
          </Link>
          <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium">
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
      
      <main className="flex-1 ml-64 p-8 overflow-auto h-screen">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
