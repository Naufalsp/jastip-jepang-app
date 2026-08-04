// app/api/admin/finalize-order/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// FUNGSI PEMBULATAN KE ATAS KE RIBUAN TERDEKAT
// Contoh: Rp 12.100 -> Rp 13.000, Rp 5.500.200 -> Rp 5.501.000
const roundUpToThousand = (val: number) => Math.ceil(val / 1000) * 1000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, totalWeightKg, items } = body; 

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID wajib diisi' }, { status: 400 });
    }

    // 1. Ambil data order awal dari DB untuk cek tipe pesanan & data customer
    const { data: orderData, error: fetchOrderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchOrderError || !orderData) {
      return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
    }

    const packageType = (orderData.package_type || 'TITIP_BELI').toString().toUpperCase();

    // Validasi items wajib hanya untuk Titip Beli
    if (packageType.includes('BELI') && (!items || items.length === 0)) {
      return NextResponse.json({ error: 'Daftar barang wajib diisi untuk Titip Beli' }, { status: 400 });
    }

    // 2. Ambil Live Kurs JPY
    let exchangeRateUsed = 113.3; 
    try {
      const rateRes = await fetch('https://open.er-api.com/v6/latest/JPY');
      const rateData = await rateRes.json();
      const baseJpyToIdr = rateData?.rates?.IDR || 110;
      exchangeRateUsed = baseJpyToIdr * 1.03; // Rate + Margin 3%
    } catch (e) {
      console.warn("Gagal fetch kurs live, memakai rate fallback:", e);
    }

    let totalItemsPriceIdr = 0;
    let totalJastipFeeIdr = 0;
    let transportFeeIdr = 0; // <-- [DITAMBAHKAN] Variabel Biaya Transport
    let shippingFeeIdr = 0;

    // 3. LOGIKA TITIP BELI
    if (packageType.includes('BELI')) {
      if (items && items.length > 0) {
        for (const item of items) {
          const priceOriginal = Number(item.price_original) || 0;
          const qty = Number(item.quantity) || 1;

          // Hitung harga Rupiah & bulatkan ke atas
          const priceInIdr = roundUpToThousand(priceOriginal * exchangeRateUsed);

          // Hitung Fee Jastip Tiering per item
          let rawJastipFeeIdr = 0;
          if (priceInIdr > 0) {
            if (priceInIdr <= 100000) rawJastipFeeIdr = priceInIdr * 0.30;
            else if (priceInIdr <= 500000) rawJastipFeeIdr = priceInIdr * 0.20;
            else if (priceInIdr <= 1000000) rawJastipFeeIdr = priceInIdr * 0.10;
            else rawJastipFeeIdr = priceInIdr * 0.07;
          }

          const jastipFeeIdr = roundUpToThousand(rawJastipFeeIdr);

          // Update item di database
          await supabase
            .from('order_items')
            .update({
              price_original: priceOriginal,
              price_in_idr: priceInIdr,
              jastip_fee_idr: jastipFeeIdr,
              admin_status: 'available'
            })
            .eq('id', item.id);

          // Akumulasi Total
          totalItemsPriceIdr += priceInIdr * qty;
          totalJastipFeeIdr += jastipFeeIdr * qty;
        }

        // <-- [DITAMBAHKAN] Hitung Biaya Transport Flat 300 Yen
        const TRANSPORT_JPY = 300;
        transportFeeIdr = roundUpToThousand(TRANSPORT_JPY * exchangeRateUsed);
      }
      shippingFeeIdr = 0; // Titip Beli tidak ada ongkir bagasi
    } 
    // 4. LOGIKA TITIP KIRIM
    else {
      const weight = Number(totalWeightKg || orderData.total_weight_kg || 1);
      const TARIF_PER_KG = 150000; // Rp 150.000 / Kg
      shippingFeeIdr = roundUpToThousand(weight * TARIF_PER_KG);

      totalItemsPriceIdr = 0;
      totalJastipFeeIdr = 0;
      transportFeeIdr = 0;
    }

    // 5. Total Pelunasan (Full Payment 100%)
    // <-- [DIPERBARUI] Masukkan transportFeeIdr ke subtotal
    const subtotalItemsIdr = totalItemsPriceIdr + totalJastipFeeIdr + transportFeeIdr;
    const totalPriceIdr = roundUpToThousand(subtotalItemsIdr + shippingFeeIdr);

    // 6. Update tabel orders
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({
        total_weight_kg: packageType.includes('KIRIM') ? Number(totalWeightKg || 1) : 0,
        exchange_rate_used: exchangeRateUsed,
        items_price_idr: totalItemsPriceIdr,
        jastip_fee_idr: totalJastipFeeIdr,
        transport_fee_idr: transportFeeIdr, // <-- [DITAMBAHKAN] Simpan nilai transport ke DB
        subtotal_items_idr: subtotalItemsIdr,
        shipping_fee_idr: shippingFeeIdr,
        total_price_idr: totalPriceIdr,
        order_status: 'tersedia' // Set status ketersediaan ke 'tersedia'
      })
      .eq('id', orderId);

    if (updateOrderError) throw updateOrderError;

    // 7. Kirim Notifikasi WhatsApp Otomatis ke Customer
    if (orderData.whatsapp_number) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jastipamihsorih.netlify.app';
      const trackingUrl = `${baseUrl}/order/${orderData.order_number}`;
      const totalFormatted = totalPriceIdr.toLocaleString('id-ID');

      const waMessage = `Halo Kak ${orderData.customer_name}! 🔔

Pesanan kamu *${orderData.order_number}* telah dikonfirmasi *TERSEDIA* dan selesai dihitung oleh Admin!

Total Pelunasan yang perlu dibayarkan: *Rp ${totalFormatted}*

Silakan buka tautan berikut untuk melihat rincian lengkap & melakukan upload bukti pembayaran:
${trackingUrl}

Terima kasih! 💳`;

      try {
        await sendWhatsAppNotification(orderData.whatsapp_number, waMessage);
      } catch (waErr) {
        console.error("Gagal mengirim notifikasi WA finalize:", waErr);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Kalkulasi sukses & WA terkirim!', 
      totalPriceIdr 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Proses gagal' }, { status: 500 });
  }
}