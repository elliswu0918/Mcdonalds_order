import React, { useState } from 'react';
import { UserRole } from '../types';
import { User, ShieldCheck } from 'lucide-react';
import { ADMIN_PASSWORD } from '../constants';

interface LoginProps {
  onLogin: (name: string, seatNumber: string, isAdmin: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<UserRole>(UserRole.STUDENT);
  const [name, setName] = useState('');
  const [seat, setSeat] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === UserRole.ADMIN) {
      if (password === ADMIN_PASSWORD) {
        onLogin('小老師', 'ADMIN', true);
      } else {
        setError('管理員密碼錯誤');
      }
    } else {
      if (!name.trim() || !seat.trim()) {
        setError('請輸入姓名與座號');
        return;
      }
      onLogin(name, seat, false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border-t-8 border-mcRed">
        <h1 className="text-3xl font-bold text-center text-mcDark mb-2">
          {mode === UserRole.STUDENT ? '經管系導生聚訂餐系統' : '後台管理登入'}
        </h1>
        <p className="text-center text-gray-500 mb-8">
           Department Gathering Ordering
        </p>

        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
          <button
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              mode === UserRole.STUDENT ? 'bg-white shadow text-mcRed' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => { setMode(UserRole.STUDENT); setError(''); }}
          >
            <div className="flex items-center justify-center gap-2">
              <User size={16} /> 學生點餐
            </div>
          </button>
          <button
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              mode === UserRole.ADMIN ? 'bg-white shadow text-mcRed' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => { setMode(UserRole.ADMIN); setError(''); }}
          >
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck size={16} /> 管理員
            </div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === UserRole.STUDENT ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">座號</label>
                <input
                  type="text"
                  value={seat}
                  onChange={(e) => setSeat(e.target.value)}
                  placeholder="例如: 05"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mcRed focus:border-mcRed outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="請輸入真實姓名"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mcRed focus:border-mcRed outline-none"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">管理密碼</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="輸入密碼"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mcRed focus:border-mcRed outline-none"
              />
            </div>
          )}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full bg-mcRed hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md"
          >
            {mode === UserRole.STUDENT ? '開始點餐' : '登入後台'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;