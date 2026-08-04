// app/api/notify-payment-uploaded/route.ts
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

      const waMessage = `Halo Kak ${customerName}! 📩

Bukti pembayaran untuk pesanan *${orderNumber}* sebesar *Rp ${totalFormatted}* telah kami terima!

Status saat ini: *Menunggu Verifikasi Admin*.

Kamu dapat memantau update verifikasi pesanan melalui link berikut:
${trackingUrl}

Terima kasih atas konfirmasinya! 🙏`;

      await sendWhatsAppNotification(whatsappNumber, waMessage);
    }

    return NextResponse.json({ success: true, message: 'Notifikasi WA terkirim' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal mengirim WA' }, { status: 500 });
  }
}