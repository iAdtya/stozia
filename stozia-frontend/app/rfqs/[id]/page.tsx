"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, money, RFQComparison } from "@/lib/api";
import { Button, Card, ErrorBanner, Field, inputClass } from "../../components/ui";

export default function RFQDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [rfq, setRfq] = useState<RFQComparison | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setError("");
    try {
      setRfq(await api.getRFQ(id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    if (!Number.isNaN(id)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDeleteQuote(quoteId: number) {
    if (!confirm("Delete this quote?")) return;
    try {
      await api.deleteQuote(quoteId);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (error && !rfq) {
    return (
      <div className="space-y-4">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to RFQs
        </Link>
        <ErrorBanner message={error} />
      </div>
    );
  }

  if (!rfq) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to RFQs
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{rfq.item_name}</h1>
        <p className="text-sm text-slate-500">{rfq.description}</p>
      </div>

      {/* RFQ summary */}
      <Card className="grid grid-cols-2 gap-x-8 gap-y-3 p-5 sm:grid-cols-4">
        <Summary label="MPN" value={rfq.manufacturer_part_number} mono />
        <Summary label="Quantity" value={String(rfq.quantity)} />
        <Summary
          label="Delivery expectation"
          value={rfq.delivery_days != null ? `${rfq.delivery_days} days` : "—"}
        />
        <Summary label="Quotes" value={String(rfq.quotes.length)} />
        {rfq.notes && (
          <div className="col-span-2 sm:col-span-4">
            <Summary label="Notes" value={rfq.notes} />
          </div>
        )}
      </Card>

      {error && <ErrorBanner message={error} />}

      {/* Comparison table */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Supplier comparison</h2>
          <Button variant="secondary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ Add quote"}
          </Button>
        </div>

        {showForm && (
          <AddQuoteForm
            rfqId={rfq.id}
            onAdded={async () => {
              setShowForm(false);
              await load();
            }}
          />
        )}

        <Card className="mt-3 overflow-x-auto">
          {rfq.quotes.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              No quotes yet. Add one above to start comparing.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Supplier</th>
                  <th className="px-4 py-2.5 text-right">Unit price</th>
                  <th className="px-4 py-2.5 text-right">MOQ</th>
                  <th className="px-4 py-2.5 text-right">Total ({rfq.quantity}×)</th>
                  <th className="px-4 py-2.5 text-right">Lead time</th>
                  <th className="px-4 py-2.5">Payment</th>
                  <th className="px-4 py-2.5">Remarks</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rfq.quotes.map((q) => (
                  <tr
                    key={q.id}
                    className={
                      q.is_best
                        ? "bg-green-50"
                        : !q.meets_moq
                          ? "bg-slate-50/60 text-slate-400"
                          : "hover:bg-slate-50"
                    }
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      <span className={q.meets_moq ? "" : "text-slate-400"}>
                        {q.supplier_name}
                      </span>
                      {q.is_best && (
                        <span className="ml-2 rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                          Best
                        </span>
                      )}
                      {!q.meets_moq && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                          MOQ {q.moq} &gt; {rfq.quantity}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {money(q.unit_price, q.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{q.moq}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                      {money(q.total_price, q.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{q.lead_time_days}d</td>
                    <td className="px-4 py-2.5 text-slate-600">{q.payment_terms}</td>
                    <td className="px-4 py-2.5 text-slate-500">{q.remarks || "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="danger" onClick={() => handleDeleteQuote(q.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

function Summary({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-sm text-slate-900 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function AddQuoteForm({ rfqId, onAdded }: { rfqId: number; onAdded: () => void }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const f = new FormData(e.currentTarget);
    try {
      await api.addQuote(rfqId, {
        supplier_name: (f.get("supplier_name") as string).trim(),
        unit_price: Number(f.get("unit_price")),
        currency: ((f.get("currency") as string) || "USD").trim().toUpperCase(),
        lead_time_days: Number(f.get("lead_time_days")),
        payment_terms: (f.get("payment_terms") as string).trim(),
        moq: Number(f.get("moq")) || 1,
        remarks: (f.get("remarks") as string).trim() || null,
      });
      onAdded();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Supplier name">
            <input name="supplier_name" required className={inputClass} placeholder="Mouser" />
          </Field>
          <Field label="Unit price (USD)" hint="≥ 0.">
            <input
              name="unit_price"
              type="number"
              step="any"
              min={0}
              required
              className={inputClass}
              placeholder="0.072"
            />
          </Field>
          <Field label="Currency">
            <input name="currency" defaultValue="USD" className={inputClass} maxLength={3} />
          </Field>
          <Field label="Lead time (days)">
            <input name="lead_time_days" type="number" min={0} required className={inputClass} placeholder="3" />
          </Field>
          <Field label="Payment terms" hint='Format like "Net 30".'>
            <input name="payment_terms" required className={inputClass} placeholder="Net 30" />
          </Field>
          <Field label="MOQ" hint="Minimum order quantity. Default 1.">
            <input name="moq" type="number" min={1} defaultValue={1} className={inputClass} />
          </Field>
          <Field label="Remarks" hint="Optional.">
            <input name="remarks" className={inputClass} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Adding…" : "Add quote"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
