import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  AppContextType, 
  User, 
  UserRole, 
  Order, 
  OrderStatus, 
  MenuItem, 
  SystemSettings 
} from './types';
import { MENU_ITEMS, DEFAULT_SETTINGS, FIREBASE_CONFIG } from './constants';
import Login from './components/Login';
import StudentView from './components/StudentView';
import AdminView from './components/AdminView';

// Firebase Imports
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, remove } from 'firebase/database';
import { getAnalytics } from "firebase/analytics";

// --- Local Storage Keys ---
const STORAGE_KEYS = {
  CURRENT_USER: 'mc_user_v1',
};

const getStorage = <T,>(key: string, defaultVal: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const setStorage = (key: string, val: any) => {
  localStorage.setItem(key, JSON.stringify(val));
};

// --- Firebase Helper ---
let db: any = null;
let analytics: any = null;

const initFirebase = (config: any) => {
  try {
    let app;
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = getDatabase(app);
    if (typeof window !== 'undefined') {
       try {
         analytics = getAnalytics(app);
       } catch (e) {
         // Analytics optional
       }
    }
    return true;
  } catch (e) {
    console.error("Firebase init error:", e);
    return false;
  }
};

// --- Context Setup ---
const AppContext = createContext<AppContextType | null>(null);

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [isConnected, setIsConnected] = useState(false);

  // 1. Initial Load & Connection
  useEffect(() => {
    // Restore user session
    const savedUser = getStorage<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (savedUser) setUser(savedUser);

    // Force Connect to Firebase
    if (FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey) {
      const success = initFirebase(FIREBASE_CONFIG);
      setIsConnected(success);
      if (!success) {
        alert("無法連線至雲端資料庫，請檢查網路或 Firebase 設定。");
      }
    }
  }, []);

  // 2. Firebase Listeners (Always Active)
  useEffect(() => {
    if (!db) return;

    // Listen to Orders
    const ordersRef = ref(db, 'orders');
    const unsubOrders = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // 重要修正：Firebase 若陣列為空會直接移除該 key，導致 items 為 undefined
        // 這裡強制補上空陣列，避免前端操作報錯
        const orderList = (Object.values(data) as any[]).map(o => ({
          ...o,
          items: o.items || [] 
        })) as Order[];
        setOrders(orderList);
      } else {
        setOrders([]);
      }
    });

    // Listen to Settings
    const settingsRef = ref(db, 'settings');
    const unsubSettings = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSettings(data);
      }
    });

    return () => {
      unsubOrders();
      unsubSettings();
    };
  }, [isConnected]);

  // 3. Persist User only
  useEffect(() => {
    setStorage(STORAGE_KEYS.CURRENT_USER, user);
  }, [user]);

  // --- Actions ---

  const login = (name: string, seatNumber: string, isAdmin: boolean) => {
    const newUser: User = {
      id: isAdmin ? 'admin' : seatNumber,
      name,
      seatNumber,
      role: isAdmin ? UserRole.ADMIN : UserRole.STUDENT
    };
    setUser(newUser);

    if (!isAdmin) {
      // 檢查是否已有訂單，若無則建立
      const existing = orders.find(o => o.userId === newUser.id);
      if (!existing && db) {
        const newOrder: Order = {
          id: `ord_${newUser.id}`,
          userId: newUser.id,
          userName: newUser.name,
          seatNumber: newUser.seatNumber,
          items: [],
          totalPrice: 0,
          status: OrderStatus.DRAFT,
          timestamp: Date.now()
        };
        set(ref(db, 'orders/' + newUser.id), newOrder);
      }
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  };

  const getCurrentOrder = (): Order | null => {
    if (!user || user.role === UserRole.ADMIN) return null;
    return orders.find(o => o.userId === user.id) || null;
  };

  const saveOrderToCloud = (order: Order) => {
    if (db) {
      set(ref(db, 'orders/' + order.userId), order).catch(err => {
        alert("資料同步失敗，請檢查網路連線");
        console.error(err);
      });
    } else {
      alert("資料庫尚未連線，請稍後再試");
    }
  };

  // 取得當前訂單或建立臨時訂單物件 (防呆用)
  const getOrInitOrder = (): Order | null => {
    if (!user || user.role === UserRole.ADMIN) return null;
    
    const existing = orders.find(o => o.userId === user.id);
    if (existing) {
      // 再次確保取出的物件有 items 陣列
      return { ...existing, items: existing.items || [] };
    }

    // Fallback: 建立臨時訂單物件
    return {
      id: `ord_${user.id}`,
      userId: user.id,
      userName: user.name,
      seatNumber: user.seatNumber,
      items: [],
      totalPrice: 0,
      status: OrderStatus.DRAFT,
      timestamp: Date.now()
    };
  };

  const addToCart = (item: MenuItem) => {
    const order = getOrInitOrder();
    if (!order) return;
    
    const currentItems = order.items || [];
    const existingItem = currentItems.find(i => i.menuItem.id === item.id);
    
    let newItems;
    if (existingItem) {
      newItems = currentItems.map(i => 
        i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      newItems = [...currentItems, { menuItem: item, quantity: 1 }];
    }
    
    const totalPrice = newItems.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);
    const updatedOrder = { ...order, items: newItems, totalPrice, timestamp: Date.now() };
    saveOrderToCloud(updatedOrder);
  };

  const removeFromCart = (itemId: string) => {
    const order = getOrInitOrder(); // 改用 getOrInitOrder 避免空指標
    if (!order) return;
    
    const currentItems = order.items || [];
    const newItems = currentItems.filter(i => i.menuItem.id !== itemId);
    
    const totalPrice = newItems.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);
    const updatedOrder = { ...order, items: newItems, totalPrice, timestamp: Date.now() };
    saveOrderToCloud(updatedOrder);
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    const order = getOrInitOrder(); // 改用 getOrInitOrder 避免空指標
    if (!order) return;
    
    const currentItems = order.items || [];
    const newItems = currentItems.map(i => {
      if (i.menuItem.id === itemId) {
        return { ...i, quantity: Math.max(0, i.quantity + delta) };
      }
      return i;
    }).filter(i => i.quantity > 0);
    
    const totalPrice = newItems.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);
    const updatedOrder = { ...order, items: newItems, totalPrice, timestamp: Date.now() };
    saveOrderToCloud(updatedOrder);
  };

  const submitOrder = () => {
    const current = getCurrentOrder();
    if (!current) return;
    const updated = { ...current, status: OrderStatus.SUBMITTED };
    saveOrderToCloud(updated);
  };

  const cancelOrder = () => {
    const current = getCurrentOrder();
    if (!current) return;
    const updated = { ...current, status: OrderStatus.DRAFT };
    saveOrderToCloud(updated);
  }

  const adminToggleSystem = (isOpen: boolean) => {
    const newSettings = { ...settings, isOpen };
    if (db) set(ref(db, 'settings'), newSettings);
  };

  const adminSetDeadline = (timestamp: number | null) => {
    const newSettings = { ...settings, deadline: timestamp };
    if (db) set(ref(db, 'settings'), newSettings);
  };

  const adminResetOrder = (orderId: string) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;
    const resetOrder = { ...target, items: [], totalPrice: 0, status: OrderStatus.DRAFT };
    if (db) set(ref(db, 'orders/' + target.userId), resetOrder);
  };

  const adminResetAll = () => {
    if (db) remove(ref(db, 'orders'));
  };

  const contextValue: AppContextType = {
    user,
    login,
    logout,
    menu: MENU_ITEMS,
    orders,
    currentOrder: getCurrentOrder(),
    settings,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    submitOrder,
    cancelOrder,
    adminToggleSystem,
    adminSetDeadline,
    adminResetOrder,
    adminResetAll,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {!isConnected ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-500">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">正在連線至雲端資料庫...</h2>
            <p className="text-sm">請確保您已連上網際網路</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AppContext.Provider>
  );
};

const Main: React.FC = () => {
  const ctx = useContext(AppContext) as any;
  if (!ctx) return <div>載入中...</div>;
  if (!ctx.user) return <Login onLogin={ctx.login} />;
  return ctx.user.role === UserRole.ADMIN 
    ? <AdminView ctx={ctx} /> 
    : <StudentView ctx={ctx} />;
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <Main />
    </AppProvider>
  );
};

export default App;