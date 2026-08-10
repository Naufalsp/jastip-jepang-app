import { NextResponse } from 'next/server';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderNumber, customerName, whatsappNumber, totalPrice, dpAmount } = body;

    if (!whatsappNumber) {
      return NextResponse.json({ error: 'Nomor WhatsApp tidak ditemukan' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://https://jastipamihsorih.netlify.app';
    const orderLink = `${baseUrl}/order/${orderNumber}`;
    const formatRupiah = (val: number) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

    // Pesan Kondisi 2: Konfirmasi ketersediaan & harga oleh Admin
    const message = `Halo Kak ${customerName}! 🔔

Pesanan kamu *${orderNumber}* telah dikonfirmasi dan selesai dihitung oleh Admin!

Total Pelunasan yang perlu dibayarkan: *${formatRupiah(totalPrice)}*
DP 75% Wajib: *${formatRupiah(dpAmount)}*

Silakan lakukan pembayaran DP 75% terlebih dahulu atau langsung pelunasan. Silakan buka tautan berikut untuk melihat rincian lengkap & melakukan upload bukti pembayaran:
${orderLink}

Terima kasih! 💳`;

    const fonnteRes = await sendWhatsAppNotification(whatsappNumber, message);

    console.log('--- DEBUG FONNTE RESPONSE ---', fonnteRes);

    if (!fonnteRes || fonnteRes.status === false) {
      return NextResponse.json(
        { error: 'Gagal mengirim pesan via Fonnte', detail: fonnteRes },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, result: fonnteRes });
  } catch (error: any) {
    console.error('Error di Send WA Status API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}