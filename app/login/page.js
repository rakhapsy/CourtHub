"use client";

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // State untuk form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // Hanya untuk register

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        setMessage({ type: 'success', text: 'Login berhasil! Mengalihkan...' });
        router.push('/'); // 3. Arahkan ke halaman utama
        
      } else {
        const { error } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: fullName } }
        });
        if (error) throw error;

        setMessage({ type: 'success', text: 'Registrasi berhasil! Mengalihkan...' });
        router.push('/'); // 4. Arahkan ke halaman utama juga
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-4xl font-extrabold text-[#033671]">
          CourtHub
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 font-medium">
          {isLogin ? 'Masuk ke akun Anda' : 'Buat akun baru untuk mulai booking'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-slate-200">
          
          {/* Notifikasi Error / Success */}
          {message.text && (
            <div className={`mb-4 p-3 rounded-md text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {message.text}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleAuth}>
            {/* Input Nama Lengkap (Hanya tampil saat mode Register) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-bold text-[#033671]">
                  Nama Lengkap
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    required={!isLogin}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-[#87dd70] focus:border-[#87dd70] sm:text-sm transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-[#033671]">
                Email
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-[#87dd70] focus:border-[#87dd70] sm:text-sm transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#033671]">
                Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-[#87dd70] focus:border-[#87dd70] sm:text-sm transition-colors"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-[#033671] hover:bg-[#87dd70] hover:text-[#033671] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#033671] transition-colors disabled:opacity-50"
              >
                {loading ? 'Memproses...' : (isLogin ? 'Masuk' : 'Daftar')}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">
                  {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="w-full inline-flex justify-center py-2 px-4 border border-slate-300 rounded-md shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {isLogin ? 'Buat Akun Baru' : 'Masuk ke Akun Anda'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}