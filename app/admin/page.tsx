'use client';

import { useState, useEffect } from 'react';

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string>('ALL'); // ALL, TITIP_BELI_TOKO, TITIP_BELI_ONLINE, TITIP_KIRIM
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');  // ALL, BARU, KELOLA_HARGA, VERIFIKASI_DP, LUNAS

  useEffect(() => {
    fetchAdminOrders();
  }, []);

  const fetchAdminOrders = async () => {
    const res = await fetch('/api/admin/orders');
    const data = await res.json();
    setOrders(data || []);
  };

  // Filter 2 Tingkat
  const filteredOrders = orders.filter((o) => {
    const matchService = selectedService === 'ALL' || o.package_type === selectedService;
    
    let matchStatus = true;
    if (selectedStatus === 'BARU') matchStatus = o.order_status === 'baru' || o.order_status === 'perlu_revisi_stok';
    else if (selectedStatus === 'KELOLA_HARGA') matchStatus = o.order_status === 'harga_ditetapkan';
    else if (selectedStatus === 'VERIFIKASI_DP') matchStatus = o.dp_payment_status === 'verified' && o.final_payment_status !== 'verified';
    else if (selectedStatus === 'LUNAS') matchStatus = o.final_payment_status === 'verified';

    return matchService && matchStatus;
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-900">Dashboard Admin Jastip</h1>
      </div>

      {/* FILTER LEVEL 1: TAB LAYANAN */}
      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        {[
          { id: 'ALL', label: 'Semua Layanan' },
          { id: 'TITIP_BELI_TOKO', label: '🛍️ Titip Toko' },
          { id: 'TITIP_BELI_ONLINE', label: '🌐 Checkout Online' },
          { id: 'TITIP_KIRIM', label: '📦 Titip Kirim' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedService(tab.id)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              selectedService === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* FILTER LEVEL 2: TAB STATUS PROGRESS */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { id: 'ALL', label: 'Semua Status' },
          { id: 'BARU', label: '📥 Masuk / Revisi' },
          { id: 'KELOLA_HARGA', label: '💰 Sudah Cek Harga' },
          { id: 'VERIFIKASI_DP', label: '🛡️ Verifikasi DP 75%' },
          { id: 'LUNAS', label: '✅ Lunas' }
        ].map((subTab) => (
          <button
            key={subTab.id}
            onClick={() => setSelectedStatus(subTab.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
              selectedStatus === subTab.id
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {subTab.label}
          </button>
        ))}
      </div>

      {/* LIST ORDER TABEL */}
      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b font-bold text-slate-600 uppercase">
              <th className="p-3">Order #</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Layanan</th>
              <th className="p-3">Total (IDR)</th>
              <th className="p-3">DP 75%</th>
              <th className="p-3">Status DP</th>
              <th className="p-3">Pelunasan</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-400 font-medium">Tidak ada pesanan ditemukan.</td>
              </tr>
            ) : (
              filteredOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-indigo-600">#{ord.order_number}</td>
                  <td className="p-3">{ord.customer_name}</td>
                  <td className="p-3 font-semibold">{ord.package_type}</td>
                  <td className="p-3 font-bold">Rp {Number(ord.total_price_idr || 0).toLocaleString('id-ID')}</td>
                  <td className="p-3 text-emerald-700 font-bold">Rp {Number(ord.dp_amount_idr || 0).toLocaleString('id-ID')}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                      ord.dp_payment_status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {ord.dp_payment_status}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                      ord.final_payment_status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {ord.final_payment_status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <a
                      href={`/admin/orders/${ord.id}`}
                      className="px-3 py-1 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800"
                    >
                      Kelola →
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}