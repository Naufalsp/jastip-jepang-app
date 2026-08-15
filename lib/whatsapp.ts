// lib/whatsapp.ts
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';

  let cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('81') || cleaned.startsWith('62')) {
    return cleaned;
  }

  if (
    cleaned.startsWith('080') || 
    cleaned.startsWith('090') || 
    cleaned.startsWith('070')
  ) {
    return '81' + cleaned.slice(1);
  }

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
    formData.append('target', formattedTarget);
    
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

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://jastipamihsorih.netlify.app';

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

// KONDISI 2 - 7: Perubahan Status / Verifikasi Pembayaran
export async function triggerWAOnStatusOrVerificationChange(
  order: any, 
  newStatus?: string, 
  actionType?: 'verify_dp' | 'verify_final' | 'status_change',
  orderItems: any[] = [] // Menerima array item pesanan
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

  // -------------------------------------------------------------
  // KONDISI 2: ADMIN KELOLA HARGA & CEK KETERSEDIAAN PER ITEM
  // -------------------------------------------------------------
  if (
    actionType === 'status_change' && 
    (
      newStatus === 'menunggu_dp' || 
      newStatus === 'tidak_ada_stok' || 
      newStatus === 'PRICED' ||
      newStatus === 'tersedia'
    )
  ) {
    // Ambil items dari parameter orderItems, items, atau order.order_items
    const rawItems = (orderItems && orderItems.length > 0) 
      ? orderItems 
      : (order?.items || order?.order_items || []);

    // Helper pengecekan item kosong
    const isItemKosong = (item: any) => {
      const status = String(
        item.availability_status || item.status || item.item_status || ''
      ).toLowerCase().trim();

      // 1. Jika eksplisit dipilih 'out_of_stock', 'kosong', atau 'tidak_ada_stok'
      if (status === 'out_of_stock' || status === 'kosong' || status === 'tidak_ada_stok') {
        return true;
      }

      // 2. Jika eksplisit dipilih 'available' atau 'tersedia'
      if (status === 'available' || status === 'tersedia') {
        return false;
      }

      // 3. Jika status masih 'pending', default-kan ke false agar tidak salah mendeteksi sebagai kosong
      return false;
    };

    const unavailableItems = rawItems.filter((item: any) => isItemKosong(item));
    const availableItems = rawItems.filter((item: any) => !isItemKosong(item));

    // Helper untuk formatting nama item di pesan WA
    const formatItemName = (it: any) => {
      const name = it.item_name || it.name || it.product_name || 'Barang';
      const qty = it.quantity || it.qty || 1;
      return `- ${name} (Qty: ${qty})`;
    };

    // SKENARIO 2A: SEMUA BARANG KOSONG
    if (
      (availableItems.length === 0 && unavailableItems.length > 0) || 
      newStatus === 'tidak_ada_stok' || 
      (Number(order.total_price) === 0 && availableItems.length === 0)
    ) {
      const emptyList = unavailableItems.length > 0 
        ? unavailableItems.map(formatItemName).join('\n')
        : '- Semua produk dalam pesanan ini';

      message = `Halo Kak ${customerName}! ❌\n\nMohon maaf, pesanan kamu *${orderNumber}* saat ini *TIDAK TERSEDIA / STOK KOSONG*\n\n${emptyList}\n\nPesanan ini tidak dapat diproses. Jika kamu ingin mengganti dengan produk lain, silakan buat pesanan baru melalui tautan berikut:\nhttps://jastipamihsorih.netlify.app/order/new\n\nTerima kasih atas pengertiannya! 🙏🇯🇵`;
    } 
    
    // SKENARIO 2B: SEBAGIAN BARANG KOSONG (1+ Ada & 1+ Kosong)
    else if (availableItems.length > 0 && unavailableItems.length > 0) {
      const availList = availableItems.map(formatItemName).join('\n');
      const unavailList = unavailableItems.map(formatItemName).join('\n');

      message = `Halo Kak ${customerName}! 🔔\n\nHasil pengecekan stok oleh Admin untuk pesanan *${orderNumber}*:\n\n✅ *Barang Tersedia:* \n${availList}\n\n❌ *Barang Kosong:* \n${unavailList}\n\nRincian pembayaran untuk barang yang *Tersedia* saja:\n- Total Pelunasan: *${totalPriceFormatted}*\n- DP 75% Wajib: *${dpAmountFormatted}*\n\nSilakan lakukan pembayaran DP 75% terlebih dahulu atau langsung pelunasan melalui tautan berikut:\n${orderLink}\n\nTerima kasih! 💳`;
    } 
    
    // SKENARIO 2C: SEMUA BARANG TERSEDIA
    else {
      message = `Halo Kak ${customerName}! 🔔\n\nPesanan kamu *${orderNumber}* telah dikonfirmasi dan *SEMUA BARANG TERSEDIA*!\n\nTotal Pelunasan: *${totalPriceFormatted}*\nDP 75% Wajib: *${dpAmountFormatted}*\n\nSilakan lakukan pembayaran DP 75% terlebih dahulu atau langsung pelunasan melalui tautan berikut:\n${orderLink}\n\nTerima kasih! 💳`;
    }
  }

  // KONDISI 3: Pembayaran DP diverifikasi
  else if (
    actionType === 'verify_dp' || 
    (newStatus === 'berangkat_dari_jepang' && !order.final_verified) || 
    newStatus === 'dp_verified' ||
    newStatus === 'disiapkan'
  ) {
    message = `Halo Kak ${customerName}! 🔔\n\nPembayaran DP untuk pesanan kamu *${orderNumber}* telah diverifikasi!\n\nSaat ini barang kamu sedang disiapkan untuk dikirim ke Indonesia. Silakan buka tautan berikut untuk memantau status pesanan kamu:\n${orderLink}\n\nTerima kasih! 📦`;
  }

  // KONDISI 3B: Pembayaran LUNAS Diverifikasi saat barang masih di Jepang
  else if (
    actionType === 'verify_final' && 
    (newStatus === 'berangkat_dari_jepang' || order.order_status !== 'berangkat_dari_jepang')
  ) {
    message = `Halo Kak ${customerName}! 🔔\n\nPembayaran LUNAS untuk pesanan kamu *${orderNumber}* telah diverifikasi!\n\nSaat ini barang kamu sedang disiapkan untuk dikirim ke Indonesia. Silakan buka tautan berikut untuk memantau status pesanan kamu:\n${orderLink}\n\nTerima kasih! 📦`;
  }

  // KONDISI 4: Barang Tiba di Indonesia
  else if (
    (actionType === 'status_change' && newStatus === 'tiba_di_indonesia') || 
    newStatus === 'arrived_indonesia'
  ) {
    const isLunas = Boolean(order.final_verified);

    if (isLunas) {
      message = `Halo Kak ${customerName}! 🔔\n\nPemberitahuan: Pesanan kamu *${orderNumber}* telah tiba di Indonesia!\n\nKeterangan Pembayaran: *LUNAS* ✅\nBarang kamu sedang disiapkan untuk dikirim ke alamat tujuan. Cek detail pesanan kamu melalui tautan berikut:\n${orderLink}\n\nTerima kasih! 🇮🇩✈️`;
    } else {
      const sisaPelunasan = formatRupiah((order.total_price || 0) - (order.dp_amount || 0));
      message = `Halo Kak ${customerName}! 🔔\n\nPesanan kamu *${orderNumber}* telah tiba di Indonesia!\n\n⚠️ *Pengingat Pelunasan:*\nSisa pelunasan yang perlu dibayarkan adalah *${sisaPelunasan}*.\n\nMohon segera lakukan pelunasan dan upload bukti pembayaran melalui tautan berikut agar pesanan bisa langsung dikirim ke alamat tujuan kamu:\n${orderLink}\n\nTerima kasih! 🇮🇩✈️`;
    }
  }

  // KONDISI 5: Pembayaran LUNAS Diverifikasi saat Barang SUDAH di Indonesia
  else if (
    actionType === 'verify_final' || 
    newStatus === 'lunas' || 
    newStatus === 'paid'
  ) {
    message = `Halo Kak ${customerName}! 🔔\n\nPembayaran LUNAS untuk pesanan kamu *${orderNumber}* telah diverifikasi!\n\nPesanan kamu akan segera diproses ke tahap pengiriman lokal ke alamat tujuan. Silakan cek rincian pesanan kamu di sini:\n${orderLink}\n\nTerima kasih! 💳`;
  }

  // KONDISI 6: Barang dikirim ke alamat customer
  else if (
    (actionType === 'status_change' && newStatus === 'diantar_ke_alamat') || 
    newStatus === 'shipped' || 
    newStatus === 'dikirim'
  ) {
    const noResi = order.courier_receipt_number ? `\n\nNo. Resi Pengiriman: *${order.courier_receipt_number}*` : '';
    
    message = `Halo Kak ${customerName}! 🔔\n\nPesanan kamu *${orderNumber}* sedang dalam perjalanan/diantar ke alamat tujuan!🚚${noResi}\n\nKamu dapat melacak posisi paket dan melihat rincian pengiriman melalui tautan berikut:\n${orderLink}\n\nTerima kasih telah berbelanja! 📦✨`;
  }

  if (!message) {
    console.warn(`[WA WARNING] Tidak ada template pesan yang cocok untuk actionType: "${actionType}" dan newStatus: "${newStatus}"`);
    return;
  }

  return await sendWhatsAppNotification(order.whatsapp_number, message);
}