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

// --- Helper: Sanitize ID for Firebase paths ---
const sanitizeId = (id: string) => {
  return id.replace(/[.#$/[\]]/g, '_');
};

// --- Firebase Helper ---
let db: any = null;

const initFirebase = (config: any) => {
  try {
    let app;
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = getDatabase(app);
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
    const savedUser = getStorage<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (savedUser) setUser(savedUser);

    if (FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey) {
      const success = initFirebase(FIREBASE_CONFIG);
      setIsConnected(success);
      if (!success) {
        alert("無法連線至雲端資料庫，請檢查網路或 Firebase 設定。");
      }
    }
  }, []);

  // 2. Firebase Listeners
  useEffect(() => {
    if (!db) return;

    const ordersRef = ref(db, 'orders');
    const unsubOrders = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const orderList = (Object.values(data) as any[]).map(o => ({
          ...o,
          items: o.items || [] 
        })) as Order[];
        setOrders(orderList);
      } else {
        setOrders([]);
      }
    });

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

  // 3. Persist User
  useEffect(() => {
    setStorage(STORAGE_KEYS.CURRENT_USER, user);
  }, [user]);

  // --- Actions ---

  const saveOrderToCloud = (order: Order) => {
    // 1. Optimistic Update (立即更新本地 State，讓 UI 馬上反應)
    setOrders(prev => {
      const exists = prev.find(o => o.userId === order.userId);
      if (exists) {
        return prev.map(o => o.userId === order.userId ? order : o);
      }
      return [...prev, order];
    });

    // 2. Sync to Cloud
    if (db) {
      set(ref(db, 'orders/' + sanitizeId(order.userId)), order).catch(err => {
        console.error("Firebase Set Error:", err);
        if (err.code === 'PERMISSION_DENIED') {
          alert("【錯誤】資料庫權限不足！\n請至 Firebase Console -> Realtime Database -> Rules\n將 read 和 write 設為 true。");
        } else {
          alert("資料同步失敗，請檢查網路連線");
        }
      });
    } else {
      console.warn("Database not initialized");
    }
  };

  const login = (name: string, seatNumber: string, isAdmin: boolean) => {
    const safeSeat = sanitizeId(seatNumber);
    const newUser: User = {
      id: isAdmin ? 'admin' : safeSeat,
      name,
      seatNumber: safeSeat,
      role: isAdmin ? UserRole.ADMIN : UserRole.STUDENT
    };
    setUser(newUser);

    if (!isAdmin) {
      // Login 時若無訂單，建立初始訂單 (也會觸發 Optimistic Update)
      const existing = orders.find(o => o.userId === newUser.id);
      if (!existing) {
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
        // 這裡直接呼叫 saveOrderToCloud 確保同步
        saveOrderToCloud(newOrder); 
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

  // Helper to ensure we always have an order object to work with
  const getOrInitOrder = (): Order => {
    if (!user || user.role === UserRole.ADMIN) throw new Error("Invalid user role");
    
    const existing = orders.find(o => o.userId === user.id);
    if (existing) {
      return { ...existing, items: existing.items || [] };
    }

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
    if (!user) return;
    const order = getOrInitOrder();
    
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
    if (!user) return;
    const order = getOrInitOrder();
    
    const currentItems = order.items || [];
    const newItems = currentItems.filter(i => i.menuItem.id !== itemId);
    
    const totalPrice = newItems.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);
    const updatedOrder = { ...order, items: newItems, totalPrice, timestamp: Date.now() };
    saveOrderToCloud(updatedOrder);
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    if (!user) return;
    const order = getOrInitOrder();
    
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
    // Optimistic
    setSettings(newSettings);
    if (db) set(ref(db, 'settings'), newSettings);
  };

  const adminSetDeadline = (timestamp: number | null) => {
    const newSettings = { ...settings, deadline: timestamp };
    setSettings(newSettings);
    if (db) set(ref(db, 'settings'), newSettings);
  };

  const adminResetOrder = (orderId: string) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;
    const resetOrder = { ...target, items: [], totalPrice: 0, status: OrderStatus.DRAFT };
    saveOrderToCloud(resetOrder);
  };

  const adminResetAll = () => {
    setOrders([]); // Optimistic clear
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