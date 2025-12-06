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
import { MENU_ITEMS, DEFAULT_SETTINGS } from './constants';
import Login from './components/Login';
import StudentView from './components/StudentView';
import AdminView from './components/AdminView';

// --- Local Storage Helpers ---
const STORAGE_KEYS = {
  ORDERS: 'mc_orders_v1',
  SETTINGS: 'mc_settings_v1',
  CURRENT_USER: 'mc_user_v1', // Simple session persistence
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

// --- Context Setup ---
const AppContext = createContext<AppContextType | null>(null);

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  // Load initial data
  useEffect(() => {
    const savedOrders = getStorage<Order[]>(STORAGE_KEYS.ORDERS, []);
    const savedSettings = getStorage<SystemSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const savedUser = getStorage<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    
    setOrders(savedOrders);
    setSettings(savedSettings);
    if (savedUser) setUser(savedUser);
  }, []);

  // Persist Data on Change
  useEffect(() => {
    setStorage(STORAGE_KEYS.ORDERS, orders);
  }, [orders]);

  useEffect(() => {
    setStorage(STORAGE_KEYS.SETTINGS, settings);
  }, [settings]);

  useEffect(() => {
    setStorage(STORAGE_KEYS.CURRENT_USER, user);
  }, [user]);

  // Actions
  const login = (name: string, seatNumber: string, isAdmin: boolean) => {
    const newUser: User = {
      id: isAdmin ? 'admin' : seatNumber, // Use seat number as ID for students for simplicity
      name,
      seatNumber,
      role: isAdmin ? UserRole.ADMIN : UserRole.STUDENT
    };
    setUser(newUser);

    // If student, ensure an order object exists
    if (!isAdmin) {
      setOrders(prev => {
        const existing = prev.find(o => o.userId === newUser.id);
        if (existing) return prev;
        return [...prev, {
          id: `ord_${Date.now()}`,
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

  const updateOrderItems = (items: any[]) => {
    if (!user) return;
    const totalPrice = items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);
    
    setOrders(prev => prev.map(o => {
      if (o.userId === user.id) {
        return { ...o, items, totalPrice, timestamp: Date.now() };
      }
      return o;
    }));
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
    if (!user) return;
    setOrders(prev => prev.map(o => {
      if (o.userId === user.id) {
        return { ...o, status: OrderStatus.SUBMITTED };
      }
      return o;
    }));
  };

  const cancelOrder = () => {
    if (!user) return;
    setOrders(prev => prev.map(o => {
      if (o.userId === user.id) {
        return { ...o, status: OrderStatus.DRAFT };
      }
      return o;
    }));
  }

  // Admin Actions
  const adminToggleSystem = (isOpen: boolean) => {
    setSettings(prev => ({ ...prev, isOpen }));
  };

  const adminSetDeadline = (timestamp: number | null) => {
    setSettings(prev => ({ ...prev, deadline: timestamp }));
  };

  const adminResetOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return { ...o, items: [], totalPrice: 0, status: OrderStatus.DRAFT };
      }
      return o;
    }));
  };

  const adminResetAll = () => {
    setOrders([]);
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
    adminResetAll
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

// --- Main App Component ---
const Main: React.FC = () => {
  const ctx = useContext(AppContext);
  
  if (!ctx) return <div>Loading...</div>;

  if (!ctx.user) {
    return <Login onLogin={ctx.login} />;
  }

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