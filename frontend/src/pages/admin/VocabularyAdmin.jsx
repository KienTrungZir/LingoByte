import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Loader2, X, FileText, Upload, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://localhost:8000';

const VocabularyAdmin = () => {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [formData, setFormData] = useState({
    word: '',
    pinyin: '',
    meaning_vi: '',
    meaning_en: '',
    hsk_level: ''
  });
  
  const [bulkData, setBulkData] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pageSize = 20;

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/vocabulary?page=${page}&page_size=${pageSize}&search=${search}`, {
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
        fetchItems();
    }, 300);
    return () => clearTimeout(delay);
  }, [page, search]); 

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setFormData({
        word: item.word || '',
        pinyin: item.pinyin || '',
        meaning_vi: item.meaning_vi || '',
        meaning_en: item.meaning_en || '',
        hsk_level: item.hsk_level || ''
      });
    } else {
      setFormData({ word: '', pinyin: '', meaning_vi: '', meaning_en: '', hsk_level: '' });
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
        await axios.put(`${API_URL}/api/admin/vocabulary/${editingItem.vocab_id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/api/admin/vocabulary`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || "Lỗi lưu dữ liệu");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa từ vựng này?")) return;
    try {
      await axios.delete(`${API_URL}/api/admin/vocabulary/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (items.length === 1 && page > 1) {
          setPage(p => p - 1);
      } else {
          fetchItems();
      }
    } catch (err) {
      alert("Lỗi xóa dữ liệu");
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Parse JSON
      let parsed = [];
      try {
        parsed = JSON.parse(bulkData);
        if (!Array.isArray(parsed)) throw new Error("Phải là một mảng JSON");
      } catch (err) {
        alert("JSON không hợp lệ: " + err.message);
        setSubmitting(false);
        return;
      }

      const res = await axios.post(`${API_URL}/api/admin/vocabulary/bulk`, { items: parsed }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`Đã thêm: ${res.data.created}, Bỏ qua (trùng): ${res.data.skipped}`);
      setIsBulkOpen(false);
      setBulkData("");
      fetchItems();
    } catch (err) {
      alert("Lỗi import dữ liệu");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-t-2xl">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý Từ vựng <span className="text-sm font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full ml-2">{total}</span></h2>
          <p className="text-sm text-slate-500 mt-1">Giao diện tùy chỉnh quản lý kho từ vựng tiếng Trung</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Tìm từ vựng, pinyin..."
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 w-64 transition-all"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button 
            onClick={() => setIsBulkOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 text-sm font-semibold rounded-xl hover:bg-indigo-100 transition-colors"
          >
            <Upload size={18} />
            Import JSON
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Thêm từ mới
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
            <FileText size={48} className="text-slate-300 mb-4" />
            <p className="font-medium text-lg">Chưa có từ vựng nào.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100/90 sticky top-0 z-10 backdrop-blur-md shadow-sm">
              <tr>
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-500 w-16">ID</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-500">Từ vựng</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-500">Pinyin</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-500">Nghĩa (VI)</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-500 w-24">HSK</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-500 text-right sticky right-0 bg-slate-100/90 w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((item) => (
                <tr key={item.vocab_id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium">{item.vocab_id}</td>
                  <td className="px-6 py-4 text-xl font-black text-slate-800">{item.word}</td>
                  <td className="px-6 py-4 text-sm font-medium text-teal-700 bg-teal-50/30">{item.pinyin}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <p className="font-bold">{item.meaning_vi}</p>
                    {item.meaning_en && <p className="text-xs text-slate-400 italic">{item.meaning_en}</p>}
                  </td>
                  <td className="px-6 py-4">
                    {item.hsk_level ? (
                      <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-lg">HSK {item.hsk_level}</span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenModal(item)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl" title="Sửa">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.vocab_id)} className="p-2 text-red-600 hover:bg-red-100 rounded-xl" title="Xóa">
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

      {/* Single Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">{editingItem ? 'Sửa Từ Vựng' : 'Thêm Từ Vựng Mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Chữ Hán (Word) <span className="text-red-500">*</span></label>
                <input required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/50" value={formData.word} onChange={e => setFormData({...formData, word: e.target.value})} placeholder="VD: 你好" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Pinyin</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/50" value={formData.pinyin} onChange={e => setFormData({...formData, pinyin: e.target.value})} placeholder="VD: nǐ hǎo" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Cấp độ HSK</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/50" value={formData.hsk_level} onChange={e => setFormData({...formData, hsk_level: e.target.value})}>
                    <option value="">Không phân loại</option>
                    {[1,2,3,4,5,6].map(lvl => <option key={lvl} value={lvl}>HSK {lvl}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nghĩa Tiếng Việt</label>
                <textarea rows="2" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/50" value={formData.meaning_vi} onChange={e => setFormData({...formData, meaning_vi: e.target.value})} placeholder="VD: Xin chào"></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nghĩa Tiếng Anh (Tùy chọn)</label>
                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/50" value={formData.meaning_en} onChange={e => setFormData({...formData, meaning_en: e.target.value})} placeholder="VD: Hello" />
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

      {/* Bulk Import Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Import Từ Vựng (JSON)</h3>
              <button onClick={() => setIsBulkOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleBulkSubmit} className="p-6 space-y-4">
              <div className="bg-indigo-50 text-indigo-800 text-sm p-4 rounded-xl border border-indigo-100">
                <p className="font-bold mb-1">Định dạng JSON yêu cầu:</p>
                <pre className="bg-white/50 p-2 rounded-lg overflow-x-auto text-xs mt-2">
{`[
  {
    "word": "学习",
    "pinyin": "xué xí",
    "meaning_vi": "học tập",
    "meaning_en": "study",
    "hsk_level": 1
  }
]`}
                </pre>
              </div>
              <textarea 
                rows="10" 
                className="w-full p-4 bg-slate-800 text-green-400 font-mono text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                value={bulkData}
                onChange={e => setBulkData(e.target.value)}
                placeholder="Dán mảng JSON vào đây..."
                required
              />
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsBulkOpen(false)} className="px-6 py-2.5 font-bold text-slate-600 bg-slate-100 rounded-xl">Hủy</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 flex items-center gap-2">
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Tiến hành Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VocabularyAdmin;
