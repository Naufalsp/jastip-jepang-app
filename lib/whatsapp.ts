// // lib/whatsapp.ts
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';

  let cleaned = phone.replace(/\D/g, '');

  // 1. Jika sudah berawalan Kode Negara (62 atau 81)
  if (cleaned.startsWith('81') || cleaned.startsWith('62')) {
    return cleaned;
  }

  // 2. Jika format lokal Jepang (contoh: 08012345678, 09012345678, 07012345678)
  if (
    cleaned.startsWith('080') || 
    cleaned.startsWith('090') || 
    cleaned.startsWith('070')
  ) {
    return '81' + cleaned.slice(1);
  }

  // 3. Jika format lokal Indonesia
  if (cleaned.startsWith('0')) {
    return '62' + cleaned.slice(1);
  }

  return cleaned;
}

export async function sendWhatsAppNotification(target: string, message: string) {
  const formattedTarget = formatPhoneNumber(target);
  const token = process.env.FONNTE_TOKEN;

  if (!token) {
    console.error('[WA ERROR] FONNTE_TOKEN tidak ditemukan!');
    return { status: false, reason: 'Missing FONNTE_TOKEN' };
  }

  try {
    const formData = new FormData();
    // Gunakan tanda '+' atau tentukan country code agar Fonnte tidak memaksa menambahkan 62
    formData.append('target', formattedTarget);
    
    // TENTUKAN COUNTRY DEFAULT AGAR FONNTE TIDAK OTOMATIS BIKIN '62' UNTUK NOMOR DEPAN 81
    if (formattedTarget.startsWith('81')) {
      formData.append('country', '81');
    } else {
      formData.append('country', '62');
    }

    formData.append('message', message);

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
      },
      body: formData,
      cache: 'no-store',
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[WA EXCEPTION]', error);
    return null;
  }
}

// -------------------------------------------------------------
// HELPER TEMPLATE PESAN WA SESUAI KONDISI
// -------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://domain-kamu.com';

const formatRupiah = (val: number) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

// KONDISI 1: Saat Pesanan Baru Dibuat
export async function triggerWAOnOrderCreated(order: any) {
  if (!order?.whatsapp_number) return;

  const orderLink = `${BASE_URL}/order/${order.order_number}`;
  const packageTypeLabel = order.package_type === 'titip_kirim' ? 'Titip Kirim' : 'Titip Beli';
  
  const message = `Halo Kak ${order.customer_name}! 👋

Pesanan Jastip kamu dengan nomor *${order.order_number}* berhasil dibuat!

📋 *Detail Pesanan:*
- Tipe Layanan: ${packageTypeLabel}
- Status Ketersediaan: *Pesanan Baru*

Admin kami sedang mengecek ketersediaan & menghitung total biaya pesanan kamu. Kamu dapat mengecek status pesanan kapan saja melalui tautan berikut:
${orderLink}

Terima kasih! 🇯🇵`;

  return await sendWhatsAppNotification(order.whatsapp_number, message);
}

