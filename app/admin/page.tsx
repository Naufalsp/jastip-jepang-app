// 'use client';

// import { useEffect, useState, useMemo } from 'react';
// import Link from 'next/link';
// import { supabase } from '@/lib/supabase';
// import { triggerWAOnStatusOrVerificationChange } from '@/lib/whatsapp';

// // Pemetaan Label Status untuk Admin Dashboard
// const STATUS_LABELS: Record<string, { label: string; color: string }> = {
//   pesanan_baru: { label: 'Pesanan Baru', color: 'bg-blue-50 text-blue-700 border-blue-300' },
//   tersedia: { label: 'Tersedia', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
//   tidak_ada_stok: { label: 'Tidak Ada Stok', color: 'bg-rose-50 text-rose-700 border-rose-300' },
//   menunggu_dp: { label: 'Menunggu DP', color: 'bg-amber-50 text-amber-700 border-amber-300' },
//   menunggu_pelunasan: { label: 'Menunggu Pelunasan', color: 'bg-indigo-50 text-indigo-700 border-indigo-300' },
//   berangkat_dari_jepang: { label: 'Berangkat Dari Jepang', color: 'bg-purple-50 text-purple-700 border-purple-300' },
//   tiba_di_indonesia: { label: 'Tiba Di Indonesia', color: 'bg-teal-50 text-teal-700 border-teal-300' },
//   diantar_ke_alamat: { label: 'Diantar Ke Alamat', color: 'bg-cyan-50 text-cyan-700 border-cyan-300' },
//   barang_telah_diterima: { label: 'Barang Telah Diterima', color: 'bg-emerald-100 text-emerald-800 border-emerald-400' },
// };

// // Sub-komponen Verifikasi Pembayaran Admin (Dengan WA Otomatis)
// function AdminOrderVerification({ order, onRefresh }: { order: any; onRefresh: () => void }) {
//   const [modalType, setModalType] = useState<'dp' | 'final' | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [zoomScale, setZoomScale] = useState(1);

//   if (!order) return null;

//   const handleOpenModal = (type: 'dp' | 'final') => {
//     setZoomScale(1);
//     setModalType(type);
//   };

//   const handleZoomIn = () => setZoomScale((prev) => Math.min(prev + 0.25, 3));
//   const handleZoomOut = () => setZoomScale((prev) => Math.max(prev - 0.25, 0.5));
//   const handleResetZoom = () => setZoomScale(1);

//   const handleVerify = async (type: 'dp' | 'final') => {
//     try {
//       setLoading(true);

//       const updatePayload: any = {};
//       let actionType: 'verify_dp' | 'verify_final' = 'verify_dp';
//       let nextStatus = '';

//       if (type === 'dp') {
//         updatePayload.dp_verified = true;
//         updatePayload.order_status = 'menunggu_pelunasan';
//         actionType = 'verify_dp';
//         nextStatus = 'menunggu_pelunasan';
//       } else {
//         updatePayload.final_verified = true;
//         updatePayload.order_status = 'berangkat_dari_jepang';
//         actionType = 'verify_final';
//         nextStatus = 'berangkat_dari_jepang';
//       }

//       const { error } = await supabase
//         .from('orders')
//         .update(updatePayload)
//         .eq('id', order.id);

//       if (error) throw error;

//       // OTOMATIS KIRIM WA KONDISI 3 ATAU KONDISI 5
//       triggerWAOnStatusOrVerificationChange(order, nextStatus, actionType).catch(console.error);

//       setModalType(null);
//       onRefresh();
//     } catch (err: any) {
//       alert('Gagal memverifikasi: ' + (err.message || err));
//     } finally {
//       setLoading(false);
//     }
//   };

//   const activeProofUrl = modalType === 'dp' ? order?.dp_payment_proof_url : order?.final_payment_proof_url;

//   return (
//     <div className="space-y-2 mt-3">
//       <div className="flex flex-wrap gap-2">
//         {order?.dp_payment_proof_url && (
//           <button
//             type="button"
//             onClick={() => handleOpenModal('dp')}
//             className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
//               order?.dp_verified
//                 ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
//                 : 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
//             }`}
//           >
//             {order?.dp_verified ? '✓ Bukti DP Terverifikasi' : '🔍 Cek Bukti DP'}
//           </button>
//         )}

