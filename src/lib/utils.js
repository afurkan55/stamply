// Strips spaces, dashes, and dots so "0555 123 4567" and "05551234567" match
export function normalizePhone(phone) {
  return phone.trim().replace(/[\s\-().]/g, '')
}
