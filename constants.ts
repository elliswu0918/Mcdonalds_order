import { MenuItem, SystemSettings } from './types';

// --- Firebase Configuration ---
// 這裡填入您的 Firebase 設定，讓全班都能自動連線
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBJ9SenGu3oQfeOSZDoKIrUw1gfSrCKHmI",
  authDomain: "realtime-database-be877.firebaseapp.com",
  projectId: "realtime-database-be877",
  storageBucket: "realtime-database-be877.firebasestorage.app",
  messagingSenderId: "942813975442",
  appId: "1:942813975442:web:05fa796674e6fbaddc274b",
  measurementId: "G-9QRGSH0VRP",
  // 根據您的 Project ID 推斷的資料庫網址 (預設為 US-Central1)
  databaseURL: "https://realtime-database-be877-default-rtdb.firebaseio.com"
};

export const MENU_ITEMS: MenuItem[] = [
  // --- 超值全餐 (Value Meals) ---
  { id: 'm1', name: '大麥克', price: 78, category: 'MAIN' },
  { id: 'm2', name: '雙層牛肉吉事堡', price: 72, category: 'MAIN' },
  { id: 'm3', name: '嫩煎雞腿堡', price: 83, category: 'MAIN' },
  { id: 'm4', name: '麥香雞', price: 48, category: 'MAIN' },
  { id: 'm5', name: '麥克雞塊(6塊)', price: 68, category: 'MAIN' },
  { id: 'm6', name: '麥克雞塊(10塊)', price: 109, category: 'MAIN' },
  { id: 'm7', name: '勁辣雞腿堡', price: 78, category: 'MAIN' },
  { id: 'm8', name: '麥脆雞腿(2塊)', price: 126, category: 'MAIN' },
  { id: 'm9', name: '雙層麥香雞', price: 78, category: 'MAIN' },
  { id: 'm10', name: '麥香魚', price: 52, category: 'MAIN' },
  { id: 'm11', name: '四盎司牛肉堡', price: 92, category: 'MAIN' },
  { id: 'm12', name: '雙層四盎司牛肉堡', price: 132, category: 'MAIN' },
  { id: 'm13', name: '麥脆雞腿(1塊)', price: 69, category: 'MAIN' }, // 單點補充

  // --- 極選系列 (Signature Series) ---
  { id: 'sig1', name: 'BLT安格斯黑牛堡', price: 122, category: 'MAIN' },
  { id: 'sig2', name: 'BLT嫩煎雞腿堡', price: 122, category: 'MAIN' },
  { id: 'sig3', name: '蕈菇安格斯黑牛堡', price: 132, category: 'MAIN' },
  { id: 'sig4', name: '蕈菇主廚鷄腿堡', price: 132, category: 'MAIN' },
  { id: 'sig5', name: '帕瑪森安格斯牛肉堡', price: 127, category: 'MAIN' },
  { id: 'sig6', name: '帕瑪森主廚鷄腿堡', price: 127, category: 'MAIN' },
  
  // --- 期間限定 (Limited Time) ---
  { id: 'lim1', name: '炸蝦天婦羅安格斯牛肉堡', price: 134, category: 'MAIN' },
  { id: 'lim2', name: '炸蝦天婦羅辣鷄堡', price: 134, category: 'MAIN' },
  { id: 'lim3', name: '雙蝦天婦羅堡', price: 134, category: 'MAIN' },

  // --- 配餐 (Set Options - Add-on Prices) ---
  { id: 's1', name: 'A經典配餐 (中薯+38飲)', price: 65, category: 'SET' },
  { id: 's2', name: 'B清爽配餐 (沙拉+38飲)', price: 70, category: 'SET' },
  { id: 's3', name: 'C勁脆配餐 (麥脆雞+38飲)', price: 84, category: 'SET' },
  { id: 's4', name: 'D炫冰配餐 (冰炫風+小薯+38飲)', price: 99, category: 'SET' },
  { id: 's5', name: 'E豪吃配餐 (雞塊4塊+小薯+38飲)', price: 99, category: 'SET' },
  { id: 's6', name: 'F地瓜配餐 (地瓜條+38飲)', price: 81, category: 'SET' },
  
  // --- 點心 (Snacks) ---
  { id: 'sn1', name: '麥克雞塊(4塊)', price: 48, category: 'SNACK' },
  { id: 'sn2', name: '薯條(小)', price: 40, category: 'SNACK' },
  { id: 'sn3', name: '薯條(中)', price: 50, category: 'SNACK' },
  { id: 'sn4', name: '薯條(大)', price: 66, category: 'SNACK' },
  { id: 'sn5', name: '黃金地瓜條', price: 66, category: 'SNACK' },
  { id: 'sn6', name: '勁辣香雞翅(1對)', price: 49, category: 'SNACK' },
  { id: 'sn7', name: '蘋果派', price: 40, category: 'SNACK' },
  { id: 'sn8', name: 'OREO冰炫風', price: 59, category: 'SNACK' },
  { id: 'sn9', name: '蛋捲冰淇淋', price: 18, category: 'SNACK' },
  
  // --- 飲料 (Drinks) ---
  { id: 'd1', name: '可口可樂(中)', price: 38, category: 'DRINK' },
  { id: 'd2', name: '雪碧(中)', price: 38, category: 'DRINK' },
  { id: 'd3', name: '檸檬紅茶(中)', price: 38, category: 'DRINK' },
  { id: 'd4', name: '無糖綠茶(中)', price: 43, category: 'DRINK' },
  { id: 'd5', name: '玉米湯(小)', price: 45, category: 'DRINK' },
  { id: 'd6', name: '玉米湯(大)', price: 55, category: 'DRINK' },
  { id: 'd7', name: '焦糖冰奶茶', price: 68, category: 'DRINK' },
  { id: 'd8', name: '蜂蜜奶茶(大)', price: 68, category: 'DRINK' },
];

export const DEFAULT_SETTINGS: SystemSettings = {
  isOpen: true,
  deadline: null,
  maxPrice: 170,
};

export const ADMIN_PASSWORD = "admin";