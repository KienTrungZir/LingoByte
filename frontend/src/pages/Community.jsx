import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, User, Send, Plus, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import PublicProfileModal from '../components/PublicProfileModal';

const API_URL = 'http://localhost:8000/api';

const Community = () => {
    const { token, user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPost, setNewPost] = useState({ title: '', content: '' });
    const [selectedPost, setSelectedPost] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [activeTag, setActiveTag] = useState(null);
    const [selectedUsername, setSelectedUsername] = useState(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    useEffect(() => {
        fetchPosts();
    }, [activeTag]);

    const fetchPosts = async () => {
        try {
            const url = activeTag 
                ? `${API_URL}/community/posts?tag=${activeTag}` 
                : `${API_URL}/community/posts`;
            const response = await axios.get(url);
            setPosts(response.data);
        } catch (error) {
            console.error("Fetch posts failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (e, postId) => {
        e.stopPropagation();
        try {
            await axios.post(`${API_URL}/community/posts/${postId}/like`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchPosts();
        } catch (error) {
            console.error("Like failed:", error);
        }
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/community/posts`, newPost, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewPost({ title: '', content: '' });
            setShowCreateModal(false);
            fetchPosts();
        } catch (error) {
            alert(error.response?.data?.detail || "Đã có lỗi xảy ra");
        }
    };

    const handleCreateComment = async (postId) => {
        if (!newComment.trim()) return;
        try {
            await axios.post(`${API_URL}/community/posts/${postId}/comments`, { content: newComment }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewComment('');
            const response = await axios.get(`${API_URL}/community/posts/${postId}`);
            setSelectedPost(response.data);
            fetchPosts();
        } catch (error) {
            console.error("Create comment failed:", error);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Đang tải thảo luận...</div>;

    const tags = ["Tất cả", "Ngữ pháp", "Từ vựng", "Giao tiếp", "Kinh nghiệm"];

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Cộng đồng học tập</h1>
                    <p className="text-slate-500">Học hỏi thông minh hơn qua chia sẻ của mọi người</p>
                </div>
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-teal-600/20 w-full md:w-auto justify-center"
                >
                    <Plus size={20} />
                    Đăng bài mới
                </button>
            </div>

            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
                {tags.map(tag => (
                    <button
                        key={tag}
                        onClick={() => setActiveTag(tag === "Tất cả" ? null : tag)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                            (tag === "Tất cả" && !activeTag) || activeTag === tag
                            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                            : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                        }`}
                    >
                        {tag}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6">
                {posts.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                        <p className="text-slate-400 font-medium">Chưa có thảo luận nào trong chủ đề này.</p>
                    </div>
                ) : posts.map(post => (
                    <div 
                        key={post.post_id} 
                        className="zen-card bg-white p-6 hover:border-teal-200 transition-all cursor-pointer group relative overflow-hidden"
                        onClick={() => setSelectedPost(post)}
                    >
                        {post.priority_score > 10 && (
                            <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] px-3 py-1 font-black uppercase rounded-bl-xl shadow-lg">
                                Xu hướng 🔥
                            </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                                    <User size={20} />
                                </div>
                                <div>
                                    <button 
                                        className="font-bold text-slate-800 hover:text-teal-600 transition-colors text-left"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedUsername(post.author?.username);
                                            setIsProfileModalOpen(true);
                                        }}
                                    >
                                        {post.author?.username || 'Thành viên'}
                                    </button>
                                    <p className="text-xs text-slate-400 flex items-center gap-1">
                                        <Clock size={12} />
                                        {format(new Date(post.created_at), 'HH:mm, dd/MM', { locale: vi })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {(post.tags || []).map(t => (
                                    <span key={t.tag_id} className="text-[10px] bg-slate-50 text-slate-400 px-2 py-1 rounded-md font-bold uppercase">#{t.name}</span>
                                ))}
                            </div>
                        </div>
                        
                        <h2 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-teal-600 transition-colors">{post.title}</h2>
                        <p className="text-slate-600 line-clamp-2 mb-6 leading-relaxed">{post.content}</p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                            <div className="flex items-center gap-6">
                                <button 
                                    onClick={(e) => handleLike(e, post.post_id)}
                                    className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors group/btn"
                                >
                                    <div className="p-2 rounded-full group-hover/btn:bg-red-50 transition-colors">
                                        <Plus size={18} className={post.likes > 0 ? "text-red-500 fill-red-500" : ""} />
                                    </div>
                                    <span className={`text-sm font-bold ${post.likes > 0 ? "text-red-500" : ""}`}>{post.likes || 0}</span>
                                </button>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <div className="p-2">
                                        <MessageSquare size={18} />
                                    </div>
                                    <span className="text-sm font-bold">{post.comments?.length || 0}</span>
                                </div>
                            </div>
                            <div className="flex items-center text-teal-600 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                Thảo luận ngay <ChevronRight size={16} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Post Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-8 border-b border-slate-100">
                            <h2 className="text-2xl font-bold text-slate-800">Tạo thảo luận mới</h2>
                        </div>
                        <form onSubmit={handleCreatePost} className="p-8 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Tiêu đề</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Ví dụ: Cách phân biệt bộ Nhân đứng và bộ Nhân nằm"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                    value={newPost.title}
                                    onChange={e => setNewPost({...newPost, title: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nội dung</label>
                                <textarea 
                                    required
                                    rows="6"
                                    placeholder="Chia sẻ chi tiết vấn đề của bạn..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
                                    value={newPost.content}
                                    onChange={e => setNewPost({...newPost, content: e.target.value})}
                                ></textarea>
                            </div>
                            <div className="flex justify-end gap-4 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                    Hủy bỏ
                                </button>
                                <button 
                                    type="submit"
                                    className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-teal-600/20"
                                >
                                    Đăng bài
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Post Detail Drawer/Modal */}
            {selectedPost && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end">
                    <div className="bg-white w-full max-w-3xl h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
                        <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center z-10">
                            <button 
                                onClick={() => setSelectedPost(null)}
                                className="text-slate-400 hover:text-slate-600 font-bold"
                            >
                                Đóng
                            </button>
                            <h3 className="font-bold text-slate-800">Chi tiết thảo luận</h3>
                            <div className="w-10"></div>
                        </div>
                        
                        <div className="p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 text-xl font-bold">
                                    {selectedPost.author?.username?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <button 
                                        className="font-bold text-lg text-slate-800 hover:text-teal-600 transition-colors text-left"
                                        onClick={() => {
                                            setSelectedUsername(selectedPost.author?.username);
                                            setIsProfileModalOpen(true);
                                        }}
                                    >
                                        {selectedPost.author?.username}
                                    </button>
                                    <p className="text-sm text-slate-400">
                                        {format(new Date(selectedPost.created_at), 'HH:mm, dd/MM/yyyy')}
                                    </p>
                                </div>
                            </div>
                            
                            <h2 className="text-3xl font-black text-slate-800 mb-6 leading-tight">{selectedPost.title}</h2>
                            <div className="text-slate-600 leading-relaxed text-lg whitespace-pre-wrap mb-10 pb-10 border-b border-slate-100">
                                {selectedPost.content}
                            </div>
                            
                            <div className="space-y-8">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <MessageSquare size={20} className="text-teal-500" />
                                    Bình luận ({selectedPost.comments?.length || 0})
                                </h4>
                                
                                <div className="flex gap-4">
                                    <input 
                                        type="text" 
                                        placeholder="Viết bình luận của bạn..."
                                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                                        value={newComment}
                                        onChange={e => setNewComment(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleCreateComment(selectedPost.post_id)}
                                    />
                                    <button 
                                        onClick={() => handleCreateComment(selectedPost.post_id)}
                                        className="p-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-all"
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                                
                                <div className="space-y-6">
                                    {(selectedPost.comments || []).map(comment => (
                                        <div key={comment.comment_id} className="flex gap-4">
                                            <div className="w-10 h-10 shrink-0 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold border border-teal-100">
                                                {comment.author?.username?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 bg-slate-50 p-4 rounded-2xl rounded-tl-none">
                                                <div className="flex justify-between items-center mb-2">
                                                    <button 
                                                        className="font-bold text-slate-800 hover:text-teal-600 transition-colors text-left"
                                                        onClick={() => {
                                                            setSelectedUsername(comment.author?.username);
                                                            setIsProfileModalOpen(true);
                                                        }}
                                                    >
                                                        {comment.author?.username}
                                                    </button>
                                                    <span className="text-[10px] text-slate-400">{format(new Date(comment.created_at), 'HH:mm, dd/MM')}</span>
                                                </div>
                                                <p className="text-slate-600 text-sm">{comment.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Public Profile Modal */}
            <PublicProfileModal 
                username={selectedUsername} 
                isOpen={isProfileModalOpen} 
                onClose={() => setIsProfileModalOpen(false)} 
            />
        </div>
    );
};

export default Community;
