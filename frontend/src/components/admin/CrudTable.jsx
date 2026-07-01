import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Loader2, X, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://localhost:8000';

const CrudTable = ({ 
  title, 
  endpoint, 
  columns, 
  formFields, 
  itemKey = 'id',
  searchPlaceholder = "Tìm kiếm...",
  customActions
}) => {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const pageSize = 20;

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/${endpoint}?page=${page}&page_size=${pageSize}&search=${search}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
      alert("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Add debounce for search if needed later
    const delay = setTimeout(() => {
        fetchItems();
    }, 300);
    return () => clearTimeout(delay);
  }, [page, search]); 

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setFormData(item);
    } else {
      const initial = {};
      formFields.forEach(f => initial[f.name] = f.defaultValue !== undefined ? f.defaultValue : "");
      setFormData(initial);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingItem) {
        await axios.put(`${API_URL}/api/admin/${endpoint}/${editingItem[itemKey]}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/api/admin/${endpoint}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      handleCloseModal();
      fetchItems();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Lỗi lưu dữ liệu");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa mục này?")) return;
    try {
      await axios.delete(`${API_URL}/api/admin/${endpoint}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Handle page adjustment if it was the last item on page
      if (items.length === 1 && page > 1) {
          setPage(p => p - 1);
      } else {
          fetchItems();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Lỗi xóa dữ liệu");
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-4rem)]">
      {/* Header & Toolbar */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-t-2xl">
        <h2 className="text-2xl font-bold text-slate-800">{title} <span className="text-sm font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full ml-2">{total}</span></h2>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder={searchPlaceholder}
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
            Thêm mới
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-slate-50 relative custom-scrollbar">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10">
            <Loader2 className="animate-spin text-teal-500" size={40} />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                <FileText size={48} className="text-slate-300" />
            </div>
            <p className="font-medium text-lg">Không có dữ liệu.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100/90 sticky top-0 z-10 backdrop-blur-md shadow-sm">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-500 whitespace-nowrap">{col.label}</th>
                ))}
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-500 text-right sticky right-0 bg-slate-100/90 backdrop-blur-md">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="px-6 py-4 text-sm text-slate-700 font-medium whitespace-nowrap">
                      {col.render ? col.render(item) : (item[col.key] ?? '-')}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white group-hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      {customActions && customActions(item)}
                      <button onClick={() => handleOpenModal(item)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors" title="Sửa">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(item[itemKey])} className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-colors" title="Xóa">
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
          Hiển thị <span className="font-bold text-slate-700">{Math.min(total, (page - 1) * pageSize + 1)}</span> đến <span className="font-bold text-slate-700">{Math.min(page * pageSize, total)}</span> trong tổng <span className="font-bold text-slate-700">{total}</span>
        </p>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl disabled:opacity-50 disabled:hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="px-4 py-2 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl">
            {page} / {totalPages}
          </div>
          <button 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl disabled:opacity-50 disabled:hover:bg-slate-50 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Modal form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <h3 className="text-xl font-bold text-slate-800">{editingItem ? 'Cập nhật' : 'Thêm mới'} {title}</h3>
              <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/30">
              <form id="crud-form" onSubmit={handleSubmit} className="space-y-5">
                {formFields.map((field, idx) => (
                  <div key={idx}>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                    {field.type === 'textarea' ? (
                      <textarea 
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all min-h-[120px]"
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                        required={field.required}
                        placeholder={field.placeholder || ''}
                      />
                    ) : field.type === 'number' ? (
                      <input 
                        type="number"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData({...formData, [field.name]: e.target.value ? Number(e.target.value) : ''})}
                        required={field.required}
                      />
                    ) : field.type === 'select' ? (
                       <select 
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                          required={field.required}
                       >
                         <option value="">-- Chọn --</option>
                         {field.options.map(opt => (
                           <option key={opt.value} value={opt.value}>{opt.label}</option>
                         ))}
                       </select>
                    ) : (
                      <input 
                        type="text"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                        required={field.required}
                        placeholder={field.placeholder || ''}
                      />
                    )}
                  </div>
                ))}
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-end gap-3">
              <button 
                type="button" 
                onClick={handleCloseModal}
                className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                form="crud-form"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-all disabled:opacity-70 shadow-sm"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {editingItem ? 'Lưu thay đổi' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrudTable;
