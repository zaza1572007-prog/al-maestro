/**
 * Generates direct wa.me WhatsApp links pre-filled with formatted Arabic text
 * for instant 1-click manual communication from assistant devices.
 */

export interface WhatsAppDirectLinkOptions {
  phone: string;
  studentName: string;
  parentName?: string;
  type: 'ATTENDANCE' | 'EXAM_RESULT' | 'PAYMENT_REMINDER' | 'CUSTOM';
  details?: {
    status?: string;
    examTitle?: string;
    score?: number;
    maxScore?: number;
    percentage?: number;
    rank?: number;
    amount?: number;
    customText?: string;
  };
}

export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/[^\d]/g, '').trim();
  if (clean.startsWith('01') && clean.length === 11) {
    clean = '2' + clean;
  } else if (clean.startsWith('002')) {
    clean = clean.slice(2);
  }
  return clean;
}

export function generateDirectWhatsAppLink(options: WhatsAppDirectLinkOptions): string {
  const cleanPhone = formatPhoneForWhatsApp(options.phone);
  if (!cleanPhone) return '#';

  const parentGreeting = options.parentName ? `أهلاً بك أ./أولياء أمر ${options.studentName} 🌸` : `أهلاً ${options.studentName} 🌸`;
  let messageText = '';

  switch (options.type) {
    case 'ATTENDANCE':
      messageText = `${parentGreeting}\nنود إحاطتكم علماً بتسجيل حالة الطالب (${options.studentName}): ${options.details?.status || 'حاضر ✅'}\nتاريخ الجلسة: ${new Date().toLocaleDateString('ar-EG')}\nمنصة المايسترو التعليمية 🏫`;
      break;

    case 'EXAM_RESULT':
      messageText = `${parentGreeting}\nتم رصد نتيجة اختبار الطالب (${options.studentName}) في [${options.details?.examTitle || 'الامتحان'}]:\nالدرجة: ${options.details?.score} من ${options.details?.maxScore} (${options.details?.percentage}%)\n${options.details?.rank ? `الترتيب: المركز ${options.details.rank} 🏆\n` : ''}منصة المايسترو التعليمية 🏫`;
      break;

    case 'PAYMENT_REMINDER':
      messageText = `${parentGreeting}\nتذكير بموعد سداد الاشتراك الشهري للطالب (${options.studentName})\nالمبلغ المستحق: ${options.details?.amount || 350} ج.م\nشاكرين تعاونكم معنا 💙`;
      break;

    case 'CUSTOM':
      messageText = `${parentGreeting}\n${options.details?.customText || ''}\nمنصة المايسترو التعليمية 🏫`;
      break;
  }

  const encodedText = encodeURIComponent(messageText);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
