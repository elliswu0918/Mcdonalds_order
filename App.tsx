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
import { Database } from 'lucide-react';

// --- Local Storage Keys ---
const STORAGE_KEYS = {
  ORDERS: 'mc_orders_v1',
  SETTINGS: 'mc_settings_v1',
  CURRENT_USER: 'mc_user_v1',
  FIREBASE_CONFIG: 'mc_firebase_config',
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

const initFirebase = (config: any) => {
  try {
    let app;
    // Check if Firebase is already initialized to avoid duplicate errors
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
  
  // Cloud Mode State
  const [firebaseConfig, setFirebaseConfig] = useState<any>(null);
  const [isCloudMode, setIsCloudMode] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    const savedUser = getStorage<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (savedUser) setUser(savedUser);

    // PRIORITY 1: Try Hardcoded Config
    let initialized = false;
    if (FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey) {
      if (initFirebase(FIREBASE_CONFIG)) {
        setIsCloudMode(true);
        setFirebaseConfig(FIREBASE_CONFIG);
        initialized = true;
      }
    }

    // PRIORITY 2: Try Local Storage Config (Fallback)
    if (!initialized) {
      const savedConfig = getStorage<any>(STORAGE_KEYS.FIREBASE_CONFIG, null);
      if (savedConfig) {
        setFirebaseConfig(savedConfig);
        if (initFirebase(savedConfig)) {
          setIsCloudMode(true);
        }
      } else {
        // Only load local data if NOT in cloud mode
        const savedOrders = getStorage<Order[]>(STORAGE_KEYS.ORDERS, []);
        const savedSettings = getStorage<SystemSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
        setOrders(savedOrders);
        setSettings(savedSettings);
      }
    }
  }, []);

  // 2. Firebase Listeners (If Cloud Mode)
  useEffect(() => {
    if (!isCloudMode || !db) return;

    // Listen to Orders
    const ordersRef = ref(db, 'orders');
    const unsubOrders = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const orderList = Object.values(data) as Order[];
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
  }, [isCloudMode]);

  // 3. Persist Data (Local Mode fallback)
  useEffect(() => {
    if (!isCloudMode) {
      setStorage(STORAGE_KEYS.ORDERS, orders);
    }
  }, [orders, isCloudMode]);

  useEffect(() => {
    if (!isCloudMode) {
      setStorage(STORAGE_KEYS.SETTINGS, settings);
    }
  }, [settings, isCloudMode]);

  useEffect(() => {
    setStorage(STORAGE_KEYS.CURRENT_USER, user);
  }, [user]);

  // --- Actions ---

  const saveFirebaseConfig = (configStr: string) => {
    try {
      const cleaned = configStr.replace(/const firebaseConfig = /, '').replace(/;/g, '');
      // eslint-disable-next-line
      const config = new Function(`return ${cleaned}`)();
      
      setStorage(STORAGE_KEYS.FIREBASE_CONFIG, config);
      setFirebaseConfig(config);
      if (initFirebase(config)) {
        setIsCloudMode(true);
        setShowConfigModal(false);
        alert("成功連線至雲端資料庫！");
      }
    } catch (e) {
      alert("設定格式錯誤，請確保複製完整的 firebaseConfig 物件");
    }
  };

  const login = (name: string, seatNumber: string, isAdmin: boolean) => {
    const newUser: User = {
      id: isAdmin ? 'admin' : seatNumber,
      name,
      seatNumber,
      role: isAdmin ? UserRole.ADMIN : UserRole.STUDENT
    };
    setUser(newUser);

    // Only prompt admin if we failed to connect to cloud automatically
    if (isAdmin && !isCloudMode) {
      setShowConfigModal(true);
    }

    if (!isAdmin) {
      setOrders(prev => {
        const existing = prev.find(o => o.userId === newUser.id);
        if (existing) return prev;
        return [...prev, {
          id: `ord_${newUser.id}`,
          userId: newUser.id,
          userName: newUser.name,
          seatNumber: newUser.seatNumber,
          items: [],
          totalPrice: 0,
          status: OrderStatus.DRAFT,
          timestamp: Date.now()
        }];
      });
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

  const saveOrder = (order: Order) => {
    if (isCloudMode && db) {
      set(ref(db, 'orders/' + order.userId), order);
    } else {
      setOrders(prev => prev.map(o => o.userId === order.userId ? order : o));
    }
  };

  const updateOrderItems = (items: any[]) => {
    if (!user) return;
    const current = getCurrentOrder();
    if (!current) return;

    const totalPrice = items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);
    const updatedOrder = { ...current, items, totalPrice, timestamp: Date.now() };
    saveOrder(updatedOrder);
  };

  const addToCart = (item: MenuItem) => {
    const order = getCurrentOrder();
    if (!order) return;
    
    const existingItem = order.items.find(i => i.menuItem.id === item.id);
    let newItems;
    if (existingItem) {
      newItems = order.items.map(i => 
        i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      newItems = [...order.items, { menuItem: item, quantity: 1 }];
    }
    updateOrderItems(newItems);
  };

  const removeFromCart = (itemId: string) => {
    const order = getCurrentOrder();
    if (!order) return;
    const newItems = order.items.filter(i => i.menuItem.id !== itemId);
    updateOrderItems(newItems);
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    const order = getCurrentOrder();
    if (!order) return;
    
    const newItems = order.items.map(i => {
      if (i.menuItem.id === itemId) {
        return { ...i, quantity: Math.max(0, i.quantity + delta) };
      }
      return i;
    }).filter(i => i.quantity > 0);
    
    updateOrderItems(newItems);
  };

  const submitOrder = () => {
    const current = getCurrentOrder();
    if (!current) return;
    const updated = { ...current, status: OrderStatus.SUBMITTED };
    saveOrder(updated);
  };

  const cancelOrder = () => {
    const current = getCurrentOrder();
    if (!current) return;
    const updated = { ...current, status: OrderStatus.DRAFT };
    saveOrder(updated);
  }

  const adminToggleSystem = (isOpen: boolean) => {
    const newSettings = { ...settings, isOpen };
    if (isCloudMode && db) {
      set(ref(db, 'settings'), newSettings);
    } else {
      setSettings(newSettings);
    }
  };

  const adminSetDeadline = (timestamp: number | null) => {
    const newSettings = { ...settings, deadline: timestamp };
    if (isCloudMode && db) {
      set(ref(db, 'settings'), newSettings);
    } else {
      setSettings(newSettings);
    }
  };

  const adminResetOrder = (orderId: string) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;
    
    const resetOrder = { ...target, items: [], totalPrice: 0, status: OrderStatus.DRAFT };
    
    if (isCloudMode && db) {
      set(ref(db, 'orders/' + target.userId), resetOrder);
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? resetOrder : o));
    }
  };

  const adminResetAll = () => {
    if (isCloudMode && db) {
      remove(ref(db, 'orders'));
    } else {
      setOrders([]);
    }
  };

  const contextValue: AppContextType & { 
    isCloudMode: boolean; 
    setShowConfigModal: (v: boolean) => void; 
    saveFirebaseConfig: (v: string) => void 
  } = {
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
    isCloudMode,
    setShowConfigModal,
    saveFirebaseConfig
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Database className="text-mcRed" /> 設定雲端資料庫
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              連線失敗。請確認 constants.ts 中的設定是否正確，或在此手動輸入。
            </p>
            <textarea 
              className="w-full h-40 border p-2 rounded text-xs font-mono bg-gray-50 mb-4"
              placeholder={`{
  apiKey: "...",
  databaseURL: "...",
  ...
}`}
              id="firebase-config-input"
            ></textarea>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded"
              >
                稍後設定
              </button>
              <button 
                onClick={() => {
                  const val = (document.getElementById('firebase-config-input') as HTMLTextAreaElement).value;
                  saveFirebaseConfig(val);
                }}
                className="px-4 py-2 bg-mcRed text-white rounded hover:bg-red-700"
              >
                儲存並連線
              </button>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

const Main: React.FC = () => {
  const ctx = useContext(AppContext) as any;
  if (!ctx) return <div>Loading...</div>;
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