import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      packageType, 
      customerName, 
      whatsappNumber, 
      address, 
      totalWeightKg, 
      items 
    } = body;

    if (!customerName || !whatsappNumber || !address || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Nama pemesan, WhatsApp, alamat, dan daftar barang wajib diisi' }, 
        { status: 400 }
      );
    }

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
          address: address,
          package_type: packageType || 'titip_beli',
          total_weight_kg: Number(totalWeightKg) || 0,
          order_status: 'pesanan_baru',
          dp_payment_status: 'unpaid',
          final_payment_status: 'unpaid'
        }
      ])
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Simpan Rincian Barang ke Supabase
    const orderItemsPayload = items.map((item: any) => ({
      order_id: newOrder.id,
      item_name: item.item_name || 'Barang Titipan',
      item_url: item.item_url || null,
      image_url: item.image_url || null,
      quantity: Number(item.quantity) || 1,
      availability_status: 'pending'
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsPayload);

    if (itemsError) throw itemsError;

    // 3. Kirim WhatsApp Konfirmasi
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jastipamihsorih.netlify.app';
    const trackingUrl = `${baseUrl}/order/${orderNumber}`;
    const serviceText = packageType === 'titip_kirim' ? 'Titip Kirim (Bagasi)' : 'Titip Beli';

    const waMessage = `Halo Kak ${customerName}! 👋

Pesanan Jastip kamu dengan nomor *${orderNumber}* berhasil dibuat!

📋 *Detail Pesanan:*
- Tipe Layanan: ${serviceText}
- Status Ketersediaan: *Dalam Pengecekan Admin*

Admin kami sedang mengecek ketersediaan & menghitung total biaya pesanan kamu. 
Kamu dapat mengecek status pesanan kapan saja melalui tautan berikut:
${trackingUrl}

Terima kasih! 🇯🇵`;

    await sendWhatsAppNotification(whatsappNumber, waMessage);

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