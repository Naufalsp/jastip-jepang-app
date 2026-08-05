import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateOrderPricing } from '@/lib/pricing';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, totalWeightKg, items } = body;
    // items: Array<{ id: string; item_name: string; price_idr: number; quantity: number; availability_status: 'available'|'out_of_stock' }>

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID wajib diisi' }, { status: 400 });
    }

    const { data: orderData, error: fetchOrderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchOrderError || !orderData) {
      return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
    }

    const packageType = (orderData.package_type || 'TITIP_BELI_TOKO').toUpperCase();
    let hasOutOfStock = false;

    if (packageType.includes('BELI')) {
      for (const item of items) {
        if (item.availability_status === 'out_of_stock') {
          hasOutOfStock = true;
        }

        // Admin merapikan nama barang & memasukkan harga Rupiah
        await supabase
          .from('order_items')
          .update({
            item_name: item.item_name,
            price_idr: Number(item.price_idr) || 0,
            availability_status: item.availability_status || 'available'
          })
          .eq('id', item.id);
      }
    }

    // Hanya hitung harga barang yang 'available'
    const availableItems = (items || []).filter((i: any) => i.availability_status === 'available');
    const pricing = calculateOrderPricing(
      packageType,
      availableItems.map((i: any) => ({ priceIdr: i.price_idr, quantity: i.quantity })),
      totalWeightKg
    );

    const newOrderStatus = hasOutOfStock ? 'perlu_revisi_stok' : 'harga_ditetapkan';

    await supabase
      .from('orders')
      .update({
        total_weight_kg: packageType.includes('KIRIM') ? Number(totalWeightKg || 1) : 0,
        items_price_idr: pricing.totalItemsPriceIdr,
        jastip_fee_idr: pricing.totalJastipFeeIdr,
        total_price_idr: pricing.totalPriceIdr,
        dp_amount_idr: pricing.dp75AmountIdr,
        order_status: newOrderStatus
      })
      .eq('id', orderId);

    // Kirim Notifikasi WhatsApp
    if (orderData.whatsapp_number) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jastipamihsorih.netlify.app';
      const trackingUrl = `${baseUrl}/order/${orderData.order_number}`;

      let waMessage = '';
      if (hasOutOfStock) {
        waMessage = `Halo Kak ${orderData.customer_name}! ⚠️\n\nSebagian/seluruh barang pesanan kamu (${orderData.order_number}) *TIDAK ADA STOK*.\n\nSilakan klik tautan berikut untuk mengganti produk/mengajukan revisi:\n${trackingUrl}`;
      } else {
        waMessage = `Halo Kak ${orderData.customer_name}! 🔔\n\nPesanan kamu *${orderData.order_number}* sudah selesai dihitung Admin.\n\nTotal: *Rp ${pricing.totalPriceIdr.toLocaleString('id-ID')}*\nDP 75% Wajib: *Rp ${pricing.dp75AmountIdr.toLocaleString('id-ID')}*\n\nBuka link untuk instruksi pembayaran DP:\n${trackingUrl}`;
      }

      await sendWhatsAppNotification(orderData.whatsapp_number, waMessage);
    }

    return NextResponse.json({ success: true, hasOutOfStock, pricing });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal merapikan harga & stok' }, { status: 500 });
  }
}