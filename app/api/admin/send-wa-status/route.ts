// app/api/admin/send-wa-status/route.ts
import { NextResponse } from 'next/server';
import { sendWhatsAppNotification } from '@/lib/whatsapp'; // Sesuaikan helper WA kamu

export async function POST(request: Request) {
  try {
    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json({ error: 'Phone dan message wajib diisi' }, { status: 400 });
    }

    // Bersihkan nomor HP agar siap kirim (ubah +628... atau 08... menjadi 628...)
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    } 

    // Kirim pesan WA
    await sendWhatsAppNotification(formattedPhone, message);

    return NextResponse.json({ success: true, message: 'WhatsApp berhasil dikirim' });
  } catch (error: any) {
    console.error('Error send-wa-status:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengirim WA' }, { status: 500 });
  }
}