//         {order?.final_payment_proof_url && (
//           <button
//             type="button"
//             onClick={() => handleOpenModal('final')}
//             className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
//               order?.final_verified
//                 ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
//                 : 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
//             }`}
//           >
//             {order?.final_verified ? '✓ Bukti Pelunasan Terverifikasi' : '🔍 Cek Bukti Pelunasan'}
//           </button>
//         )}
//       </div>

//       {modalType && (
//         <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
//           <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
//             <div className="flex justify-between items-center border-b pb-3">
//               <h3 className="text-sm font-extrabold text-slate-900">
//                 Verifikasi Bukti {modalType === 'dp' ? 'DP' : 'Pelunasan'} (#{order?.order_number})
//               </h3>
//               <button
//                 type="button"
//                 onClick={() => setModalType(null)}
//                 className="text-slate-400 hover:text-slate-700 font-bold text-sm"
//               >
//                 ✕
//               </button>
//             </div>

//             <div className="relative bg-slate-900 rounded-2xl overflow-hidden max-h-[360px] h-80 flex items-center justify-center border border-slate-700">
//               {activeProofUrl ? (
//                 <div className="w-full h-full overflow-auto flex items-center justify-center p-2">
//                   <img
//                     src={activeProofUrl}
//                     alt="Bukti Transfer"
//                     style={{ transform: `scale(${zoomScale})` }}
//                     className="object-contain max-h-full transition-transform duration-200 ease-out origin-center cursor-grab active:cursor-grabbing"
//                   />
//                 </div>
//               ) : (
//                 <p className="text-xs text-slate-400 p-8">Bukti gambar tidak ditemukan.</p>
//               )}

//               {activeProofUrl && (
//                 <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 text-white text-xs">
//                   <button type="button" onClick={handleZoomOut} className="px-2 py-1 hover:bg-slate-700 rounded-lg font-bold">🔍-</button>
//                   <button type="button" onClick={handleResetZoom} className="px-2 py-1 hover:bg-slate-700 rounded-lg font-bold text-[10px]">{Math.round(zoomScale * 100)}%</button>
//                   <button type="button" onClick={handleZoomIn} className="px-2 py-1 hover:bg-slate-700 rounded-lg font-bold">🔍+</button>
//                 </div>
//               )}
//             </div>

//             <div className="pt-2 flex gap-3">
//               <button
//                 type="button"
//                 onClick={() => setModalType(null)}
//                 className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
//               >
//                 Batal
//               </button>

//               <button
//                 type="button"
//                 disabled={loading || (modalType === 'dp' ? order?.dp_verified : order?.final_verified)}
//                 onClick={() => handleVerify(modalType)}
//                 className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50 transition shadow-sm"
//               >
//                 {loading
//                   ? 'Memproses...'
//                   : (modalType === 'dp' ? order?.dp_verified : order?.final_verified)
//                   ? 'Sudah Diverifikasi'
//                   : 'Verifikasi Pembayaran'}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default function AdminDashboardPage() {
//   const [orders, setOrders] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   const [packageFilter, setPackageFilter] = useState<'all' | 'titip_beli' | 'titip_kirim'>('all');
//   const [verificationTab, setVerificationTab] = useState<'all' | 'pending' | 'completed'>('all');

//   useEffect(() => {
//     fetchOrders();
//   }, []);

//   async function fetchOrders() {
//     try {
//       setLoading(true);
//       const { data, error } = await supabase
//         .from('orders')
//         .select('*, order_items(*)')
//         .order('created_at', { ascending: false });

//       if (error) throw error;
//       setOrders(data || []);
//     } catch (err: any) {
//       console.error('Failed to fetch orders:', err.message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   // UBAH STATUS PESANAN OLEH ADMIN (TERIKAT WA OTOMATIS)
//   const handleStatusChange = async (order: any, newStatus: string) => {
//     try {
//       const { error } = await supabase
//         .from('orders')
//         .update({ order_status: newStatus })
//         .eq('id', order.id);

//       if (error) throw error;

