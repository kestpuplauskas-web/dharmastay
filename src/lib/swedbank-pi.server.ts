/**
 * Swedbank E-commerce Payment Initiation API V3 client.
 *
 * Docs: https://pi.swedbank.com/developer?version=public_V3
 *
 * Sec. model: kiekviena užklausa pasirašoma JWS Detached (`xxxxx..zzzzz`)
 * `x-jws-signature` header'yje. Banko atsakymai/pranešimai taip pat
 * grąžinami su JWS Detached parašu, kurį verifikuojame banko sertifikatu.
 */
import { createSign, createVerify, createPublicKey, type KeyObject } from "crypto";

type Alg = "RS256" | "RS384" | "RS512";

const DEFAULT_BASE_URL = "https://pi.swedbank.com";
const BANK_CERT_URL = "https://pi.swedbank.com/public/resources/bank-certificates/009";

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function normalizePem(pem: string): string {
  let s = pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem;
  s = s.replace(/\r\n?/g, "\n").trim();
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
  if (/^[A-Za-z0-9+/=\s]+$/.test(s)) {
    const body = s.replace(/\s+/g, "");
    const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? body;
    return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----\n`;
  }
  return s;
}

function nodeAlgoFor(alg: Alg): "RSA-SHA256" | "RSA-SHA384" | "RSA-SHA512" {
  if (alg === "RS256") return "RSA-SHA256";
  if (alg === "RS384") return "RSA-SHA384";
  return "RSA-SHA512";
}

/**
 * Sudaro JWS Detached parašą pagal RFC7515 su b64:false (unencoded payload)
 * ir crit:["b64"]. Antra dalis (payload) yra tuščia — grąžinamas `header..signature`.
 */
export function signJwsDetached(opts: {
  url: string;
  body: string; // literal request body bytes (or empty string for GET)
  privateKeyPem: string;
  kid: string; // "{COUNTRY}:{MERCHANT_ID}"
  alg?: Alg;
}): string {
  const alg: Alg = opts.alg ?? "RS512";
  const header = {
    b64: false,
    crit: ["b64"],
    iat: Math.floor(Date.now() / 1000),
    alg,
    url: opts.url,
    kid: opts.kid,
  };
  const protectedHeader = b64url(JSON.stringify(header));
  // Su b64:false signavimo įvestis yra: ASCII(BASE64URL(protected)) + '.' + payload (kaip yra)
  const signingInput = Buffer.concat([Buffer.from(protectedHeader + ".", "ascii"), Buffer.from(opts.body, "utf8")]);
  const signer = createSign(nodeAlgoFor(alg));
  signer.update(signingInput);
  signer.end();
  let sig: Buffer;
  try {
    sig = signer.sign(normalizePem(opts.privateKeyPem));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `SWEDBANK_PI_PRIVATE_KEY nepavyko naudoti (${msg}). Įsitikinkite, kad įklijuotas pilnas privatus raktas ` +
        `(-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----).`,
    );
  }
  const sigB64 = b64url(sig);
  return `${protectedHeader}..${sigB64}`;
}

/**
 * Verifikuoja JWS Detached parašą su banko viešuoju raktu.
 * `body` — original request/response body bytes as received (raw string).
 */
export function verifyJwsDetached(opts: {
  jws: string;
  body: string;
  bankPublicKey: KeyObject;
}): { ok: boolean; alg?: Alg; iat?: number } {
  const parts = opts.jws.split(".");
  if (parts.length !== 3) return { ok: false };
  const [protectedHeader, payloadPart, sigB64] = parts;
  if (payloadPart !== "") return { ok: false };
  let header: { alg?: Alg; b64?: boolean; crit?: string[]; iat?: number };
  try {
    header = JSON.parse(Buffer.from(protectedHeader.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return { ok: false };
  }
  if (header.b64 !== false) return { ok: false };
  const alg = header.alg;
  if (!alg || !["RS256", "RS384", "RS512"].includes(alg)) return { ok: false };
  const signingInput = Buffer.concat([Buffer.from(protectedHeader + ".", "ascii"), Buffer.from(opts.body, "utf8")]);
  const sig = Buffer.from(sigB64.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const v = createVerify(nodeAlgoFor(alg as Alg));
  v.update(signingInput);
  v.end();
  try {
    const ok = v.verify(opts.bankPublicKey, sig);
    return { ok, alg: alg as Alg, iat: header.iat };
  } catch {
    return { ok: false };
  }
}

// ---------------- konfigūracija ----------------

export type SwedbankPiConfig = {
  merchantId: string;
  country: "LT" | "LV" | "EE";
  privateKey: string;
  alg: Alg;
  baseUrl: string;
};

export function readSwedbankPiConfig(): SwedbankPiConfig | null {
  const merchantId = process.env.SWEDBANK_PI_MERCHANT_ID;
  const country = (process.env.SWEDBANK_PI_COUNTRY || "LT") as "LT" | "LV" | "EE";
  const privateKey = process.env.SWEDBANK_PI_PRIVATE_KEY;
  const alg = (process.env.SWEDBANK_PI_ALG as Alg | undefined) || "RS512";
  const baseUrl = process.env.SWEDBANK_PI_BASE_URL || DEFAULT_BASE_URL;
  if (!merchantId || !privateKey) return null;
  return { merchantId, country, privateKey, alg, baseUrl };
}

// ---------------- banko sertifikato cache ----------------

let cachedBankKey: { key: KeyObject; fetchedAt: number } | null = null;
const BANK_KEY_TTL_MS = 24 * 60 * 60 * 1000;

async function getBankPublicKey(baseUrl: string): Promise<KeyObject> {
  const now = Date.now();
  if (cachedBankKey && now - cachedBankKey.fetchedAt < BANK_KEY_TTL_MS) return cachedBankKey.key;
  const url = baseUrl.replace(/\/+$/, "") + "/public/resources/bank-certificates/009";
  const res = await fetch(url, { headers: { Accept: "application/x-pem-file,*/*" } });
  if (!res.ok) throw new Error(`Nepavyko atsisiųsti Swedbank sertifikato (${res.status})`);
  const pem = await res.text();
  const key = createPublicKey({ key: pem, format: "pem" });
  cachedBankKey = { key, fetchedAt: now };
  return key;
}
// Eksportuojam, kad testai/notify galėtų priversti perkėsuoti:
export function _resetBankKeyCache() {
  cachedBankKey = null;
}
export { getBankPublicKey, BANK_CERT_URL };

// ---------------- HTTP klientas ----------------

async function signedRequest<T>(opts: {
  cfg: SwedbankPiConfig;
  method: "GET" | "POST";
  path: string; // e.g. /public/api/v3/transactions/providers/HABALT22
  body?: unknown;
}): Promise<{ status: number; data: T | null; rawBody: string; jwsHeader: string | null }> {
  const url = opts.cfg.baseUrl.replace(/\/+$/, "") + opts.path;
  const bodyString = opts.body === undefined ? "" : JSON.stringify(opts.body);
  const kid = `${opts.cfg.country}:${opts.cfg.merchantId}`;
  const jws = signJwsDetached({
    url,
    body: bodyString,
    privateKeyPem: opts.cfg.privateKey,
    kid,
    alg: opts.cfg.alg,
  });
  const headers: Record<string, string> = {
    "x-jws-signature": jws,
    Accept: "application/json",
  };
  if (bodyString) headers["Content-Type"] = "application/json";
  const res = await fetch(url, {
    method: opts.method,
    headers,
    body: bodyString || undefined,
  });
  const rawBody = await res.text();
  let data: T | null = null;
  try {
    data = rawBody ? (JSON.parse(rawBody) as T) : null;
  } catch {
    data = null;
  }
  return { status: res.status, data, rawBody, jwsHeader: res.headers.get("x-jws-signature") };
}

// ---------------- viešos API ----------------

export type PaymentInitiationInput = {
  bic: string;
  amount: number; // eurais
  reference?: string; // struktūrinis (RF...) — jei ne, siunčiam description
  description?: string; // iki 140 simbolių
  redirectUrl: string; // klientas grįžta čia po banko
  notificationUrl: string; // bankas praneša į šį endpoint'ą
  locale?: "lt" | "lv" | "et" | "en" | "ru";
};

export type PaymentInitiationResult = {
  transactionId: string;
  redirectUrl: string; // kur nukreipti kliento naršyklę
  statusUrl: string;
};

export async function initiatePayment(
  cfg: SwedbankPiConfig,
  input: PaymentInitiationInput,
): Promise<PaymentInitiationResult> {
  const amountStr = input.amount.toFixed(2);
  // LT/LV: reference ARBA description, bet ne abu. Pasirenkame description (laisvas tekstas).
  const bodyObj: Record<string, unknown> = {
    amount: amountStr,
    currency: "EUR",
    redirectUrl: input.redirectUrl,
    notificationUrl: input.notificationUrl,
    locale: input.locale ?? "lt",
  };
  if (input.reference && /^RF/i.test(input.reference)) {
    bodyObj.reference = input.reference;
  } else if (input.description) {
    bodyObj.description = input.description.slice(0, 140);
  }
  const { status, data, rawBody } = await signedRequest<{
    id: string;
    urls?: { redirect?: string; status?: string };
  }>({
    cfg,
    method: "POST",
    path: `/public/api/v3/transactions/providers/${encodeURIComponent(input.bic)}`,
    body: bodyObj,
  });
  if (status !== 201 || !data?.id || !data.urls?.redirect) {
    throw new Error(`Swedbank initiate failed (${status}): ${rawBody.slice(0, 500)}`);
  }
  return {
    transactionId: data.id,
    redirectUrl: data.urls.redirect,
    statusUrl: data.urls.status || `${cfg.baseUrl}/public/api/v3/transactions/${data.id}/status`,
  };
}

export type TransactionStatus =
  | "NOT_INITIATED"
  | "ABANDONED"
  | "INITIAL"
  | "STARTED"
  | "IN_PROGRESS"
  | "IN_AUTHENTICATION"
  | "IN_CONFIRMATION"
  | "IN_DOUBLE_SIGNING"
  | "EXECUTED"
  | "SETTLED"
  | "FAILED"
  | "CANCELLED_BY_USER"
  | "UNKNOWN"
  | "EXPIRED";

export type StatusResult = {
  status: TransactionStatus;
  raw: unknown;
};

export async function getTransactionStatus(cfg: SwedbankPiConfig, transactionId: string): Promise<StatusResult> {
  const { status, data, rawBody } = await signedRequest<{ status: TransactionStatus }>({
    cfg,
    method: "GET",
    path: `/public/api/v3/transactions/${encodeURIComponent(transactionId)}/status`,
  });
  if (status !== 200 || !data?.status) {
    throw new Error(`Swedbank status failed (${status}): ${rawBody.slice(0, 300)}`);
  }
  return { status: data.status, raw: data };
}

export function isSuccessStatus(s: TransactionStatus): boolean {
  return s === "EXECUTED" || s === "SETTLED";
}
export function isFinalFailure(s: TransactionStatus): boolean {
  return s === "FAILED" || s === "CANCELLED_BY_USER" || s === "EXPIRED" || s === "ABANDONED";
}
