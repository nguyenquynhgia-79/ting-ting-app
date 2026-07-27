import { useState, useEffect } from 'react';
import axios from 'axios';
import { Terminal, Fingerprint, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface AuditLog {
  id: string;
  action: string;
  resource: string | null;
  details: any | null;
  ip_address: string | null;
  created_at: string;
  user: {
    username: string;
    email: string;
  } | null;
}

const Logs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data } = await axios.get('/admin/logs');
      setLogs(data);
    } catch (error) {
      toast.error('Không thể tải nhật ký hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN_SUCCESS')) return 'bg-emerald-100 text-emerald-700';
    if (action.includes('LOGIN_FAILED')) return 'bg-red-100 text-red-700';
    if (action.includes('CREATE') || action.includes('JOIN')) return 'bg-blue-100 text-blue-700';
    if (action.includes('DELETE') || action.includes('LEAVE')) return 'bg-orange-100 text-orange-700';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Logs</h1>
          <p className="text-slate-500 mt-2 font-medium">Nhật ký hoạt động của người dùng trên toàn hệ thống (100 log gần nhất)</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="min-w-full divide-y divide-slate-200 relative">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Hoạt động (Action)</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Người thực hiện</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Thiết bị (IP)</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Thời gian</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">Đang tải nhật ký...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">Chưa có bản ghi hoạt động nào</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-flex w-max items-center px-2.5 py-1 rounded-md text-xs font-bold ${getActionColor(log.action)}`}>
                          <Terminal size={12} className="mr-1.5" />
                          {log.action}
                        </span>
                        {log.details && (
                          <div className="text-xs font-medium text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 max-w-xs truncate" title={JSON.stringify(log.details)}>
                            {JSON.stringify(log.details)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.user ? (
                        <div>
                          <div className="text-sm font-bold text-slate-900">{log.user.username}</div>
                          <div className="text-xs text-slate-500">{log.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-slate-400 italic">Khách (Guest)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-slate-600 font-mono">
                        <Fingerprint size={14} className="mr-1.5 text-slate-400" />
                        {log.ip_address || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">
                      <div className="flex items-center">
                        <Activity size={14} className="mr-1.5 text-slate-400" />
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Logs;
