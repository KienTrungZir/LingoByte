import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Loader2, X, FileText, Layers, ListPlus, Trash } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://localhost:8000';

const TopicsAdmin = () => {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Topic Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon_url: '',
    hsk_level: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Content (Lesson Items) Modal
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [lessonItems, setLessonItems] = useState([]);
  const [contentLoading, setContentLoading] = useState(false);
  
  // Search for adding items
  const [itemSearch, setItemSearch] = useState("");
  const [searchResults, setSearchResults] = useState({ characters: [], vocabulary: [] });
  const [searchLoading, setSearchLoading] = useState(false);

  const pageSize = 20;

  // --- TOPIC CRUD ---

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/topics?page=${page}&page_size=${pageSize}&search=${search}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
        fetchTopics();
    }, 300);
    return () => clearTimeout(delay);
  }, [page, search]); 

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        icon_url: item.icon_url || '',
        hsk_level: item.hsk_level || ''
      });
    } else {
      setFormData({ title: '', description: '', icon_url: '', hsk_level: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        hsk_level: formData.hsk_level ? parseInt(formData.hsk_level) : null
      };

      if (editingItem) {
        await axios.put(`${API_URL}/api/admin/topics/${editingItem.topic_id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/api/admin/topics`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsModalOpen(false);
      fetchTopics();
    } catch (err) {
      alert("Lỗi lưu chủ đề");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa chủ đề này sẽ xóa luôn các bài học bên trong. Bạn chắc chắn chứ?")) return;
    try {
      await axios.delete(`${API_URL}/api/admin/topics/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (items.length === 1 && page > 1) {
          setPage(p => p - 1);
      } else {
          fetchTopics();
      }
    } catch (err) {
      alert("Lỗi xóa chủ đề");
    }
  };

  // --- CONTENT (LESSON ITEMS) MANAGEMENT ---

  const openContentModal = async (topic) => {
    setSelectedTopic(topic);
    setIsContentModalOpen(true);
    fetchLessonItems(topic.topic_id);
    setItemSearch("");
    setSearchResults({ characters: [], vocabulary: [] });
  };

  const fetchLessonItems = async (topicId) => {
    setContentLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/topics/${topicId}/items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLessonItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setContentLoading(false);
    }
  };

  const removeLessonItem = async (itemId) => {
    try {
      await axios.delete(`${API_URL}/api/admin/lesson-items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchLessonItems(selectedTopic.topic_id);
      // Refresh topics list to update item count
      fetchTopics();
    } catch (err) {
      alert("Lỗi khi xóa mục này");
    }
  };

  // Search words/chars to add
  useEffect(() => {
    const searchApi = async () => {
      if (!itemSearch.trim()) {
        setSearchResults({ characters: [], vocabulary: [] });
        return;
      }
      setSearchLoading(true);
      try {
        const res = await axios.get(`${API_URL}/api/admin/search?q=${itemSearch}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSearchResults(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    };

    const delay = setTimeout(searchApi, 500);
    return () => clearTimeout(delay);
  }, [itemSearch, token]);

  const addLessonItem = async (type, id) => {
    try {
      const payload = {
        topic_id: selectedTopic.topic_id,
        char_id: type === 'character' ? id : null,
        vocab_id: type === 'vocabulary' ? id : null
      };
      await axios.post(`${API_URL}/api/admin/lesson-items`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchLessonItems(selectedTopic.topic_id);
      fetchTopics(); // Update count in background
    } catch (err) {
      alert("Mục này có thể đã tồn tại trong chủ đề.");
    }
  };


  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-t-2xl">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý Chủ đề <span className="text-sm font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full ml-2">{total}</span></h2>
          <p className="text-sm text-slate-500 mt-1">Tạo chủ đề và thêm từ vựng/chữ Hán vào bài học</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Tìm chủ đề..."
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 w-64 transition-all"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Tạo chủ đề
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto bg-slate-50 relative custom-scrollbar">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10">
            <Loader2 className="animate-spin text-teal-500" size={40} />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Layers size={48} className="text-slate-300 mb-4" />
            <p className="font-medium text-lg">Chưa có chủ đề nào.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100/90 sticky top-0 z-10 backdrop-blur-md shadow-sm">
              <tr>
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-500 w-16">ID</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-500 w-16">Icon</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-500">Tiêu đề</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-500">HSK</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-500 text-center">Nội dung</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-500 text-right sticky right-0 bg-slate-100/90 w-48">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((item) => (
                <tr key={item.topic_id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium">{item.topic_id}</td>
                  <td className="px-6 py-4 text-2xl">{item.icon_url || '📁'}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800 text-base">{item.title}</p>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-1">{item.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    {item.hsk_level ? (
                      <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-lg">HSK {item.hsk_level}</span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 rounded-full">{item.item_count} mục</span>
                  </td>
                  <td className="px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openContentModal(item)} 
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors"
                      >
                        <ListPlus size={14} /> Thêm từ
                      </button>
                      <button onClick={() => handleOpenModal(item)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Sửa">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.topic_id)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Xóa">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-slate-100 bg-white rounded-b-2xl flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">
          Hiển thị <span className="font-bold text-slate-700">{Math.min(total, (page - 1) * pageSize + 1)}</span> - <span className="font-bold text-slate-700">{Math.min(page * pageSize, total)}</span> / <span className="font-bold text-slate-700">{total}</span>
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl disabled:opacity-50">
            <ChevronLeft size={18} />
          </button>
          <div className="px-4 py-2 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl">
            {page} / {totalPages}
          </div>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl disabled:opacity-50">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* --- ADD/EDIT TOPIC MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">{editingItem ? 'Sửa Chủ Đề' : 'Tạo Chủ Đề Mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tiêu đề <span className="text-red-500">*</span></label>
                <input required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/50" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="VD: Gia đình" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Icon (Emoji hoặc URL)</label>
                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/50" value={formData.icon_url} onChange={e => setFormData({...formData, icon_url: e.target.value})} placeholder="VD: 👨‍👩‍👧‍👦" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Cấp độ HSK</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/50" value={formData.hsk_level} onChange={e => setFormData({...formData, hsk_level: e.target.value})}>
                  <option value="">Không phân loại</option>
                  {[1,2,3,4,5,6].map(lvl => <option key={lvl} value={lvl}>HSK {lvl}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mô tả</label>
                <textarea rows="2" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/50" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="VD: Các từ vựng về gia đình..."></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 font-bold text-slate-600 bg-slate-100 rounded-xl">Hủy</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 flex items-center gap-2">
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONTENT (LESSON ITEMS) MODAL --- */}
      {isContentModalOpen && selectedTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-2xl">{selectedTopic.icon_url}</span>
                  Thêm nội dung vào: {selectedTopic.title}
                </h3>
                <p className="text-sm text-slate-500 mt-1">Tìm kiếm từ vựng ở ô bên trái và click để thêm vào chủ đề</p>
              </div>
              <button onClick={() => setIsContentModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl"><X size={24} /></button>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              
              {/* Left Panel: Search & Add */}
              <div className="w-full md:w-1/2 flex flex-col border-r border-slate-100 bg-white">
                <div className="p-4 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      placeholder="Gõ từ vựng, tiếng Việt hoặc Pinyin..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 custom-scrollbar">
                  {searchLoading ? (
                     <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
                  ) : itemSearch.length === 0 ? (
                     <p className="text-center text-slate-400 p-8 text-sm">Gõ để tìm kiếm từ vựng trong kho...</p>
                  ) : searchResults.vocabulary.length === 0 && searchResults.characters.length === 0 ? (
                     <p className="text-center text-slate-400 p-8 text-sm">Không tìm thấy kết quả.</p>
                  ) : (
                    <div className="space-y-4">
                      {searchResults.vocabulary.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Từ vựng</p>
                          <div className="space-y-2">
                            {searchResults.vocabulary.map(v => (
                              <div key={`v-${v.vocab_id}`} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-indigo-200 transition-all">
                                <div>
                                  <p className="font-bold text-slate-800"><span className="text-lg">{v.word}</span> <span className="text-xs text-slate-400 font-normal">({v.pinyin})</span></p>
                                  <p className="text-xs text-slate-500">{v.meaning_vi}</p>
                                </div>
                                <button onClick={() => addLessonItem('vocabulary', v.vocab_id)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors" title="Thêm vào chủ đề">
                                  <Plus size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {searchResults.characters.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Chữ Hán lẻ</p>
                          <div className="space-y-2">
                            {searchResults.characters.map(c => (
                              <div key={`c-${c.char_id}`} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-indigo-200 transition-all">
                                <div>
                                  <p className="font-bold text-slate-800"><span className="text-lg">{c.hanzi}</span> <span className="text-xs text-slate-400 font-normal">({c.pinyin})</span></p>
                                  <p className="text-xs text-slate-500">{c.meaning_vi}</p>
                                </div>
                                <button onClick={() => addLessonItem('character', c.char_id)} className="p-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-600 hover:text-white transition-colors" title="Thêm vào chủ đề">
                                  <Plus size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Current Lesson Items */}
              <div className="w-full md:w-1/2 flex flex-col bg-white">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2">
                    <ListPlus size={18} className="text-teal-600" />
                    Đã thêm trong Chủ đề ({lessonItems.length})
                  </h4>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {contentLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-teal-500" size={24} /></div>
                  ) : lessonItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-70">
                      <Layers size={32} className="mb-2 text-slate-300" />
                      <p className="text-sm">Chủ đề này chưa có từ vựng nào.</p>
                      <p className="text-xs mt-1">Hãy tìm kiếm và thêm ở cột bên trái.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lessonItems.map(item => (
                        <div key={item.item_id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm group hover:border-red-200 transition-all">
                          <div>
                            <p className="font-bold text-slate-800 text-sm">
                              {item.type === 'vocabulary' ? (
                                <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded mr-2">Từ vựng</span>
                              ) : (
                                <span className="bg-teal-100 text-teal-700 text-[10px] px-1.5 py-0.5 rounded mr-2">Chữ Hán</span>
                              )}
                              {item.label}
                            </p>
                          </div>
                          <button onClick={() => removeLessonItem(item.item_id)} className="p-1.5 text-slate-400 group-hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Xóa khỏi chủ đề">
                            <Trash size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicsAdmin;