//       // OTOMATIS KIRIM WA KONDISI 2, KONDISI 4, ATAU KONDISI 6
//       triggerWAOnStatusOrVerificationChange(order, newStatus, 'status_change').catch(console.error);

//       fetchOrders();
//     } catch (err: any) {
//       alert('Gagal memperbarui status: ' + err.message);
//     }
//   };

//   const formatRupiah = (val: number) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

//   const filteredOrders = useMemo(() => {
//     return orders.filter((ord) => {
//       if (packageFilter !== 'all' && ord.package_type !== packageFilter) return false;

//       const isFullyVerified = Boolean(
//         ord.final_verified || 
//         ord.order_status === 'barang_telah_diterima' || 
//         ord.order_status === 'berangkat_dari_jepang' || 
//         ord.order_status === 'tiba_di_indonesia' || 
//         ord.order_status === 'diantar_ke_alamat'
//       );

//       if (verificationTab === 'pending' && isFullyVerified) return false;
//       if (verificationTab === 'completed' && !isFullyVerified) return false;

//       return true;
//     });
//   }, [orders, packageFilter, verificationTab]);

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
//         <p className="text-sm font-bold text-slate-600">Memuat data pesanan admin...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
//       <div className="max-w-6xl mx-auto space-y-6">
        
//         <div className="flex justify-between items-center border-b pb-4">
//           <div>
//             <h1 className="text-2xl font-black text-slate-900">Dashboard Admin Pesanan</h1>
//             <p className="text-xs text-slate-500 font-medium">Kelola verifikasi pembayaran dan status pesanan</p>
//           </div>
//           <button
//             onClick={fetchOrders}
//             className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
//           >
//             🔄 Refresh Data
//           </button>
//         </div>

//         <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
//           <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
//             <button
//               onClick={() => setVerificationTab('all')}
//               className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
//                 verificationTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
//               }`}
//             >
//               Semua Pesanan ({orders.length})
//             </button>
//             <button
//               onClick={() => setVerificationTab('pending')}
//               className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
//                 verificationTab === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
//               }`}
//             >
//               ⏳ Perlu Verifikasi / Proses
//             </button>
//             <button
//               onClick={() => setVerificationTab('completed')}
//               className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
//                 verificationTab === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
//               }`}
//             >
//               ✓ Verifikasi Selesai
//             </button>
//           </div>

//           <div className="flex items-center gap-2">
//             <span className="text-xs font-bold text-slate-500">Tipe Paket:</span>
//             <select
//               value={packageFilter}
//               onChange={(e) => setPackageFilter(e.target.value as any)}
//               className="text-xs font-bold border border-slate-300 rounded-xl px-3 py-1.5 bg-white text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
//             >
//               <option value="all">Semua Tipe</option>
//               <option value="titip_beli">Titip Beli</option>
//               <option value="titip_kirim">Titip Kirim</option>
//             </select>
//           </div>
//         </div>

//         <div className="space-y-4">
//           {filteredOrders.map((ord) => {
//             const statusInfo = STATUS_LABELS[ord.order_status] || {
//               label: ord.order_status,
//               color: 'bg-slate-100 text-slate-800 border-slate-300'
//             };

//             return (
//               <div key={ord.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
//                 <div className="flex flex-wrap justify-between items-start gap-4 border-b pb-4">
//                   <div>
//                     <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
//                       {ord.package_type?.replace(/_/g, ' ')}
//                     </span>
//                     <h2 className="text-lg font-black text-slate-900 mt-1">#{ord.order_number}</h2>
//                     <p className="text-xs text-slate-500">
//                       Pemesan: <span className="font-bold text-slate-800">{ord.customer_name}</span> | WA: <span className="font-semibold text-slate-700">{ord.whatsapp_number}</span>
//                     </p>
//                   </div>

