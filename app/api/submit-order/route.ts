// app/api/submit-order/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Destructuring dipastikan hanya 1 kali saja
    const { 
      orderType, 
      customerName, 
      whatsappNumber, 
      shippingAddress, 
      estimatedWeightKg, 
      items 
    } = body;

    if (!customerName || !whatsappNumber || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Nama pemesan, WhatsApp, dan daftar barang wajib diisi' }, 
        { status: 400 }
      );
    }

    // Generasi Nomor Order Unik
    const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderNumber = `JSTP-2026-${randomCode}`;

    // 1. Simpan Header Pesanan ke Supabase
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          order_number: orderNumber,
          customer_name: customerName,
          whatsapp_number: whatsappNumber,
          shipping_address: shippingAddress || null,
          package_type: orderType,
          total_weight_kg: Number(estimatedWeightKg) || 0,
          order_status: 'dalam_pengecekan',
          payment_status: 'unpaid'
        }
      ])
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Simpan Rincian Barang ke Supabase
    const orderItemsPayload = items.map((item: any) => ({
      order_id: newOrder.id,
      item_name: item.item_name || item.name || 'Barang Titipan',
      quantity: Number(item.quantity) || 1
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsPayload);

    if (itemsError) throw itemsError;

    // 3. Kirim WhatsApp Konfirmasi ke Customer
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jastipamihsorih.netlify.app';
    const trackingUrl = `${baseUrl}/order/${orderNumber}`;

    const waMessage = `Halo Kak ${customerName}! 👋

Pesanan Jastip kamu dengan nomor *${orderNumber}* berhasil dibuat!

📋 *Detail Pesanan:*
- Tipe Layanan: ${orderType === 'TITIP_KIRIM' ? 'Titip Kirim (Bagasi)' : 'Titip Beli'}
- Status Ketersediaan: *Dalam Pengecekan Admin*

Admin kami sedang mengecek ketersediaan & menghitung total biaya pesanan kamu. 
Kamu dapat mengecek status pesanan kapan saja melalui tautan berikut:
${trackingUrl}

Terima kasih! 🇯🇵`;

    try {
      await sendWhatsAppNotification(whatsappNumber, waMessage);
    } catch (waErr) {
      console.error("Gagal mengirim WA pembentukan pesanan:", waErr);
    }

    return NextResponse.json({
      success: true,
      orderNumber,
      orderId: newOrder.id
    });

  } catch (error: any) {
    console.error("Submit order error:", error);
    return NextResponse.json({ error: error.message || 'Gagal membuat order' }, { status: 500 });
  }
} 