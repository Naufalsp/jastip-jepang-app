import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { orderId, paymentStage } = await request.json(); // paymentStage: 'DP' | 'FINAL'

    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (!order) return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });

    let updatePayload: any = {};
    let waMessage = '';

    if (paymentStage === 'DP') {
      updatePayload = {
        dp_payment_status: 'verified',
        order_status: 'dp_terverifikasi'
      };
      waMessage = `Halo Kak ${order.customer_name}! Pembayaran **DP 75%** (Rp ${order.dp_amount_idr?.toLocaleString('id-ID')}) untuk pesanan ${order.order_number} telah **VERIFIKASI SUCCESS**! Barang akan segera diproses.`;
    } else if (paymentStage === 'FINAL') {
      updatePayload = {
        final_payment_status: 'verified',
        order_status: 'lunas'
      };
      waMessage = `Halo Kak ${order.customer_name}! Pembayaran **Pelunasan** pesanan ${order.order_number} telah **VERIFIKASI SUCCESS**. Pesanan kamu kini **LUNAS** 🎉!`;
    }

    await supabase.from('orders').update(updatePayload).eq('id', orderId);

    if (order.whatsapp_number) {
      await sendWhatsAppNotification(order.whatsapp_number, waMessage);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}