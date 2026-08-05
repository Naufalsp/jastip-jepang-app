'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<any>(null);
  const [revisedItems, setRevisedItems] = useState<any[]>([]);

  useEffect(() => {
    fetchOrder();
  }, []);

  const fetchOrder = async () => {
    const res = await fetch(`/api/orders/detail?orderNumber=${params.order_number}`);
    const data = await res.json();
    setOrder(data);
    if (data?.order_items) {
      setRevisedItems(data.order_items);
    }
  };

  const handleReorderOutOfStock = async () => {
    const res = await fetch('/api/orders/revise-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, items: revisedItems })
    });
    if (res.ok) {
      alert('Pengajuan revisi stok berhasil dikirim ke Admin!');
      fetchOrder();
    }
  };

  if (!order) return <div className="p-6 text-center text-xs font-bold">Loading detail order...</div>;

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 my-6 bg-white border rounded-2xl shadow-sm space-y-6 text-slate-800">
      <div className="border-b pb-3">
        <h1 className="text-lg font-black text-slate-900">Pesanan #{order.order_number}</h1>
        <p className="text-xs text-slate-500">Status: <span className="font-bold uppercase text-indigo-600">{order.order_status}</span></p>
      </div>

      {/* Rincian Barang & Verifikasi Stok */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-700 uppercase">Daftar Barang</h2>
        {order.order_items?.map((item: any, idx: number) => (
          <div key={item.id} className="p-3 border rounded-xl text-xs space-y-1">
            <div className="flex justify-between font-bold">
              <span>{item.item_name} x {item.quantity}</span>
              <span className={item.availability_status === 'out_of_stock' ? 'text-rose-600' : 'text-emerald-600'}>
                {item.availability_status === 'out_of_stock' ? '❌ Stok Kosong' : '✓ Tersedia'}
              </span>
            </div>
            
            {/* Input Revisi jika Stok Kosong */}
            {item.availability_status === 'out_of_stock' && order.order_status === 'perlu_revisi_stok' && (
              <div className="mt-2 p-2 bg-rose-50 rounded-lg space-y-1">
                <p className="text-[10px] text-rose-700 font-bold">Ubah Pengajuan Barang Ini:</p>
                <input
                  type="text"
                  placeholder="Nama Barang Pengganti"
                  className="w-full p-1 border rounded bg-white text-xs"
                  value={revisedItems[idx]?.item_name || ''}
                  onChange={(e) => {
                    const updated = [...revisedItems];
                    updated[idx].item_name = e.target.value;
                    setRevisedItems(updated);
                  }}
                />
              </div>
            )}
          </div>
        ))}

        {order.order_status === 'perlu_revisi_stok' && (
          <button
            onClick={handleReorderOutOfStock}
            className="w-full py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold"
          >
            Kirim Ulang Revisi Barang Kosong →
          </button>
        )}
      </div>

      {/* RINCIAN BIAYA (HANYA MUNCUL JIKA HARGA DIINPUT ADMIN) */}
      {order.total_price_idr > 0 && (
        <div className="bg-slate-50 p-4 rounded-xl border text-xs space-y-2">
          <div className="font-bold text-slate-700 uppercase border-b pb-2 text-[11px]">Rincian Pembayaran</div>
          
          <div className="flex justify-between">
            <span>Total Harga Barang:</span>
            <span className="font-bold">Rp {Number(order.items_price_idr).toLocaleString('id-ID')}</span>
          </div>

          <div className="flex justify-between">
            <span>Fee Jastip (Termasuk Transportasi Flat):</span>
            <span className="font-bold">Rp {Number(order.jastip_fee_idr).toLocaleString('id-ID')}</span>
          </div>

          <div className="flex justify-between text-indigo-700 border-t pt-2 font-black text-sm">
            <span>Harga Total (100%):</span>
            <span>Rp {Number(order.total_price_idr).toLocaleString('id-ID')}</span>
          </div>

          <div className="flex justify-between text-emerald-700 bg-emerald-50 p-2.5 rounded-lg font-black text-xs">
            <span>Wajib DP 75%:</span>
            <span>Rp {Number(order.dp_amount_idr).toLocaleString('id-ID')}</span>
          </div>
        </div>
      )}

      {/* STATUS PAYMENTS */}
      <div className="space-y-2 text-xs">
        <div className="p-3 border rounded-xl flex justify-between items-center">
          <div>
            <p className="font-bold">Tahap 1: DP 75%</p>
            <p className="text-[10px] text-slate-500">Rp {Number(order.dp_amount_idr).toLocaleString('id-ID')}</p>
          </div>
          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
            order.dp_payment_status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {order.dp_payment_status}
          </span>
        </div>

        <div className="p-3 border rounded-xl flex justify-between items-center">
          <div>
            <p className="font-bold">Tahap 2: Pelunasan Sisa 25%</p>
            <p className="text-[10px] text-slate-500">Rp {(Number(order.total_price_idr) - Number(order.dp_amount_idr)).toLocaleString('id-ID')}</p>
          </div>
          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
            order.final_payment_status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {order.final_payment_status}
          </span>
        </div>
      </div>
    </div>
  );
}