'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function AdminLoginPage() {
  const router = useRouter();

  // Inisialisasi Supabase Client untuk Browser
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message || 'Email atau password salah');
      }

      // OPTIONAL: Pengecekan role jika akun admin dibedakan via user_metadata/role
      // const userRole = data.user?.user_metadata?.role;
      // if (userRole !== 'admin') {
      //   await supabase.auth.signOut();
      //   throw new Error('Akses ditolak: Akun kamu bukan akun Admin');
      // }

      // Redirect ke dashboard admin
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat login.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-200 space-y-6">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            Admin Portal
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-2">Login Admin</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Masuk untuk mengelola pesanan Jastip & verifikasi pembayaran.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-600 flex items-center gap-2">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Admin</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@jastip.com"
              className="w-full border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3.5 rounded-xl transition shadow-md disabled:opacity-50 active:scale-[0.99]"
          >
            {loading ? 'Memproses Login...' : 'Masuk Dashboard →'}
          </button>
        </form>
      </div>
    </div>
  );
}