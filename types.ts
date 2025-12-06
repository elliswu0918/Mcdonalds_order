export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  CONFIRMED = 'CONFIRMED',
}

export type Category = 'MAIN' | 'SET' | 'DRINK' | 'SNACK';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: Category;
  image?: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  seatNumber: string;
  items: CartItem[];
  totalPrice: number;
  status: OrderStatus;
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  seatNumber: string; // Used as ID for students
  role: UserRole;
}

export interface SystemSettings {
  isOpen: boolean;
  deadline: number | null; // timestamp
  maxPrice: number;
}

export interface AppContextType {
  user: User | null;
  login: (name: string, seatNumber: string, isAdmin?: boolean) => void;
  logout: () => void;
  menu: MenuItem[];
  orders: Order[];
  currentOrder: Order | null;
  settings: SystemSettings;
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, delta: number) => void;
  submitOrder: () => void;
  cancelOrder: () => void; // Student undo
  adminToggleSystem: (isOpen: boolean) => void;
  adminSetDeadline: (date: number | null) => void;
  adminResetOrder: (orderId: string) => void;
  adminResetAll: () => void;
}