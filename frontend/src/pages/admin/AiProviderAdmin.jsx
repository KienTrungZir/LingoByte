import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Bot, Plus, Trash2, Check, Loader2, AlertCircle, Zap, X, ChevronDown, Sparkles, Eye, EyeOff } from 'lucide-react';

const API_URL = 'http://localhost:8000';

// Provider metadata for UI display
const PROVIDER_OPTIONS = [
  {
    value: 'gemini',
    label: 'Google Gemini',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    activeColor: 'bg-blue-600',
    icon: '🔷',
    models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    description: 'Google AI — nhanh, miễn phí tier cao'
  },
  {
    value: 'claude',
    label: 'Anthropic Claude',
    color: 'bg-orange-50 text-orange-600 border-orange-200',
    activeColor: 'bg-orange-600',
    icon: '🟠',
    models: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'],
    description: 'Claude — chất lượng cao, an toàn'
  },
  {
    value: 'openai',
    label: 'OpenAI ChatGPT',
    color: 'bg-green-50 text-green-600 border-green-200',
    activeColor: 'bg-green-600',
    icon: '🟢',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    description: 'GPT-4o — đa năng, phổ biến'
  },
  {
    value: 'openrouter',
    label: 'OpenRouter',
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    activeColor: 'bg-purple-600',
    icon: '🟣',
    models: ['google/gemini-2.5-flash', 'google/gemini-1.5-flash', 'openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet'],
    description: 'Multi-model gateway — linh hoạt'
  }
];

const getProviderMeta = (providerName) =>
  PROVIDER_OPTIONS.find(p => p.value === providerName) || PROVIDER_OPTIONS[0];

