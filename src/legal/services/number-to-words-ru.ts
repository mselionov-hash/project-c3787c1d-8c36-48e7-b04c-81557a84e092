/**
 * Russian number-to-words formatter for legal documents.
 * Converts numeric amounts to Russian text with rubles and kopecks.
 * Example: 150000.50 → "Сто пятьдесят тысяч рублей 50 копеек"
 */

const ONES_MASCULINE = [
  '', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
  'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
  'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать',
];

const ONES_FEMININE = [
  '', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
  'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
  'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать',
];

const TENS = [
  '', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто',
];

const HUNDREDS = [
  '', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот',
];

interface ScaleWord {
  one: string;
  few: string;
  many: string;
  feminine: boolean;
}

const SCALES: ScaleWord[] = [
  { one: '', few: '', many: '', feminine: false }, // units
  { one: 'тысяча', few: 'тысячи', many: 'тысяч', feminine: true },
  { one: 'миллион', few: 'миллиона', many: 'миллионов', feminine: false },
  { one: 'миллиард', few: 'миллиарда', many: 'миллиардов', feminine: false },
];

function pluralize(n: number, scale: ScaleWord): string {
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod100 >= 11 && mod100 <= 19) return scale.many;
  if (mod10 === 1) return scale.one;
  if (mod10 >= 2 && mod10 <= 4) return scale.few;
  return scale.many;
}

function convertGroup(n: number, feminine: boolean): string {
  if (n === 0) return '';

  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const remainder = n % 100;

  if (h > 0) parts.push(HUNDREDS[h]);

  if (remainder >= 20) {
    const t = Math.floor(remainder / 10);
    const o = remainder % 10;
    parts.push(TENS[t]);
    if (o > 0) parts.push(feminine ? ONES_FEMININE[o] : ONES_MASCULINE[o]);
  } else if (remainder > 0) {
    parts.push(feminine ? ONES_FEMININE[remainder] : ONES_MASCULINE[remainder]);
  }

  return parts.join(' ');
}

function integerToWords(n: number): string {
  if (n === 0) return 'ноль';

  const groups: number[] = [];
  let remaining = n;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (group === 0) continue;
    const scale = SCALES[i] || SCALES[0];
    const words = convertGroup(group, scale.feminine);
    const scaleWord = i > 0 ? pluralize(group, scale) : '';
    parts.push(words + (scaleWord ? ' ' + scaleWord : ''));
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function rubleWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'рублей';
  if (mod10 === 1) return 'рубль';
  if (mod10 >= 2 && mod10 <= 4) return 'рубля';
  return 'рублей';
}

function kopeckWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'копеек';
  if (mod10 === 1) return 'копейка';
  if (mod10 >= 2 && mod10 <= 4) return 'копейки';
  return 'копеек';
}

/**
 * Convert a numeric amount to Russian words with currency.
 * @param amount — numeric value (e.g. 150000.50)
 * @returns Russian text like "Сто пятьдесят тысяч рублей 50 копеек"
 */
export function amountToWordsRu(amount: number): string {
  const absAmount = Math.abs(amount);
  const intPart = Math.floor(absAmount);
  const kopecks = Math.round((absAmount - intPart) * 100);

  const intWords = integerToWords(intPart);
  // Capitalize first letter
  const capitalized = intWords.charAt(0).toUpperCase() + intWords.slice(1);

  let result = `${capitalized} ${rubleWord(intPart)}`;

  if (kopecks > 0) {
    result += ` ${String(kopecks).padStart(2, '0')} ${kopeckWord(kopecks)}`;
  }

  return result;
}
