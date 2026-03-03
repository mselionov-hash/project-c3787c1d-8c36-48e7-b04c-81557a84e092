/**
 * EMVCo QR Code generator for Russian SBP (NSPK) payments.
 * Follows the EMV QR Code Specification for Payment Systems (Merchant-Presented Mode).
 */

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

interface SbpQrParams {
  phone: string;
  amount: number;
  recipientName: string;
  city: string;
  comment: string;
}

/**
 * Generates an EMVCo-compliant QR payload string for SBP payments.
 *
 * Field IDs:
 * 00 - Payload Format Indicator
 * 01 - Point of Initiation Method (12 = dynamic)
 * 26 - Merchant Account Information (SBP)
 *   00 - Globally Unique Identifier (sbp.nspk.ru)
 *   01 - Phone number
 * 52 - Merchant Category Code
 * 53 - Transaction Currency (643 = RUB)
 * 54 - Transaction Amount
 * 58 - Country Code
 * 59 - Merchant Name (recipient)
 * 60 - Merchant City
 * 62 - Additional Data
 *   05 - Reference Label (comment)
 * 63 - CRC
 */
export function generateSbpEmvQr({
  phone,
  amount,
  recipientName,
  city,
  comment,
}: SbpQrParams): string {
  // Clean phone: keep digits only, ensure starts with country code
  const cleanPhone = phone.replace(/\D/g, '').replace(/^8/, '7');
  const phoneFormatted = cleanPhone.startsWith('7') ? `+${cleanPhone}` : `+7${cleanPhone}`;

  // Merchant Account Info (ID 26): SBP domain + phone
  const mai =
    tlv('00', 'sbp.nspk.ru') +
    tlv('01', phoneFormatted);

  // Additional Data Field Template (ID 62): comment as Reference Label (05)
  const additionalData = tlv('05', comment);

  // Truncate name/city to fit (EMVCo max 25 chars for 59/60)
  const name = recipientName.slice(0, 25);
  const cityTrunc = city.slice(0, 15);

  // Build payload without CRC
  let payload = '';
  payload += tlv('00', '01');           // Payload Format Indicator
  payload += tlv('01', '12');           // Point of Initiation: Dynamic QR
  payload += tlv('26', mai);            // Merchant Account Info (SBP)
  payload += tlv('52', '0000');         // MCC: Not applicable
  payload += tlv('53', '643');          // Currency: RUB
  payload += tlv('54', amount.toFixed(2)); // Amount
  payload += tlv('58', 'RU');           // Country
  payload += tlv('59', name);           // Recipient name
  payload += tlv('60', cityTrunc);      // City
  payload += tlv('62', additionalData); // Additional data

  // CRC placeholder then compute
  payload += '6304';
  const checksum = crc16(payload);
  return payload.slice(0, -4) + `6304${checksum}`;
}
