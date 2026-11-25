export function formatWhatsappDigits(raw: string): string {
  return (raw || '').replace(/\D/g, '');
}

export function buildWhatsappUrl(phone: string, message: string): string {
  const digits = formatWhatsappDigits(phone);
  const encoded = encodeURIComponent(message);
  if (!digits) {
    return `https://wa.me/?text=${encoded}`;
  }
  return `https://wa.me/${digits}?text=${encoded}`;
}
