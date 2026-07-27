import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UsersRound, CreditCard, Activity, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalGroups: number;
  totalTransactionAmount: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, chartRes] = await Promise.all([
        axios.get('/admin/stats'),
        axios.get('/admin/chart-data')
      ]);
      setStats(statsRes.data);
      setChartData(chartRes.data);
    } catch (error) {
      toast.error('Không thể tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tổng quan hệ thống</h1>
        <p className="text-slate-500 mt-2 font-medium">Theo dõi các chỉ số quan trọng của TingTing theo thời gian thực.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Stat Card 1 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Tổng người dùng</p>
              <h3 className="text-3xl font-black text-slate-800">{stats?.totalUsers.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Users size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm font-medium text-emerald-600 relative z-10">
            <ArrowUpRight size={16} className="mr-1" />
            <span>Tăng trưởng ổn định</span>
          </div>
        </div>

        {/* Stat Card 2 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">User Đang Hoạt Động</p>
              <h3 className="text-3xl font-black text-slate-800">{stats?.activeUsers.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Activity size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm font-medium text-slate-500 relative z-10">
            <span className="text-slate-700 font-bold mr-1">{Math.round((stats?.activeUsers || 0) / (stats?.totalUsers || 1) * 100)}%</span>
            <span>tổng số user</span>
          </div>
        </div>

        {/* Stat Card 3 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Tổng Số Nhóm</p>
              <h3 className="text-3xl font-black text-slate-800">{stats?.totalGroups.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <UsersRound size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm font-medium text-slate-500 relative z-10">
            Đang hoạt động trên hệ thống
          </div>
        </div>

        {/* Stat Card 4 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Giao dịch thành công</p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(stats?.totalTransactionAmount || 0)}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <CreditCard size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm font-medium text-slate-500 relative z-10">
            Qua hệ thống thanh toán VietQR
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Tăng trưởng Người dùng (30 ngày qua)</h3>
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickMargin={10} minTickGap={30} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="users" name="User đăng ký mới" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Hoạt động gần đây</h3>
          <div className="space-y-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <Activity size={16} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Cập nhật hệ thống</p>
                  <p className="text-xs font-medium text-slate-500">2 giờ trước</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
