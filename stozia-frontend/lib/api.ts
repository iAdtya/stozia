// Typed client for the Stozia backend (FastAPI). Mirrors the Pydantic schemas.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type RFQ = {
  id: number;
  item_name: string;
  manufacturer_part_number: string;
  description: string;
  quantity: number;
  delivery_days: number | null;
  notes: string | null;
  created_at: string;
};

export type QuoteComparison = {
  id: number;
  supplier_name: string;
  unit_price: number;
  currency: string;
  lead_time_days: number;
  payment_terms: string;
  moq: number;
  remarks: string | null;
  total_price: number;
  meets_moq: boolean;
  is_best: boolean;
};

export type RFQComparison = RFQ & {
  quotes: QuoteComparison[];
  best_quote_id: number | null;
};

export type RFQCreate = {
  item_name: string;
  manufacturer_part_number: string;
  description: string;
  quantity: number;
  delivery_days?: number | null;
  notes?: string | null;
};

export type QuoteCreate = {
  supplier_name: string;
  unit_price: number;
  currency: string;
  lead_time_days: number;
  payment_terms: string;
  moq: number;
  remarks?: string | null;
};

export type ImportResult = {
  total_rows: number;
  imported: number;
  rfqs_created: number;
  quotes_added: number;
  errors: { row: number; errors: string[] }[];
};

/** Turn a FastAPI error body into a readable message. */
function formatError(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      // 422 validation error: [{loc: [...], msg: "..."}]
      return detail
        .map((e) => {
          const loc = Array.isArray(e?.loc) ? e.loc.slice(1).join(".") : "";
          return loc ? `${loc}: ${e.msg}` : e.msg;
        })
        .join("; ");
    }
  }
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new Error(
      `Cannot reach the API at ${BASE_URL}. Is the backend running?`,
    );
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(formatError(body, `Request failed (${res.status})`));
  }
  return body as T;
}

export const api = {
  listRFQs: () => request<RFQ[]>("/rfqs"),

  getRFQ: (id: number) => request<RFQComparison>(`/rfqs/${id}`),

  createRFQ: (data: RFQCreate) =>
    request<RFQ>("/rfqs", { method: "POST", body: JSON.stringify(data) }),

  deleteRFQ: (id: number) =>
    request<void>(`/rfqs/${id}`, { method: "DELETE" }),

  addQuote: (rfqId: number, data: QuoteCreate) =>
    request<QuoteComparison>(`/rfqs/${rfqId}/quotes`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteQuote: (id: number) =>
    request<void>(`/quotes/${id}`, { method: "DELETE" }),

  // Multipart upload — let the browser set the Content-Type/boundary.
  importQuotes: async (file: File): Promise<ImportResult> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE_URL}/import/quotes`, {
      method: "POST",
      body: form,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(formatError(body, `Upload failed (${res.status})`));
    return body as ImportResult;
  },
};

export function money(n: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 4,
  }).format(n);
}