//                   <div className="flex items-center gap-2">
//                     <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${statusInfo.color}`}>
//                       {statusInfo.label}
//                     </span>
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl text-xs">
//                   <div>
//                     <p className="text-slate-400 font-medium">Tipe Paket</p>
//                     <p className="font-bold text-slate-800 uppercase">{ord.package_type?.replace(/_/g, ' ')}</p>
//                   </div>
//                   <div>
//                     <p className="text-slate-400 font-medium">
//                       {ord.package_type === 'titip_kirim' ? 'Total Berat' : 'Total Harga Barang'}
//                     </p>
//                     <p className="font-bold text-slate-800">
//                       {ord.package_type === 'titip_kirim' ? `${ord.total_weight || 0} kg` : formatRupiah(ord.total_items_price)}
//                     </p>
//                   </div>
//                   <div>
//                     <p className="text-slate-400 font-medium">Total Tagihan</p>
//                     <p className="font-bold text-slate-800">{formatRupiah(ord.total_price)}</p>
//                   </div>
//                   <div>
//                     <p className="text-slate-400 font-medium">Wajib DP (75%)</p>
//                     <p className="font-bold text-indigo-600">{formatRupiah(ord.dp_amount)}</p>
//                   </div>
//                 </div>

//                 <AdminOrderVerification order={ord} onRefresh={fetchOrders} />

//                 <div className="flex justify-end items-center gap-3 pt-1 border-t border-slate-100">
//                   <Link
//                     href={`/admin/orders/${ord.id}`}
//                     className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
//                   >
//                     ⚙️ Kelola Harga & Barang →
//                   </Link>
//                 </div>
//               </div>
//             );
//           })}

//           {filteredOrders.length === 0 && (
//             <div className="text-center p-12 bg-white rounded-3xl border text-slate-400 text-xs font-bold">
//               Tidak ada pesanan yang sesuai dengan filter.
//             </div>
//           )}
//         </div>

//       </div>
//     </div>
//   );
// }

'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// Pemetaan Label Status untuk Admin Dashboard
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pesanan_baru: { label: 'Pesanan Baru', color: 'bg-blue-50 text-blue-700 border-blue-300' },
  tersedia: { label: 'Tersedia', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  tidak_ada_stok: { label: 'Tidak Ada Stok', color: 'bg-rose-50 text-rose-700 border-rose-300' },
  menunggu_dp: { label: 'Menunggu DP', color: 'bg-amber-50 text-amber-700 border-amber-300' },
  menunggu_pelunasan: { label: 'Menunggu Pelunasan', color: 'bg-indigo-50 text-indigo-700 border-indigo-300' },
  berangkat_dari_jepang: { label: 'Berangkat Dari Jepang', color: 'bg-purple-50 text-purple-700 border-purple-300' },
  tiba_di_indonesia: { label: 'Tiba Di Indonesia', color: 'bg-teal-50 text-teal-700 border-teal-300' },
  diantar_ke_alamat: { label: 'Diantar Ke Alamat', color: 'bg-cyan-50 text-cyan-700 border-cyan-300' },
  barang_telah_diterima: { label: 'Barang Telah Diterima', color: 'bg-emerald-100 text-emerald-800 border-emerald-400' },
};

// HELPER KIRIM WA VIA API ROUTE (AMAN DARI BROWSER)
async function sendWANotification(order: any, nextStatus: string, actionType: string) {
  try {
    const res = await fetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'status_or_verification',
        order,
        newStatus: nextStatus,
        actionType,
      }),
    });
    if (!res.ok) {
      console.warn('Respon API WA tidak OK:', await res.json());
    }
  } catch (err) {
    console.error('Gagal memanggil API WhatsApp:', err);
  }
}

