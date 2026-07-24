/**
 * Thai number-to-words for currency ("บาทถ้วน" text) — the legally expected
 * spelled-out amount on a Thai accounting document.
 *
 * The three rules that make Thai numerals non-obvious, all handled below:
 *   - เอ็ด : a trailing 1 after a tens place becomes เอ็ด, not หนึ่ง
 *           (11 -> สิบเอ็ด, 21 -> ยี่สิบเอ็ด, 101 -> หนึ่งร้อยเอ็ด)
 *   - ยี่   : a tens digit of 2 is ยี่สิบ, never สองสิบ
 *   - สิบ  : a tens digit of 1 is สิบ, never หนึ่งสิบ
 * Values >= 1,000,000 are grouped by ล้าน and the millions part recurses, which
 * is how Thai stacks arbitrarily large numbers (e.g. 1,000,000,000 reads as
 * "หนึ่งพันล้าน" — a thousand millions — not with a distinct billion word).
 */

const DIGITS = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const PLACES = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

/**
 * Spell an integer 0 < n < 1,000,000 (one ล้าน group).
 * `isMillionGroup` is unused here by design — the เอ็ด rule applies identically
 * inside every group, because each group is read as its own number.
 */
function spellGroup(n) {
  let out = '';
  const s = String(n);
  const len = s.length;

  for (let i = 0; i < len; i++) {
    const digit = Number(s[i]);
    const place = len - i - 1; // 0 = units, 1 = tens, ...
    if (digit === 0) continue;

    if (place === 0) {
      // Trailing 1 is เอ็ด whenever there is anything in front of it.
      // (11 -> สิบเอ็ด, 101 -> หนึ่งร้อยเอ็ด, but a bare 1 -> หนึ่ง)
      out += digit === 1 && len > 1 ? 'เอ็ด' : DIGITS[digit];
    } else if (place === 1) {
      // Tens: 1 -> สิบ (not หนึ่งสิบ), 2 -> ยี่สิบ (not สองสิบ).
      if (digit === 1) out += 'สิบ';
      else if (digit === 2) out += 'ยี่สิบ';
      else out += DIGITS[digit] + 'สิบ';
    } else {
      out += DIGITS[digit] + PLACES[place];
    }
  }

  return out;
}

/** Spell a non-negative integer, recursing on the ล้าน (million) grouping. */
function spellInteger(n) {
  if (n === 0) return 'ศูนย์';
  if (n < 1000000) return spellGroup(n);

  const millions = Math.floor(n / 1000000);
  const remainder = n % 1000000;
  // Recurse: the millions part is itself a full number followed by ล้าน.
  return spellInteger(millions) + 'ล้าน' + (remainder ? spellGroup(remainder) : '');
}

/**
 * Render an amount in baht as Thai words.
 *
 * @param {number} amount  Baht, may carry satang (2 decimals).
 * @returns {string} e.g. 4500 -> "สี่พันห้าร้อยบาทถ้วน"
 *                        4205.61 -> "สี่พันสองร้อยห้าบาทหกสิบเอ็ดสตางค์"
 */
export function bahtText(amount) {
  const value = Number(amount) || 0;
  const negative = value < 0;

  // Work in whole satang so 4205.61 can never arrive here as 4205.609999...
  const totalSatang = Math.round(Math.abs(value) * 100 + Number.EPSILON);
  const baht = Math.floor(totalSatang / 100);
  const satang = totalSatang % 100;

  let text;
  if (satang === 0) {
    text = `${spellInteger(baht)}บาทถ้วน`;
  } else {
    // A zero-baht amount still reads "ศูนย์บาท" before the satang part.
    text = `${spellInteger(baht)}บาท${spellGroup(satang)}สตางค์`;
  }

  return negative ? `ลบ${text}` : text;
}
