import { createSign, createVerify, timingSafeEqual } from "crypto";

/**
 * Swedbank Banklink (iPizza) protocol helpers.
 *
 * Reference: https://www.swedbank.lt/business/d2d/payments/banklink/technical
 *
 * Signing scheme: RSA-SHA1 (VK_ALGORITHM=SHA-1) or RSA-SHA256 (VK_ALGORITHM=SHA-256).
 * MAC input is the concatenation of length-prefixed values of the fields listed
 * for each VK_SERVICE, encoded as UTF-8.
 */

const enc = new TextEncoder();

/** Length-prefixed field encoding: 3-digit zero-padded byte length + value. */
function lenPrefix(value: string): Uint8Array {
  const bytes = enc.encode(value);
  const prefix = enc.encode(String(bytes.length).padStart(3, "0"));
  const out = new Uint8Array(prefix.length + bytes.length);
  out.set(prefix, 0);
  out.set(bytes, prefix.length);
  return out;
}

function concatBytes(parts: Uint8Array[]): Buffer {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = Buffer.alloc(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** Fields (in order) used to compose VK_MAC for outgoing payment request (1012). */
const MAC_FIELDS_1012 = [
  "VK_SERVICE",
  "VK_VERSION",
  "VK_SND_ID",
  "VK_STAMP",
  "VK_AMOUNT",
  "VK_CURR",
  "VK_ACC",
  "VK_NAME",
  "VK_REF",
  "VK_MSG",
  "VK_RETURN",
  "VK_CANCEL",
  "VK_DATETIME",
];

/** Fields used to verify VK_MAC in Swedbank success response (1101). */
const MAC_FIELDS_1101 = [
  "VK_SERVICE",
  "VK_VERSION",
  "VK_SND_ID",
  "VK_REC_ID",
  "VK_STAMP",
  "VK_T_NO",
  "VK_AMOUNT",
  "VK_CURR",
  "VK_REC_ACC",
  "VK_REC_NAME",
  "VK_SND_ACC",
  "VK_SND_NAME",
  "VK_REF",
  "VK_MSG",
  "VK_T_DATETIME",
];

/** Fields used to verify VK_MAC in Swedbank failure response (1901). */
const MAC_FIELDS_1901 = [
  "VK_SERVICE",
  "VK_VERSION",
  "VK_SND_ID",
  "VK_REC_ID",
  "VK_STAMP",
  "VK_REF",
  "VK_MSG",
];

function algoFor(vkAlgorithm: string | undefined): "RSA-SHA1" | "RSA-SHA256" {
  const a = (vkAlgorithm || "SHA-1").toUpperCase();
  return a === "SHA-256" ? "RSA-SHA256" : "RSA-SHA1";
}

function normalizePem(pem: string): string {
  let s = pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem;
  s = s.replace(/\r\n?/g, "\n").trim();
  // Strip surrounding quotes if secret was pasted quoted.
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  const m = s.match(/-----BEGIN ([A-Z0-9 ]+?)-----([\s\S]*?)-----END \1-----/);
  if (m) {
    const label = m[1].trim();
    const body = m[2].replace(/\s+/g, "");
    const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? body;
    return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----\n`;
  }
  // Bare base64 without headers: assume PKCS#8 private key.
  if (/^[A-Za-z0-9+/=\s]+$/.test(s)) {
    const body = s.replace(/\s+/g, "");
    const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? body;
    return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----\n`;
  }
  return s;
}

export function signMac(fields: Record<string, string>, privateKeyPem: string, algorithm?: string): string {
  const parts = MAC_FIELDS_1012.map((k) => lenPrefix(fields[k] ?? ""));
  const buf = concatBytes(parts);
  const sign = createSign(algoFor(algorithm));
  sign.update(buf);
  sign.end();
  try {
    return sign.sign(normalizePem(privateKeyPem), "base64");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `SWEDBANK_PRIVATE_KEY nepavyko iššifruoti (${msg}). Įsitikinkite, kad įklijuotas pilnas PEM raktas su -----BEGIN PRIVATE KEY----- / -----END PRIVATE KEY----- eilutėmis.`,
    );
  }
}

export function verifyMac(fields: Record<string, string>, publicKeyPem: string, algorithm?: string): boolean {
  const service = fields.VK_SERVICE;
  const layout =
    service === "1101" ? MAC_FIELDS_1101 : service === "1901" ? MAC_FIELDS_1901 : null;
  if (!layout) return false;
  const parts = layout.map((k) => lenPrefix(fields[k] ?? ""));
  const buf = concatBytes(parts);
  const providedMac = fields.VK_MAC ?? "";
  if (!providedMac) return false;
  try {
    const v = createVerify(algoFor(algorithm));
    v.update(buf);
    v.end();
    return v.verify(normalizePem(publicKeyPem), providedMac, "base64");
  } catch {
    return false;
  }
}

/** Constant-time equality for opaque tokens (not used for RSA but handy). */
export function safeEqual(a: string, b: string): boolean {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  if (A.length !== B.length) return false;
  return timingSafeEqual(A, B);
}

export type SwedbankConfig = {
  sndId: string;
  privateKey: string;
  publicKey: string;
  paymentUrl: string;
  algorithm: string; // "SHA-1" | "SHA-256"
  recAcc: string; // pardavėjo IBAN
  recName: string; // pardavėjo pavadinimas
};

export function readSwedbankConfig(): SwedbankConfig | null {
  const sndId = process.env.SWEDBANK_SND_ID;
  const privateKey = process.env.SWEDBANK_PRIVATE_KEY;
  const publicKey = process.env.SWEDBANK_PUBLIC_KEY;
  const paymentUrl = process.env.SWEDBANK_PAYMENT_URL;
  const recAcc = process.env.SWEDBANK_REC_ACC;
  const recName = process.env.SWEDBANK_REC_NAME;
  if (!sndId || !privateKey || !publicKey || !paymentUrl || !recAcc || !recName) {
    return null;
  }
  return {
    sndId,
    privateKey,
    publicKey,
    paymentUrl,
    algorithm: process.env.SWEDBANK_ALGORITHM || "SHA-1",
    recAcc,
    recName,
  };
}

/** Format ISO 8601 datetime with timezone offset (e.g. 2026-05-10T10:00:00+0300). */
export function formatVkDatetime(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const tz = -d.getTimezoneOffset();
  const sign = tz >= 0 ? "+" : "-";
  const tzH = pad(Math.floor(Math.abs(tz) / 60));
  const tzM = pad(Math.abs(tz) % 60);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${tzH}${tzM}`
  );
}

export function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
