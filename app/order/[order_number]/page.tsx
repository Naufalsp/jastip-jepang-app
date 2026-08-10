'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Pemetaan Status ke Label Tampilan
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

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // State Form Upload Bukti Bayar
  const [paymentType, setPaymentType] = useState<'dp' | 'lunas'>('dp');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [params]);

  async function fetchOrder() {
    const orderNum = params?.order_number as string;
    if (!orderNum) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('order_number', orderNum)
        .single();

      if (error) {
        setErrorMsg(error.message);
      } else {
        setOrder(data);
        // Otomatis set mode pembayaran ke 'lunas' jika DP sudah pernah diunggah
        if (data.dp_payment_proof_url || data.order_status === 'menunggu_pelunasan') {
          setPaymentType('lunas');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadError('');
    }
  };

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Pilih file bukti pembayaran terlebih dahulu!');
      return;
    }

    try {
      setUploading(true);
      setUploadError('');
      setUploadSuccess('');

      // Upload ke Bucket 'payment-receipts' di folder 'receipt'
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${order.order_number}_${paymentType}_${Date.now()}.${fileExt}`;
      const filePath = `receipt/${fileName}`;

      const { error: storageError } = await supabase.storage
        .from('payment-receipts')
        .upload(filePath, selectedFile, { upsert: true });

      if (storageError) throw storageError;

      const { data: publicUrlData } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(filePath);

      const filePublicUrl = publicUrlData.publicUrl;

      // Cek apakah DP sudah pernah terisi sebelumnya
      const hasDpBefore = !!order.dp_payment_proof_url;
      const isDp = paymentType === 'dp' && !hasDpBefore;

      const newOrderStatus = isDp ? 'menunggu_pelunasan' : 'berangkat_dari_jepang';

      const updateData: any = {
        order_status: newOrderStatus,
        payment_type: paymentType,
        payment_status: isDp ? 'dp_paid' : 'fully_paid',
      };

      if (isDp) {
        updateData.dp_payment_proof_url = filePublicUrl;
      } else {
        updateData.final_payment_proof_url = filePublicUrl;
        updateData.payment_proof_url = filePublicUrl;
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id);

      if (updateError) throw updateError;

      setUploadSuccess(
        isDp
          ? 'Bukti pembayaran DP berhasil diunggah! Status: Menunggu Pelunasan.'
          : 'Bukti pelunasan berhasil diunggah! Status: Berangkat Dari Jepang.'
      );
      setSelectedFile(null);
      fetchOrder();
    } catch (err: any) {
      setUploadError(err.message || 'Gagal mengunggah bukti pembayaran.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl border shadow-sm text-center">
          <p className="text-sm font-bold text-slate-600">Memuat detail pesanan...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl border shadow-sm text-center max-w-md w-full">
          <p className="text-sm font-bold text-rose-600 mb-2">Pesanan Tidak Ditemukan</p>
          <p className="text-xs text-slate-500">{errorMsg || 'Order number tidak terdaftar.'}</p>
        </div>
      </div>
    );
  }

  // Perhitungan Harga
  const totalItemPrice = Number(order.total_items_price || 0);
  const totalJastipFee = Number(order.total_jastip_fee || 0);
  const totalPelunasan = Number(order.total_price || 0);
  const totalDpAmount = Number(order.dp_amount || 0);

  // LOGIKA HITUNG SISA PEMBAYARAN
  const isDpPaid = !!order.dp_payment_proof_url;
  const isFullyPaid = !!order.final_payment_proof_url;
  const sisaPelunasan = isDpPaid ? Math.max(0, totalPelunasan - totalDpAmount) : totalPelunasan;

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  const currentStatusInfo = STATUS_LABELS[order.order_status] || {
    label: order.order_status,
    color: 'bg-slate-100 text-slate-800 border-slate-300'
  };

  const waMessage = encodeURIComponent(
    `Halo Admin, saya ingin mengonfirmasi pesanan #${order.order_number}\n\n` +
    `Nama: ${order.customer_name}\n` +
    `Total Tagihan: ${formatRupiah(totalPelunasan)}\n` +
    `Mohon infonya. Terima kasih!`
  );

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 font-sans flex justify-center items-start">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-900 shadow-sm p-6 sm:p-8 space-y-6">
        
        {/* Header Order */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
              {order.package_type?.replace(/_/g, ' ')}
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-2">#{order.order_number}</h1>
            <p className="text-xs text-slate-500 font-medium">Pemesan: <span className="font-bold text-slate-800">{order.customer_name}</span></p>
          </div>
          <div className="text-right">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${currentStatusInfo.color}`}>
              {currentStatusInfo.label}
            </span>
          </div>
        </div>

        {/* STATUS VERIFIKASI PEMBAYARAN DI SISI CUSTOMER */}
        {(order.dp_payment_proof_url || order.final_payment_proof_url) && (
          <div className="pt-2 border-t border-indigo-100 space-y-2 text-xs">
            <p className="font-bold text-slate-700">Status Verifikasi Pembayaran:</p>
            <div className="space-y-1.5">
              {order.dp_payment_proof_url && (
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-700">Bukti DP</span>
                  <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                    order.dp_verified 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {order.dp_verified ? '✓ Terverifikasi Admin' : '⏳ Menunggu Verifikasi Admin'}
                  </span>
                </div>
              )}

              {order.final_payment_proof_url && (
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-700">Bukti Pelunasan</span>
                  <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                    order.final_verified 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {order.final_verified ? '✓ Terverifikasi Admin' : '⏳ Menunggu Verifikasi Admin'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info Alamat & Kontak */}
        <div className="text-xs space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">Tujuan Pengiriman</p>
          <p className="font-semibold text-slate-800">WA: {order.whatsapp_number}</p>
          <p className="text-slate-600 leading-relaxed">{order.address}</p>
        </div>

        {/* Daftar Barang */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Daftar Barang Pesanan</h2>
          <div className="space-y-3">
            {order.order_items?.map((item: any, idx: number) => (
              <div key={item.id || idx} className="p-3.5 border border-slate-200 rounded-2xl flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.item_name} className="w-14 h-14 object-cover rounded-xl border border-slate-200" />
                  ) : (
                    <div className="w-14 h-14 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center text-xl">📦</div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{item.item_name}</h3>
                    <p className="text-xs text-slate-500">
                      Qty: <span className="font-bold text-slate-700">{item.quantity}</span>
                      {item.item_price_jpy ? <span className="ml-2 font-semibold text-slate-600">(¥{item.item_price_jpy})</span> : null}
                    </p>
                    {item.item_url && (
                      <a href={item.item_url} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-600 font-bold hover:underline">
                        🔗 Link Produk
                      </a>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    item.availability_status === 'available' ? 'bg-emerald-100 text-emerald-800' : 
                    item.availability_status === 'out_of_stock' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.availability_status === 'available' ? 'Tersedia' : item.availability_status === 'out_of_stock' ? 'Kosong' : 'Proses Cek'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DETIL RINCIAN HARGA */}
        <div className="p-5 border border-slate-900 rounded-2xl bg-white space-y-3 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rincian Perhitungan</p>
          
          {order.package_type === 'titip_kirim' ? (
            /* Tampilan Khusus Titip Kirim */
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Total Berat Barang:</span>
              <span className="font-bold text-slate-900">
                {order.total_weight_kg ? `${order.total_weight_kg} kg` : '0 kg'}
              </span>
            </div>
          ) : (
            /* Tampilan Standard Titip Beli */
            <>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Harga Barang:</span>
                <span className="font-bold text-slate-900">{formatRupiah(totalItemPrice)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Fee Jastip:</span>
                <span className="font-bold text-slate-900">{formatRupiah(totalJastipFee)}</span>
              </div>
            </>
          )}

          <div className="border-t border-slate-300 pt-3 flex justify-between items-center">
            <span className="text-sm font-extrabold text-slate-900">TOTAL PELUNASAN:</span>
            <span className="text-lg font-black text-indigo-600">{formatRupiah(totalPelunasan)}</span>
          </div>

          <div className="bg-indigo-50 p-3.5 rounded-xl flex justify-between items-center text-xs border border-indigo-100 mt-2">
            <div>
              <p className="font-bold text-indigo-900">DP 75% Wajib Dibayar:</p>
              <p className="text-[10px] text-indigo-600 font-medium">Bayar DP untuk proses pembelian</p>
            </div>
            <span className="font-black text-indigo-700 text-base">{formatRupiah(totalDpAmount)}</span>
          </div>
        </div>

        {/* FORM UPLOAD BUKTI PEMBAYARAN */}
        <div className="p-5 border border-indigo-200 bg-indigo-50/40 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            💳 Konfirmasi Pembayaran
          </h2>

          {!isFullyPaid ? (
            <form onSubmit={handleUploadProof} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Pilih Skema Pembayaran:</label>
                <div className={`grid ${isDpPaid ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                  
                  {/* TOMBOL BAYAR DP - SEMBUNYI JIKA SUDAN BAYAR DP */}
                  {!isDpPaid && (
                    <button
                      type="button"
                      onClick={() => setPaymentType('dp')}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition ${
                        paymentType === 'dp'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div>Bayar DP (75%)</div>
                      <div className={`text-[10px] font-normal mt-0.5 ${paymentType === 'dp' ? 'text-indigo-100' : 'text-slate-500'}`}>
                        {formatRupiah(totalDpAmount)}
                      </div>
                    </button>
                  )}

                  {/* TOMBOL BAYAR LUNAS - MENAMPILKAN SELISIH HARGA JIKA DP SUDAH TERBAYAR */}
                  <button
                    type="button"
                    onClick={() => setPaymentType('lunas')}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition ${
                      paymentType === 'lunas'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>{isDpPaid ? 'Bayar Pelunasan' : 'Bayar Lunas Langsung'}</div>
                    <div className={`text-[10px] font-normal mt-0.5 ${paymentType === 'lunas' ? 'text-emerald-100' : 'text-slate-500'}`}>
                      {formatRupiah(sisaPelunasan)}
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Upload Struk / Bukti Transfer ({paymentType === 'dp' ? 'DP' : 'Pelunasan'}):
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer border border-slate-300 rounded-xl bg-white p-1"
                />
              </div>

              {uploadError && <p className="text-xs text-rose-600 font-bold">{uploadError}</p>}
              {uploadSuccess && <p className="text-xs text-emerald-600 font-bold">{uploadSuccess}</p>}

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs transition shadow-sm disabled:opacity-50"
              >
                {uploading ? 'Mengunggah Bukti...' : `Kirim Bukti ${paymentType === 'dp' ? 'DP' : 'Pelunasan'}`}
              </button>
            </form>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <p className="text-xs font-extrabold text-emerald-800">🎉 Pembayaran Pesanan Telah Lunas!</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">Terima kasih, pesanan kamu sedang diproses untuk pengiriman.</p>
            </div>
          )}

          {/* Menampilkan Daftar Bukti Transfer yang Terkirim */}
          {(order.dp_payment_proof_url || order.final_payment_proof_url) && (
            <div className="pt-2 border-t border-indigo-100 space-y-2 text-xs">
              <p className="font-bold text-slate-700">Bukti Transfer Terkirim:</p>
              <div className="flex flex-wrap gap-2">
                {order.dp_payment_proof_url && (
                  <a
                    href={order.dp_payment_proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline bg-white px-3 py-1.5 rounded-lg border border-indigo-200"
                  >
                    📄 Bukti DP
                  </a>
                )}
                {order.final_payment_proof_url && (
                  <a
                    href={order.final_payment_proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-600 font-bold hover:underline bg-white px-3 py-1.5 rounded-lg border border-emerald-200"
                  >
                    📄 Bukti Pelunasan
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}