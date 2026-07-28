import { useState } from 'react';
import axios from 'axios';
import { Send, BellRing, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const Notifications = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Vui lòng nhập đầy đủ Tiêu đề và Nội dung');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await axios.post('/admin/notifications/broadcast', { title, message, type });
      toast.success(`Đã gửi thông báo đến ${data.recipients} người dùng!`);
      setTitle('');
      setMessage('');
      setType('info');
    } catch (error) {
      toast.error('Có lỗi xảy ra khi gửi thông báo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <BellRing className="text-indigo-600" size={32} />
          Trung Tâm Thông Báo
        </h1>
        <p className="text-slate-500 mt-2 font-medium text-lg">Gửi thông báo đẩy (Push Notification) đến toàn bộ người dùng trên hệ thống ngay lập tức.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8">
          <form onSubmit={handleBroadcast} className="space-y-6">
            
            {/* Loại thông báo */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">Loại thông báo (Mức độ quan trọng)</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setType('info')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    type === 'info' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Info size={20} />
                  <span className="font-bold">Thông tin (Info)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('warning')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    type === 'warning' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <AlertTriangle size={20} />
                  <span className="font-bold">Cảnh báo (Warning)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('system')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    type === 'system' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <AlertCircle size={20} />
                  <span className="font-bold">Hệ thống (System)</span>
                </button>
              </div>
            </div>

            {/* Tiêu đề */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Tiêu đề thông báo</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Cập nhật hệ thống đêm nay"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                required
              />
            </div>

            {/* Nội dung */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nội dung chi tiết</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nhập nội dung bạn muốn gửi tới toàn bộ người dùng..."
                rows={5}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium resize-none"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg shadow-indigo-200 ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang gửi...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send size={20} />
                    Gửi Thông Báo Ngay
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