const AiProviderAdmin = () => {
  const { token } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formProvider, setFormProvider] = useState('gemini');
  const [formApiKey, setFormApiKey] = useState('');
  const [formModel, setFormModel] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Inline token change
  const [editTokenTarget, setEditTokenTarget] = useState(null);
  const [editTokenValue, setEditTokenValue] = useState('');
  const [editTokenShow, setEditTokenShow] = useState(false);
  const [savingToken, setSavingToken] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    // Auto-set default model when provider changes
    const meta = getProviderMeta(formProvider);
    setFormModel(meta.models[0]);
  }, [formProvider]);

  // Auto-clear notifications
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchProviders = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/ai-providers`, { headers });
      setProviders(res.data);
    } catch (e) {
      setError('Không thể tải danh sách AI providers');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formApiKey.trim() || !formModel.trim()) {
      setError('Vui lòng điền đầy đủ API Key và Model');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await axios.post(`${API_URL}/api/admin/ai-providers`, {
        provider: formProvider,
        api_key: formApiKey.trim(),
        model: formModel.trim()
      }, { headers });

      setSuccess(`✅ Đã kích hoạt ${getProviderMeta(formProvider).label} · ${formModel}`);
      setShowForm(false);
      setFormApiKey('');
      setShowApiKey(false);
      fetchProviders();
    } catch (e) {
      setError(e.response?.data?.detail || 'Lỗi khi lưu AI Provider');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (provider) => {
    try {
      await axios.delete(`${API_URL}/api/admin/ai-providers/${provider}`, { headers });
      setSuccess(`Đã xóa provider: ${provider}`);
      setDeleteTarget(null);
      fetchProviders();
    } catch (e) {
      setError(e.response?.data?.detail || 'Lỗi khi xóa provider');
    }
  };

  const handleUpdateToken = async (providerObj) => {
    if (!editTokenValue.trim()) {
      setError('Vui lòng nhập API Key mới');
      return;
    }
    setSavingToken(true);
    setError(null);
    try {
      await axios.post(`${API_URL}/api/admin/ai-providers`, {
        provider: providerObj.provider,
        api_key: editTokenValue.trim(),
        model: providerObj.model
      }, { headers });
      setSuccess(`✅ Đã cập nhật Token cho ${getProviderMeta(providerObj.provider).label}`);
      setEditTokenTarget(null);
      setEditTokenValue('');
      setEditTokenShow(false);
      fetchProviders();
    } catch (e) {
      setError(e.response?.data?.detail || 'Lỗi khi cập nhật Token');
    } finally {
      setSavingToken(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-teal-500" size={32} />
        <p className="text-slate-500 font-medium ml-3">Đang tải AI Providers...</p>
      </div>
    );
  }

  const activeProvider = providers.find(p => p.is_active);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 mb-2">AI Provider</h1>
        <p className="text-slate-500 font-medium">Quản lý nhà cung cấp AI cho hệ thống chat và phân tích.</p>
      </div>

      {/* Notifications */}
      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 animate-in">
          <Check size={20} className="text-emerald-600 flex-shrink-0" />
          <span className="text-emerald-700 font-semibold">{success}</span>
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
          <span className="text-red-700 font-semibold">{error}</span>
        </div>
      )}

      {/* Active Provider Card */}
      <div className="mb-8">
        {activeProvider ? (
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-slate-900/20">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-emerald-500 p-2 rounded-xl">
                  <Zap size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Provider đang hoạt động</p>
                  <h2 className="text-2xl font-black">
                    {getProviderMeta(activeProvider.provider).icon} {getProviderMeta(activeProvider.provider).label}
                  </h2>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                <span className="px-4 py-2 bg-white/10 rounded-xl font-bold text-sm backdrop-blur-sm">
                  Model: {activeProvider.model}
                </span>
                {activeProvider.updated_by && (
                  <span className="px-4 py-2 bg-white/10 rounded-xl font-bold text-sm backdrop-blur-sm">
                    Cập nhật bởi: {activeProvider.updated_by}
                  </span>
                )}
                {activeProvider.updated_at && (
                  <span className="px-4 py-2 bg-white/10 rounded-xl font-bold text-sm backdrop-blur-sm">
                    {new Date(activeProvider.updated_at).toLocaleString('vi-VN')}
                  </span>
                )}
              </div>
            </div>
            <Sparkles className="absolute -bottom-6 -right-6 text-white/5 w-48 h-48" />
          </div>
        ) : (
          <div className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-3xl p-8 text-center">
            <AlertCircle size={48} className="text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-amber-800 mb-2">Chưa có AI Provider nào được kích hoạt</h2>
            <p className="text-amber-600 font-medium">Hãy thêm và kích hoạt một provider để hệ thống chat AI hoạt động.</p>
          </div>
        )}
      </div>

      {/* Provider List */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Danh sách Providers</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
            showForm
              ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              : 'bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20'
          }`}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Đóng' : 'Thêm / Đổi Provider'}
        </button>
      </div>

      {/* Add/Update Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">Chọn Provider</label>
            <div className="grid grid-cols-2 gap-3">
              {PROVIDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormProvider(opt.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formProvider === opt.value
                      ? `${opt.color} border-current shadow-sm ring-2 ring-current/20`
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{opt.icon}</span>
                    <span className="font-bold text-sm">{opt.label}</span>
                  </div>
                  <p className="text-xs text-slate-500">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">Model</label>
            <select
              value={formModel}
              onChange={(e) => setFormModel(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            >
              {getProviderMeta(formProvider).models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={formApiKey}
                onChange={(e) => setFormApiKey(e.target.value)}
                placeholder="sk-... hoặc AIza..."
                className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl text-sm font-mono text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">API key sẽ được mã hóa base64 trước khi lưu vào database.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-60 shadow-lg shadow-teal-600/20"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
              {saving ? 'Đang lưu...' : 'Kích hoạt Provider này'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormApiKey(''); setShowApiKey(false); }}
              className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Providers Table */}
      {providers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <Bot size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Chưa có provider nào. Hãy thêm provider đầu tiên!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => {
            const meta = getProviderMeta(p.provider);
            return (
              <div
                key={p.id}
                className={`bg-white border rounded-2xl p-5 transition-all hover:shadow-sm ${
                  p.is_active ? 'border-emerald-300 shadow-sm ring-1 ring-emerald-100' : 'border-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                      p.is_active ? `${meta.activeColor} text-white` : 'bg-slate-100'
                    }`}>
                      {p.is_active ? <Check size={24} /> : meta.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800">{meta.label}</h3>
                        {p.is_active && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 font-medium">
                        Model: <span className="font-semibold text-slate-700">{p.model}</span>
                        {p.updated_by && <span> · bởi {p.updated_by}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Change Token Button */}
                    <button
                      onClick={() => {
                        if (editTokenTarget === p.provider) {
                          setEditTokenTarget(null);
                          setEditTokenValue('');
                          setEditTokenShow(false);
                        } else {
                          setEditTokenTarget(p.provider);
                          setEditTokenValue('');
                          setEditTokenShow(false);
                          setDeleteTarget(null);
                        }
                      }}
                      className={`p-2 rounded-lg transition-all ${
                        editTokenTarget === p.provider
                          ? 'bg-amber-100 text-amber-600'
                          : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                      }`}
                      title="Đổi Token / API Key"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                    </button>

                    {deleteTarget === p.provider ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-500 font-bold">Xác nhận xóa?</span>
                        <button
                          onClick={() => handleDelete(p.provider)}
                          className="px-3 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Xóa
                        </button>
                        <button
                          onClick={() => setDeleteTarget(null)}
                          className="px-3 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setDeleteTarget(p.provider); setEditTokenTarget(null); }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Xóa provider"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Token Change Form */}
                {editTokenTarget === p.provider && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-500 mb-2">Nhập API Key mới cho {meta.label}</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={editTokenShow ? 'text' : 'password'}
                          value={editTokenValue}
                          onChange={(e) => setEditTokenValue(e.target.value)}
                          placeholder="sk-... hoặc AIza..."
                          className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm font-mono text-slate-700 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setEditTokenShow(!editTokenShow)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {editTokenShow ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <button
                        onClick={() => handleUpdateToken(p)}
                        disabled={savingToken}
                        className="px-5 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60 shadow-sm"
                      >
                        {savingToken ? <Loader2 size={16} className="animate-spin" /> : 'Cập nhật'}
                      </button>
                      <button
                        onClick={() => { setEditTokenTarget(null); setEditTokenValue(''); setEditTokenShow(false); }}
                        className="px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Bot size={20} className="text-teal-600" />
          Hướng dẫn
        </h3>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <span className="text-teal-500 mt-0.5">•</span>
            <span>Chỉ <strong>1 provider</strong> được active tại một thời điểm. Khi kích hoạt provider mới, provider cũ sẽ tự động bị tắt.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500 mt-0.5">•</span>
            <span>AI Chat và Voice Chat đều sử dụng provider đang active để tạo phản hồi.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500 mt-0.5">•</span>
            <span>Nếu provider gặp lỗi, hệ thống sẽ tự động sử dụng câu trả lời dự phòng (fallback).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500 mt-0.5">•</span>
            <span><strong>OpenAI Whisper/TTS</strong> cho Premium Voice Engine vẫn sử dụng API key riêng từ file .env, không ảnh hưởng bởi provider ở đây.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AiProviderAdmin;
