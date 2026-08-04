// lib/whatsapp.ts

export async function sendWhatsAppNotification(targetPhone: string, message: string) {
  try {
    const token = process.env.FONNTE_TOKEN;

    if (!token) {
      console.error("❌ ERROR WA: FONNTE_TOKEN belum diisi di .env.local!");
      return;
    }

    // 1. Bersihkan semua karakter selain angka (menghapus +, -, spasi, dll)
    let formattedPhone = targetPhone.replace(/[^0-9]/g, '');

    // 2. Ubah format lokal Indonesia (08...) menjadi 628...
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    } 

    console.log(`🚀 Mengirim WA ke nomor: ${formattedPhone}`);

    // 3. Panggil API Fonnte dengan parameter countryCode = '0'
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: formattedPhone,
        message: message,
        countryCode: '0', // <-- KUNCI PERBAIKAN: '0' artinya serahkan format nomor sepenuhnya ke kita (mencegah auto-add 62)
      }),
    });

    const result = await response.json();
    console.log('📱 WA Respon Fonnte:', result);
    return result;

  } catch (error) {
    console.error('❌ Gagal mengirim WA Notifikasi:', error);
  }
}