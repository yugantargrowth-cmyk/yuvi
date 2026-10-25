import { generateScannableQrSvg } from "./qrCode";

export interface UpiConfig {
  vpa: string;
  payeeName: string;
}

let _runtimeCustomVpa: string | undefined;

/**
 * Resolves the UPI VPA from explicit override, environment variable UPI_VPA,
 * or localStorage settings. Returns an empty string if not configured.
 */
export function getUpiVpa(customVpa?: string): string {
  if (customVpa && customVpa.trim()) {
    return customVpa.trim();
  }
  if (_runtimeCustomVpa && _runtimeCustomVpa.trim()) {
    return _runtimeCustomVpa.trim();
  }
  if (typeof process !== "undefined" && process.env?.UPI_VPA) {
    return process.env.UPI_VPA.trim();
  }
  try {
    // @ts-ignore
    if (typeof import.meta !== "undefined" && import.meta.env) {
      // @ts-ignore
      const metaVpa = import.meta.env.VITE_UPI_VPA || import.meta.env.UPI_VPA;
      if (metaVpa) return String(metaVpa).trim();
    }
  } catch {}
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const saved = window.localStorage.getItem("yuvi:settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedVpa = parsed?.payments?.upiVpa || parsed?.identity?.upiVpa || parsed?.upiVpa;
        if (savedVpa && typeof savedVpa === "string" && savedVpa.trim()) {
          return savedVpa.trim();
        }
      }
    } catch {}
  }
  return "";
}

export function setRuntimeUpiVpa(vpa?: string): void {
  _runtimeCustomVpa = vpa;
}

export const DEFAULT_UPI_CONFIG: UpiConfig = {
  get vpa() {
    return getUpiVpa();
  },
  set vpa(val: string) {
    _runtimeCustomVpa = val;
  },
  payeeName: "Yugantar Growth",
};


export interface UpiPaymentRequest {
  amount: number;
  note: string;
  vpa?: string;
  payeeName?: string;
  transactionRef?: string;
}

export interface UpiPaymentDetails {
  vpa: string;
  payeeName: string;
  amount: number;
  note: string;
  upiUri: string;
  qrDataUrl: string;
  formattedAmount: string;
}

/**
 * Builds standard NPCI UPI URI string. Returns empty string if VPA is unconfigured.
 */
export function buildUpiUri(params: UpiPaymentRequest): string {
  const vpa = (params.vpa || DEFAULT_UPI_CONFIG.vpa).trim();
  if (!vpa) {
    return "";
  }
  const payeeName = (params.payeeName || DEFAULT_UPI_CONFIG.payeeName).trim();
  const amount = Math.max(0, params.amount);
  const note = (params.note || "Project Advance").trim();
  const tr = params.transactionRef ? `&tr=${encodeURIComponent(params.transactionRef)}` : "";

  return `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}${tr}`;
}

/**
 * Generates an SVG QR code data URL using pure algorithmic SVG generation (offline safe).
 * Returns empty string if UPI URI is empty.
 */
export function generateUpiQrDataUrl(upiUri: string): string {
  if (!upiUri || !upiUri.trim()) {
    return "";
  }
  const svg = generateScannableQrSvg(upiUri.trim(), { size: 220, foreground: "#080808", background: "#ffffff" });
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Assembles full payment details including direct URI, QR code, and Indian rupee formatting.
 * If VPA is not configured, sets vpa to "UPI not configured", upiUri to "", and qrDataUrl to "".
 */
export function generateUpiPaymentDetails(params: UpiPaymentRequest): UpiPaymentDetails {
  const rawVpa = (params.vpa || DEFAULT_UPI_CONFIG.vpa).trim();
  const payeeName = (params.payeeName || DEFAULT_UPI_CONFIG.payeeName).trim();
  const amount = Math.max(0, Math.round(params.amount));
  const note = params.note || "Project Advance Payment";
  const isConfigured = Boolean(rawVpa);
  const vpa = isConfigured ? rawVpa : "UPI not configured";
  const upiUri = isConfigured ? buildUpiUri({ ...params, vpa: rawVpa, payeeName, amount, note }) : "";
  const qrDataUrl = upiUri ? generateUpiQrDataUrl(upiUri) : "";

  const formattedAmount = `₹${amount.toLocaleString("en-IN")}`;

  return {
    vpa,
    payeeName,
    amount,
    note,
    upiUri,
    qrDataUrl,
    formattedAmount,
  };
}

/**
 * Validates bank UTR (Unique Transaction Reference) / UPI Ref number.
 * Standard Indian banking UTRs are 6-22 alphanumeric characters (e.g., 428901234567, CMS12345678).
 */
export function validateUpiReference(utr: string): { valid: boolean; normalized?: string; error?: string } {
  if (!utr || typeof utr !== "string") {
    return { valid: false, error: "UTR reference number is required." };
  }

  const clean = utr.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (clean.length < 6) {
    return {
      valid: false,
      error: "UTR reference number must be at least 6 alphanumeric characters.",
    };
  }

  if (clean.length > 30) {
    return {
      valid: false,
      error: "UTR reference number exceeds maximum permitted length (30 characters).",
    };
  }

  return { valid: true, normalized: clean };
}

export interface AdvancePaymentState {
  advanceReceived: boolean;
  utrReference?: string;
  amountPaid?: number;
  verifiedAt?: string;
  notes?: string;
}

/**
 * Advance Payment Hard Gate:
 * Evaluates whether a proposal or lead qualifies to start active delivery.
 * In solo agency operations, project work NEVER starts without confirmed advance payment.
 */
export function advancePaymentGate(
  contractValue: number,
  paymentState: AdvancePaymentState,
  minAdvancePercentage: number = 50,
): {
  allowed: boolean;
  reason?: string;
  requiredAdvance: number;
  shortfall: number;
} {
  const requiredAdvance = Math.round((contractValue * minAdvancePercentage) / 100);
  const paid = Math.max(0, paymentState.amountPaid || 0);
  const shortfall = Math.max(0, requiredAdvance - paid);

  if (!paymentState.advanceReceived) {
    return {
      allowed: false,
      reason: "Advance payment has not been marked as received.",
      requiredAdvance,
      shortfall,
    };
  }

  const utrCheck = validateUpiReference(paymentState.utrReference || "");
  if (!utrCheck.valid) {
    return {
      allowed: false,
      reason: `Invalid or missing bank UTR payment reference: ${utrCheck.error}`,
      requiredAdvance,
      shortfall,
    };
  }

  if (shortfall > 0) {
    return {
      allowed: false,
      reason: `Insufficient advance payment: Received ₹${paid.toLocaleString("en-IN")}, minimum required is ₹${requiredAdvance.toLocaleString("en-IN")} (shortfall of ₹${shortfall.toLocaleString("en-IN")}).`,
      requiredAdvance,
      shortfall,
    };
  }

  return {
    allowed: true,
    requiredAdvance,
    shortfall: 0,
  };
}
