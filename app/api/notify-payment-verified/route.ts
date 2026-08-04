// app/api/notify-payment-verified/route.ts
import { NextResponse } from 'next/server';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderNumber, customerName, whatsappNumber, totalPriceIdr } = body;

    if (whatsappNumber) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jastipamihsorih.netlify.app';
      const trackingUrl = `${baseUrl}/order/${orderNumber}`;
      const totalFormatted = Number(totalPriceIdr || 0).toLocaleString('id-ID');

      const waMessage = `Halo Kak ${customerName}! 🎉

Pembayaran untuk pesanan *${orderNumber}* sebesar *Rp ${totalFormatted}* telah *DIVERIFIKASI & LUNAS*! ✅

Pesanan kamu sekarang sedang disiapkan oleh tim kami di Jepang. 

Kamu dapat mengecek perkembangan status pengiriman kapan saja melalui tautan berikut:
${trackingUrl}

Terima kasih telah berbelanja menggunakan layanan kami! 🇯🇵📦`;

      await sendWhatsAppNotification(whatsappNumber, waMessage);
    }

    return NextResponse.json({ success: true, message: 'Notifikasi WA pembayaran berhasil diverifikasi terkirim' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal mengirim WA' }, { status: 500 });
  }
}