// KONDISI 2 - 6: Perubahan Status / Verifikasi Pembayaran
export async function triggerWAOnStatusOrVerificationChange(
  order: any, 
  newStatus?: string, 
  actionType?: 'verify_dp' | 'verify_final' | 'status_change'
) {
  if (!order?.whatsapp_number) {
    console.warn('Nomor WhatsApp tidak ditemukan pada objek order:', order);
    return;
  }

  const orderLink = `${BASE_URL}/order/${order.order_number}`;
  const customerName = order.customer_name || 'Customer';
  const orderNumber = order.order_number;
  const totalPriceFormatted = formatRupiah(order.total_price);
  const dpAmountFormatted = formatRupiah(order.dp_amount || Math.round((order.total_price || 0) * 0.75));

  let message = '';

  // KONDISI 2: Admin mengonfirmasi ketersediaan & harga
  if (
    actionType === 'status_change' && 
    (newStatus === 'menunggu_dp' || newStatus === 'tersedia' || newStatus === 'PRICED')
  ) {
    message = `Halo Kak ${customerName}! 🔔\n\nPesanan kamu *${orderNumber}* telah dikonfirmasi dan selesai dihitung oleh Admin!\n\nTotal Pelunasan yang perlu dibayarkan: *${totalPriceFormatted}*\nDP 75% Wajib: *${dpAmountFormatted}*\n\nSilakan lakukan pembayaran DP 75% terlebih dahulu atau langsung pelunasan. Silakan buka tautan berikut untuk melihat rincian lengkap & melakukan upload bukti pembayaran:\n${orderLink}\n\nTerima kasih! 💳`;
  }

  // KONDISI 3: Pembayaran DP diverifikasi ATAU barang disiapkan berangkat dari Jepang
  else if (
    actionType === 'verify_dp' || 
    newStatus === 'berangkat_dari_jepang' || 
    newStatus === 'dp_verified' ||
    newStatus === 'disiapkan'
  ) {
    message = `Halo Kak ${customerName}! 🔔\n\nPembayaran DP untuk pesanan kamu *${orderNumber}* telah diverifikasi!\n\nSaat ini barang kamu sedang disiapkan untuk dikirim ke Indonesia. Silakan buka tautan berikut untuk memantau status pesanan kamu:\n${orderLink}\n\nTerima kasih! 📦`;
  }

  // KONDISI 4: Barang Tiba di Indonesia (Notifikasi + Pengingat Pelunasan jika belum lunas)
  else if (
    (actionType === 'status_change' && newStatus === 'tiba_di_indonesia') || 
    newStatus === 'arrived_indonesia'
  ) {
    const isLunas = Boolean(order.final_verified);

    if (isLunas) {
      // Jika customer sudah melunasi sebelumnya
      message = `Halo Kak ${customerName}! 🔔\n\nPemberitahuan: Pesanan kamu *${orderNumber}* telah tiba di Indonesia!\n\nKeterangan Pembayaran: *LUNAS* ✅\nBarang kamu sedang disiapkan untuk dikirim ke alamat tujuan. Cek detail pesanan kamu melalui tautan berikut:\n${orderLink}\n\nTerima kasih! 🇮🇩✈️`;
    } else {
      // Jika customer belum melunasi (DP saja atau belum bayar sisa)
      const sisaPelunasan = formatRupiah((order.total_price || 0) - (order.dp_amount || 0));
      message = `Halo Kak ${customerName}! 🔔\n\nPesanan kamu *${orderNumber}* telah tiba di Indonesia!\n\n⚠️ *Pengingat Pelunasan:*\nSisa pelunasan yang perlu dibayarkan adalah *${sisaPelunasan}*.\n\nMohon segera lakukan pelunasan dan upload bukti pembayaran melalui tautan berikut agar pesanan bisa langsung dikirim ke alamat tujuan kamu:\n${orderLink}\n\nTerima kasih! 🇮🇩✈️`;
    }
  }

  // KONDISI 5: Pembayaran dinyatakan LUNAS (Diverifikasi oleh Admin)
  else if (actionType === 'verify_final' || newStatus === 'lunas' || newStatus === 'paid') {
    message = `Halo Kak ${customerName}! 🔔\n\nPembayaran untuk pesanan kamu *${orderNumber}* telah dinyatakan LUNAS!\n\nPesanan kamu akan segera diproses ke tahap pengiriman lokal ke alamat tujuan. Silakan cek rincian pesanan kamu di sini:\n${orderLink}\n\nTerima kasih! 💳`;
  }

  // KONDISI 6: Barang dikirim ke alamat customer (Diantar ke Alamat)
  else if (
    (actionType === 'status_change' && newStatus === 'diantar_ke_alamat') || 
    newStatus === 'shipped' || 
    newStatus === 'dikirim'
  ) {
    const noResi = order.courier_receipt_number ? `\n\nNo. Resi Pengiriman: *${order.courier_receipt_number}*` : '';
    
    message = `Halo Kak ${customerName}! 🔔\n\nPesanan kamu *${orderNumber}* sedang dalam perjalanan/diantar ke alamat tujuan!🚚${noResi}\n\nKamu dapat melacak posisi paket dan melihat rincian pengiriman melalui tautan berikut:\n${orderLink}\n\nTerima kasih telah berbelanja! 📦✨`;
  }

  // Debugging log jika pesan kosong
  if (!message) {
    console.warn(`[WA WARNING] Tidak ada template pesan yang cocok untuk actionType: "${actionType}" dan newStatus: "${newStatus}"`);
    return;
  }

  return await sendWhatsAppNotification(order.whatsapp_number, message);
}