import React, { useMemo, useState, useEffect } from 'react';
import { AppContextType, MenuItem, Category, OrderStatus } from '../types';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, Clock, AlertCircle, LogOut } from 'lucide-react';

interface StudentViewProps {
  ctx: AppContextType;
}

const StudentView: React.FC<StudentViewProps> = ({ ctx }) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  // Countdown Timer Logic
  useEffect(() => {
    if (!ctx.settings.deadline) {
      setTimeLeft(null);
      return;
    }
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = (ctx.settings.deadline || 0) - now;
      if (diff <= 0) {
        setTimeLeft("時間到");
        clearInterval(interval);
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}分 ${seconds}秒`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [ctx.settings.deadline]);

  // Derived State
  const currentItems = ctx.currentOrder?.items || [];
  
  const cartTotal = useMemo(() => {
    return currentItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  }, [currentItems]);

  const mainCount = useMemo(() => {
    return currentItems
      .filter(i => i.menuItem.category === 'MAIN')
      .reduce((sum, i) => sum + i.quantity, 0);
  }, [currentItems]);

  const setCount = useMemo(() => {
    return currentItems
      .filter(i => i.menuItem.category === 'SET')
      .reduce((sum, i) => sum + i.quantity, 0);
  }, [currentItems]);

  const isOverBudget = cartTotal > ctx.settings.maxPrice;
  const isSetInvalid = setCount > mainCount; // More sets than mains
  const isSubmitted = ctx.currentOrder?.status === OrderStatus.SUBMITTED;
  
  // Filtering
  const displayedItems = selectedCategory === 'ALL' 
    ? ctx.menu 
    : ctx.menu.filter(i => i.category === selectedCategory);

  const categories: { key: Category | 'ALL'; label: string }[] = [
    { key: 'ALL', label: '全部' },
    { key: 'MAIN', label: '主餐' },
    { key: 'SET', label: '配餐' },
    { key: 'SNACK', label: '點心' },
    { key: 'DRINK', label: '飲料' },
  ];

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">訂單已送出！</h2>
          <p className="text-gray-500 mb-6">請等待小老師彙整訂單。</p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-bold border-b pb-2 mb-2">訂單明細</h3>
            {ctx.currentOrder?.items.map((item, idx) => (
              <div key={idx} className="flex justify-between py-1 text-sm">
                <span>{item.menuItem.name} x{item.quantity}</span>
                <span>${item.menuItem.price * item.quantity}</span>
              </div>
            ))}
            <div className="mt-3 pt-2 border-t flex justify-between font-bold text-lg text-mcRed">
              <span>總計</span>
              <span>${cartTotal}</span>
            </div>
          </div>

          <button 
             onClick={ctx.logout}
             className="text-gray-500 underline text-sm hover:text-gray-800"
          >
            登出
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-mcRed text-white px-2 py-1 rounded text-xs font-bold">
              {ctx.user?.seatNumber}
            </div>
            <h1 className="font-bold text-gray-800 truncate max-w-[120px] sm:max-w-none">
              {ctx.user?.name}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             {timeLeft && (
               <div className="hidden sm:flex items-center text-orange-600 font-medium text-sm bg-orange-50 px-3 py-1 rounded-full">
                 <Clock size={14} className="mr-1" /> 剩餘: {timeLeft}
               </div>
             )}
             <button onClick={ctx.logout} className="p-2 text-gray-400 hover:text-mcRed">
               <LogOut size={20} />
             </button>
          </div>
        </div>
        
        {/* Category Tabs */}
        <div className="overflow-x-auto whitespace-nowrap px-4 py-2 border-t scrollbar-hide">
          <div className="flex gap-2 max-w-4xl mx-auto">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat.key
                    ? 'bg-mcDark text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* System Status Banner */}
      {!ctx.settings.isOpen && (
        <div className="bg-red-100 text-red-800 p-4 text-center font-bold">
          <AlertCircle className="inline mb-1 mr-2" size={18} />
          目前暫停訂餐
        </div>
      )}

      {/* Menu Grid */}
      <main className="max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {displayedItems.map(item => {
             // Check if item is in cart
             const inCart = ctx.currentOrder?.items.find(i => i.menuItem.id === item.id);
             
             // Logic for Set availability: Need 1 main per 1 set
             // Valid if not SET, OR (is SET and current Sets < Mains)
             // However, for the button state, we check if adding one more would exceed
             const isSet = item.category === 'SET';
             const canAdd = !isSet || (setCount < mainCount);

             return (
              <div key={item.id} className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow ${!canAdd && isSet && !inCart ? 'opacity-60 grayscale' : ''}`}>
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-800">{item.name}</h3>
                    <span className="font-bold text-mcRed">${item.price}</span>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                    {categories.find(c => c.key === item.category)?.label}
                  </span>
                </div>
                
                <div className="mt-4 flex justify-end">
                  {inCart ? (
                    <div className="flex items-center bg-gray-100 rounded-lg">
                      <button 
                        onClick={() => ctx.updateCartQuantity(item.id, -1)}
                        className="p-2 text-gray-600 hover:text-mcRed"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-bold w-8 text-center">{inCart.quantity}</span>
                      <button 
                        onClick={() => ctx.updateCartQuantity(item.id, 1)}
                        className="p-2 text-gray-600 hover:text-green-600"
                        disabled={!ctx.settings.isOpen || (isSet && setCount >= mainCount)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => ctx.addToCart(item)}
                      disabled={!ctx.settings.isOpen || (!canAdd && isSet)}
                      className="bg-mcYellow hover:bg-yellow-400 text-black font-medium py-2 px-4 rounded-lg text-sm w-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                    >
                      {isSet && !canAdd ? '需搭配主餐' : '加入購物車'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Mobile Sticky Cart Summary */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-transform duration-300 z-30 ${isCartOpen ? 'translate-y-0' : 'translate-y-0'}`}>
        
        {/* Expanded Cart Details */}
        {isCartOpen && (
          <div className="p-4 max-h-[60vh] overflow-y-auto border-b bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">購物車內容</h3>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-500 text-sm">關閉</button>
            </div>
            
            {(ctx.currentOrder?.items.length || 0) === 0 ? (
              <p className="text-center text-gray-400 py-8">購物車是空的</p>
            ) : (
              <div className="space-y-3">
                {ctx.currentOrder?.items.map(item => (
                  <div key={item.menuItem.id} className="flex items-center justify-between bg-white p-3 rounded shadow-sm">
                    <div className="flex-1">
                      <div className="font-medium">{item.menuItem.name}</div>
                      <div className="text-sm text-gray-500">${item.menuItem.price} x {item.quantity}</div>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="font-bold text-gray-700">${item.menuItem.price * item.quantity}</span>
                       <button onClick={() => ctx.removeFromCart(item.menuItem.id)} className="text-red-400 hover:text-red-600">
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </div>
                ))}
                
                {isSetInvalid && (
                   <div className="bg-red-50 text-red-600 p-3 rounded text-sm flex items-center gap-2">
                     <AlertCircle size={16} />
                     警告：配餐數量 ({setCount}) 超過主餐數量 ({mainCount})。請增加主餐或減少配餐。
                   </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom Bar */}
        <div className="p-4 bg-white flex items-center justify-between gap-4">
          <div 
            className="flex-1 cursor-pointer" 
            onClick={() => setIsCartOpen(!isCartOpen)}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <ShoppingCart className="text-gray-700" size={24} />
                {(ctx.currentOrder?.items.length || 0) > 0 && (
                  <span className="absolute -top-2 -right-2 bg-mcRed text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                    {ctx.currentOrder?.items.length}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className={`font-bold text-lg ${isOverBudget ? 'text-red-600' : 'text-gray-800'}`}>
                  ${cartTotal}
                </span>
                <span className="text-xs text-gray-400">
                  上限: ${ctx.settings.maxPrice} {isOverBudget && '(已超額)'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={ctx.submitOrder}
            disabled={!ctx.settings.isOpen || isOverBudget || cartTotal === 0 || isSetInvalid}
            className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${
              !ctx.settings.isOpen || isOverBudget || cartTotal === 0 || isSetInvalid
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-mcRed hover:bg-red-700 active:scale-95'
            }`}
          >
            送出訂單
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentView;