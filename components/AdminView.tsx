import React, { useState } from 'react';
import { AppContextType, OrderStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Download, RefreshCcw, Lock, Unlock, Trash, Search, LogOut } from 'lucide-react';

interface AdminViewProps {
  ctx: AppContextType;
}

const AdminView: React.FC<AdminViewProps> = ({ ctx }) => {
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'STATS'>('STATS');
  const [searchTerm, setSearchTerm] = useState('');

  // Stats Calculation
  const stats = React.useMemo(() => {
    const itemMap = new Map<string, { name: string; qty: number; total: number }>();
    
    ctx.orders.forEach(order => {
      if (order.status === OrderStatus.SUBMITTED) {
        order.items.forEach(item => {
          const current = itemMap.get(item.menuItem.id) || { name: item.menuItem.name, qty: 0, total: 0 };
          itemMap.set(item.menuItem.id, {
            name: current.name,
            qty: current.qty + item.quantity,
            total: current.total + (item.quantity * item.menuItem.price)
          });
        });
      }
    });

    return Array.from(itemMap.values()).sort((a, b) => b.qty - a.qty);
  }, [ctx.orders]);

  const totalRevenue = stats.reduce((acc, item) => acc + item.total, 0);
  const totalSubmitted = ctx.orders.filter(o => o.status === OrderStatus.SUBMITTED).length;

  const handleExportCSV = () => {
    // 1. Summary
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add BOM for Excel
    csvContent += "=== 彙總統計 ===\n";
    csvContent += "品項,數量,金額\n";
    stats.forEach(row => {
      csvContent += `${row.name},${row.qty},${row.total}\n`;
    });
    csvContent += `總計,,${totalRevenue}\n\n`;

    // 2. Individual Orders
    csvContent += "=== 個人明細 ===\n";
    csvContent += "座號,姓名,餐點內容,總金額\n";
    
    // Sort orders by seat number if possible (naive string sort)
    const sortedOrders = [...ctx.orders]
      .filter(o => o.status === OrderStatus.SUBMITTED)
      .sort((a, b) => a.seatNumber.localeCompare(b.seatNumber));

    sortedOrders.forEach(order => {
      const itemDetails = order.items.map(i => `${i.menuItem.name}*${i.quantity}`).join('; ');
      csvContent += `${order.seatNumber},${order.userName},"${itemDetails}",${order.totalPrice}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mcdonalds_order_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSetDeadline = (minutes: number) => {
    ctx.adminSetDeadline(Date.now() + minutes * 60 * 1000);
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      {/* Admin Header */}
      <header className="bg-mcDark text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
             <h1 className="text-xl font-bold text-mcYellow">後台管理中心</h1>
             <span className="text-xs bg-gray-700 px-2 py-1 rounded">Admin</span>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
             <div className="flex items-center bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => ctx.adminToggleSystem(true)}
                  className={`px-3 py-1.5 rounded text-sm flex items-center gap-1 transition ${ctx.settings.isOpen ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <Unlock size={14} /> 開放
                </button>
                <button
                  onClick={() => ctx.adminToggleSystem(false)}
                  className={`px-3 py-1.5 rounded text-sm flex items-center gap-1 transition ${!ctx.settings.isOpen ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <Lock size={14} /> 關閉
                </button>
             </div>

             <div className="flex gap-2">
               <button onClick={() => handleSetDeadline(60)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">+1小時</button>
               <button onClick={() => ctx.adminSetDeadline(null)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">清除時間</button>
             </div>

             <button onClick={ctx.logout} className="ml-auto text-gray-400 hover:text-white"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-mcYellow">
            <p className="text-sm text-gray-500">訂單總數</p>
            <p className="text-2xl font-bold">{totalSubmitted} <span className="text-sm font-normal text-gray-400">/ {ctx.orders.length}</span></p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-mcRed">
            <p className="text-sm text-gray-500">總金額</p>
            <p className="text-2xl font-bold">${totalRevenue}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
            <p className="text-sm text-gray-500">狀態</p>
            <p className={`text-xl font-bold ${ctx.settings.isOpen ? 'text-green-600' : 'text-red-600'}`}>
              {ctx.settings.isOpen ? '開放點餐中' : '已截止'}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-center cursor-pointer hover:bg-gray-50 transition" onClick={handleExportCSV}>
            <div className="text-center text-mcDark">
              <Download className="mx-auto mb-1" size={20} />
              <span className="font-bold text-sm">匯出 CSV</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('STATS')}
            className={`pb-2 px-1 font-medium text-lg transition-colors border-b-2 ${activeTab === 'STATS' ? 'border-mcRed text-mcRed' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            統計圖表
          </button>
          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`pb-2 px-1 font-medium text-lg transition-colors border-b-2 ${activeTab === 'ORDERS' ? 'border-mcRed text-mcRed' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            學生訂單 ({ctx.orders.length})
          </button>
        </div>

        {activeTab === 'STATS' && (
          <div className="space-y-6">
             {/* Chart */}
             <div className="bg-white p-6 rounded-xl shadow-sm h-80">
                <h3 className="font-bold text-gray-700 mb-4">熱門餐點統計</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{fontSize: 12}} interval={0} />
                    <YAxis allowDecimals={false} />
                    <Tooltip cursor={{fill: '#f3f4f6'}} />
                    <Bar dataKey="qty" fill="#FFC72C" radius={[4, 4, 0, 0]} name="數量" />
                  </BarChart>
                </ResponsiveContainer>
             </div>

             {/* Table */}
             <div className="bg-white rounded-xl shadow-sm overflow-hidden">
               <table className="w-full text-left">
                 <thead className="bg-gray-50 text-gray-500 text-sm">
                   <tr>
                     <th className="p-4">品項名稱</th>
                     <th className="p-4 text-right">數量</th>
                     <th className="p-4 text-right">小計金額</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {stats.map((item) => (
                     <tr key={item.name} className="hover:bg-gray-50">
                       <td className="p-4 font-medium">{item.name}</td>
                       <td className="p-4 text-right">{item.qty}</td>
                       <td className="p-4 text-right">${item.total}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {activeTab === 'ORDERS' && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="搜尋姓名或座號..." 
                  className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-mcYellow"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={() => {
                   if(window.confirm('確定要刪除所有訂單嗎？這無法復原。')) ctx.adminResetAll();
                }}
                className="text-red-500 text-sm hover:underline flex items-center gap-1"
              >
                <Trash size={14} /> 重置所有訂單
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-gray-500 text-sm border-b">
                  <tr>
                    <th className="p-4">座號</th>
                    <th className="p-4">姓名</th>
                    <th className="p-4">狀態</th>
                    <th className="p-4">金額</th>
                    <th className="p-4">內容</th>
                    <th className="p-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {ctx.orders
                    .filter(o => o.userName.includes(searchTerm) || o.seatNumber.includes(searchTerm))
                    .sort((a,b) => a.seatNumber.localeCompare(b.seatNumber))
                    .map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 group">
                      <td className="p-4 font-bold text-gray-700">{order.seatNumber}</td>
                      <td className="p-4">{order.userName}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          order.status === OrderStatus.SUBMITTED ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {order.status === OrderStatus.SUBMITTED ? '已送出' : '未送出'}
                        </span>
                      </td>
                      <td className={`p-4 font-medium ${order.totalPrice > ctx.settings.maxPrice ? 'text-red-600' : ''}`}>
                        ${order.totalPrice}
                      </td>
                      <td className="p-4 max-w-xs truncate text-gray-500">
                        {order.items.map(i => `${i.menuItem.name} x${i.quantity}`).join(', ')}
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => ctx.adminResetOrder(order.id)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded bg-white border border-gray-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          title="重設此訂單"
                        >
                          <RefreshCcw size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ctx.orders.length === 0 && (
              <div className="p-8 text-center text-gray-400">尚無訂單資料</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminView;