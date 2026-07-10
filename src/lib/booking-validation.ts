// Shared booking-form validation rules. Imported by both client and server.
import { parsePhoneNumberFromString, isValidPhoneNumber, type CountryCode } from "libphonenumber-js";

export const FAKE_STOP_LIST = new Set([
  "test", "testas", "tests", "asd", "asdf", "asdfg", "qwerty", "qwe", "qweqwe",
  "aaa", "aaaa", "xxx", "xxxx", "abc", "abcd", "nope", "none", "null", "n/a",
  "bandymas", "noname", "no name", "fake", "lol", "lal", "dunno", "anonymous",
  "anonim", "anonimas", "user", "vartotojas", "klientas", "client",
]);

const LETTER_RE = /[\p{L}]/u;
const NAME_RE = /^[\p{L}][\p{L}\s'\-]*$/u;
const CITY_RE = /^[\p{L}][\p{L}\s'\-\.]*$/u;

function distinctLetters(s: string): number {
  return new Set(s.toLowerCase().replace(/[^\p{L}]/gu, "").split("")).size;
}

function distinctDigits(s: string): number {
  return new Set(s.replace(/\D/g, "").split("")).size;
}

export function validateName(raw: string, label = "Laukas"): string | null {
  const v = (raw ?? "").trim();
  if (v.length < 3) return `${label} – min. 3 simboliai`;
  if (v.length > 100) return `${label} per ilgas`;
  if (!NAME_RE.test(v)) return `${label} gali turėti tik raides, brūkšnelį ir apostrofą`;
  if (distinctLetters(v) < 2) return `${label} atrodo netikras`;
  if (FAKE_STOP_LIST.has(v.toLowerCase())) return `${label} atrodo netikras`;
  return null;
}

export function validateCity(raw: string): string | null {
  const v = (raw ?? "").trim();
  if (v.length < 2) return "Miestas – min. 2 simboliai";
  if (v.length > 100) return "Miestas per ilgas";
  if (!CITY_RE.test(v)) return "Miestas gali turėti tik raides, brūkšnelį ir tarpus";
  if (FAKE_STOP_LIST.has(v.toLowerCase())) return "Miestas atrodo netikras";
  return null;
}

export function validateAddress(raw: string): string | null {
  const v = (raw ?? "").trim();
  if (v.length < 5) return "Adresas – min. 5 simboliai";
  if (v.length > 255) return "Adresas per ilgas";
  if (!LETTER_RE.test(v)) return "Adresas turi turėti bent vieną raidę";
  if (!/\d/.test(v)) return "Adresas turi turėti namo numerį";
  if (FAKE_STOP_LIST.has(v.toLowerCase())) return "Adresas atrodo netikras";
  return null;
}

const FAKE_PHONE_PATTERNS: RegExp[] = [
  /^(\d)\1+$/,                 // 000000000, 111111111
  /^0?123456789\d*$/,
  /^0?987654321\d*$/,
  /^1234567\d*$/,
  /^7654321\d*$/,
];

export function validatePhone(raw: string, country: CountryCode = "LT"): string | null {
  const v = (raw ?? "").trim();
  if (!v) return "Telefonas privalomas";
  if (!isValidPhoneNumber(v, country)) return "Neteisingas telefono numerio formatas";
  const parsed = parsePhoneNumberFromString(v, country);
  if (!parsed || !parsed.isValid()) return "Neteisingas telefono numeris";
  const national = parsed.nationalNumber.toString();
  if (national.length < 7) return "Telefono numeris per trumpas";
  if (distinctDigits(national) < 3) return "Telefono numeris atrodo netikras";
  if (/(\d)\1{5,}/.test(national)) return "Telefono numeris atrodo netikras";
  for (const re of FAKE_PHONE_PATTERNS) {
    if (re.test(national)) return "Telefono numeris atrodo netikras";
  }
  return null;
}

export function normalizePhoneE164(raw: string, country: CountryCode = "LT"): string | null {
  const parsed = parsePhoneNumberFromString((raw ?? "").trim(), country);
  return parsed?.isValid() ? parsed.number : null;
}

export function emailDomain(email: string): string | null {
  const m = (email ?? "").trim().toLowerCase().match(/^[^\s@]+@([^\s@]+\.[^\s@]+)$/);
  return m ? m[1] : null;
}