// Sub-komponen Verifikasi Pembayaran Admin (Dengan WA Otomatis)
function AdminOrderVerification({ order, onRefresh }: { order: any; onRefresh: () => void }) {
  const [modalType, setModalType] = useState<'dp' | 'final' | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  if (!order) return null;

  const handleOpenModal = (type: 'dp' | 'final') => {
    setZoomScale(1);
    setModalType(type);
  };

  const handleZoomIn = () => setZoomScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomScale(1);

  const handleVerify = async (type: 'dp' | 'final') => {
    try {
      setLoading(true);

      const updatePayload: any = {};
      let actionType: 'verify_dp' | 'verify_final' = 'verify_dp';
      let nextStatus = '';

      if (type === 'dp') {
        updatePayload.dp_verified = true;
        // Update status ke 'berangkat_dari_jepang' agar cocok dengan Kondisi 3
        updatePayload.order_status = 'berangkat_dari_jepang'; 
        actionType = 'verify_dp';
        nextStatus = 'berangkat_dari_jepang';
      } else {
        updatePayload.final_verified = true;
        updatePayload.order_status = 'diantar_ke_alamat';
        actionType = 'verify_final';
        nextStatus = 'diantar_ke_alamat';
      }

      const { error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', order.id);

      if (error) throw error;

      // OTOMATIS KIRIM WA KONDISI 3 (DP VERIFIED) ATAU KONDISI 5 (FINAL VERIFIED) VIA API ROUTE
      const updatedOrder = { ...order, ...updatePayload };
      await sendWANotification(updatedOrder, nextStatus, actionType);

      setModalType(null);
      onRefresh();
    } catch (err: any) {
      alert('Gagal memverifikasi: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const activeProofUrl = modalType === 'dp' ? order?.dp_payment_proof_url : order?.final_payment_proof_url;

  return (
    <div className="space-y-2 mt-3">
      <div className="flex flex-wrap gap-2">
        {order?.dp_payment_proof_url && (
          <button
            type="button"
            onClick={() => handleOpenModal('dp')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
              order?.dp_verified
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
            }`}
          >
            {order?.dp_verified ? '✓ Bukti DP Terverifikasi' : '🔍 Cek Bukti DP'}
          </button>
        )}

        {order?.final_payment_proof_url && (
          <button
            type="button"
            onClick={() => handleOpenModal('final')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
              order?.final_verified
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
            }`}
          >
            {order?.final_verified ? '✓ Bukti Pelunasan Terverifikasi' : '🔍 Cek Bukti Pelunasan'}
          </button>
        )}
      </div>

      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                Verifikasi Bukti {modalType === 'dp' ? 'DP' : 'Pelunasan'} (#{order?.order_number})
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="relative bg-slate-900 rounded-2xl overflow-hidden max-h-[360px] h-80 flex items-center justify-center border border-slate-700">
              {activeProofUrl ? (
                <div className="w-full h-full overflow-auto flex items-center justify-center p-2">
                  <img
                    src={activeProofUrl}
                    alt="Bukti Transfer"
                    style={{ transform: `scale(${zoomScale})` }}
                    className="object-contain max-h-full transition-transform duration-200 ease-out origin-center cursor-grab active:cursor-grabbing"
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-400 p-8">Bukti gambar tidak ditemukan.</p>
              )}

              {activeProofUrl && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 text-white text-xs">
                  <button type="button" onClick={handleZoomOut} className="px-2 py-1 hover:bg-slate-700 rounded-lg font-bold">🔍-</button>
                  <button type="button" onClick={handleResetZoom} className="px-2 py-1 hover:bg-slate-700 rounded-lg font-bold text-[10px]">{Math.round(zoomScale * 100)}%</button>
                  <button type="button" onClick={handleZoomIn} className="px-2 py-1 hover:bg-slate-700 rounded-lg font-bold">🔍+</button>
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={loading || (modalType === 'dp' ? order?.dp_verified : order?.final_verified)}
                onClick={() => handleVerify(modalType)}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50 transition shadow-sm"
              >
                {loading
                  ? 'Memproses...'
                  : (modalType === 'dp' ? order?.dp_verified : order?.final_verified)
                  ? 'Sudah Diverifikasi'
                  : 'Verifikasi Pembayaran'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [packageFilter, setPackageFilter] = useState<'all' | 'titip_beli' | 'titip_kirim'>('all');
  const [verificationTab, setVerificationTab] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      console.error('Failed to fetch orders:', err.message);
    } finally {
      setLoading(false);
    }
  }

  // UBAH STATUS PESANAN OLEH ADMIN
  const handleStatusChange = async (order: any, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: newStatus })
        .eq('id', order.id);

      if (error) throw error;

      // Panggil API route WhatsApp secara otomatis
      const updatedOrder = { ...order, order_status: newStatus };
      await sendWANotification(updatedOrder, newStatus, 'status_change');

      alert(`Status berhasil diperbarui ke "${STATUS_LABELS[newStatus]?.label || newStatus}" dan pesan WA pengingat pelunasan telah dikirim!`);

      fetchOrders();
    } catch (err: any) {
      alert('Gagal memperbarui status: ' + err.message);
    }
  };

  const formatRupiah = (val: number) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (packageFilter !== 'all' && ord.package_type !== packageFilter) return false;

      const isFullyVerified = Boolean(
        ord.final_verified || 
        ord.order_status === 'barang_telah_diterima' || 
        ord.order_status === 'berangkat_dari_jepang' || 
        ord.order_status === 'tiba_di_indonesia' || 
        ord.order_status === 'diantar_ke_alamat'
      );

      if (verificationTab === 'pending' && isFullyVerified) return false;
      if (verificationTab === 'completed' && !isFullyVerified) return false;

      return true;
    });
  }, [orders, packageFilter, verificationTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <p className="text-sm font-bold text-slate-600">Memuat data pesanan admin...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Dashboard Admin Pesanan</h1>
            <p className="text-xs text-slate-500 font-medium">Kelola verifikasi pembayaran dan status pesanan</p>
          </div>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            🔄 Refresh Data
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setVerificationTab('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                verificationTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua Pesanan ({orders.length})
            </button>
            <button
              onClick={() => setVerificationTab('pending')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                verificationTab === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ⏳ Perlu Verifikasi / Proses
            </button>
            <button
              onClick={() => setVerificationTab('completed')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                verificationTab === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ✓ Verifikasi Selesai
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Tipe Paket:</span>
            <select
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value as any)}
              className="text-xs font-bold border border-slate-300 rounded-xl px-3 py-1.5 bg-white text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Tipe</option>
              <option value="titip_beli">Titip Beli</option>
              <option value="titip_kirim">Titip Kirim</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredOrders.map((ord) => {
            const statusInfo = STATUS_LABELS[ord.order_status] || {
              label: ord.order_status,
              color: 'bg-slate-100 text-slate-800 border-slate-300'
            };

            return (
              <div key={ord.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap justify-between items-start gap-4 border-b pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {ord.package_type?.replace(/_/g, ' ')}
                    </span>
                    <h2 className="text-lg font-black text-slate-900 mt-1">#{ord.order_number}</h2>
                    <p className="text-xs text-slate-500">
                      Pemesan: <span className="font-bold text-slate-800">{ord.customer_name}</span> | WA: <span className="font-semibold text-slate-700">{ord.whatsapp_number}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Dropdown Pengubahan Status Cepat oleh Admin */}
                    <select
                      value={ord.order_status}
                      onChange={(e) => handleStatusChange(ord, e.target.value)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border cursor-pointer ${statusInfo.color}`}
                    >
                      {Object.entries(STATUS_LABELS).map(([key, item]) => (
                        <option key={key} value={key}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl text-xs">
                  <div>
                    <p className="text-slate-400 font-medium">Tipe Paket</p>
                    <p className="font-bold text-slate-800 uppercase">{ord.package_type?.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">
                      {ord.package_type === 'titip_kirim' ? 'Total Berat' : 'Total Harga Barang'}
                    </p>
                    <p className="font-bold text-slate-800">
                      {ord.package_type === 'titip_kirim' ? `${ord.total_weight_kg || ord.total_weight || 0} kg` : formatRupiah(ord.total_items_price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Total Tagihan</p>
                    <p className="font-bold text-slate-800">{formatRupiah(ord.total_price)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Wajib DP (75%)</p>
                    <p className="font-bold text-indigo-600">{formatRupiah(ord.dp_amount)}</p>
                  </div>
                </div>

                <AdminOrderVerification order={ord} onRefresh={fetchOrders} />

                <div className="flex justify-end items-center gap-3 pt-1 border-t border-slate-100">
                  <Link
                    href={`/admin/orders/${ord.id}`}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                  >
                    ⚙️ Kelola Harga & Barang →
                  </Link>
                </div>
              </div>
            );
          })}

          {filteredOrders.length === 0 && (
            <div className="text-center p-12 bg-white rounded-3xl border text-slate-400 text-xs font-bold">
              Tidak ada pesanan yang sesuai dengan filter.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}