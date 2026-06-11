"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ImportResult } from "@/lib/api";
import { Button, Card, ErrorBanner } from "../components/ui";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setError("");
    setResult(null);
    setBusy(true);
    try {
      setResult(await api.importQuotes(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to RFQs
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">Import supplier quotes</h1>
        <p className="text-sm text-slate-500">
          Upload a CSV of supplier quotes. Items are grouped by part number; each row
          becomes one quote. Invalid rows are reported and skipped — valid rows still import.
        </p>
      </div>

      <Card className="p-5">
        <p className="mb-2 text-sm font-medium text-slate-700">Expected columns</p>
        <code className="block overflow-x-auto rounded bg-slate-100 px-3 py-2 text-xs text-slate-700">
          item_name, manufacturer_part_number, description, quantity, moq, unit_price,
          currency, supplier_name, lead_time_days, payment_terms, remarks
        </code>
        <p className="mt-2 text-xs text-slate-400">
          <code>moq</code> (minimum order quantity) is optional and defaults to 1. A quote
          can only win if its MOQ ≤ the RFQ quantity.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
              setError("");
            }}
            className="text-sm text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-50"
          />
          <Button onClick={handleUpload} disabled={!file || busy}>
            {busy ? "Importing…" : "Upload"}
          </Button>
        </div>
      </Card>

      {error && <ErrorBanner message={error} />}

      {result && (
        <Card className="p-5">
          <h2 className="text-base font-semibold text-slate-900">Import result</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Rows" value={result.total_rows} />
            <Stat label="Imported" value={result.imported} good />
            <Stat label="New RFQs" value={result.rfqs_created} />
            <Stat label="Errors" value={result.errors.length} bad={result.errors.length > 0} />
          </div>

          {result.errors.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-slate-700">Skipped rows</p>
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Problems</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.errors.map((e) => (
                      <tr key={e.row}>
                        <td className="px-3 py-2 tabular-nums text-slate-600">{e.row}</td>
                        <td className="px-3 py-2 text-red-700">{e.errors.join("; ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-4">
            <Link href="/" className="text-sm text-slate-900 underline">
              View imported RFQs →
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  good,
  bad,
}: {
  label: string;
  value: number;
  good?: boolean;
  bad?: boolean;
}) {
  const color = bad ? "text-red-600" : good ? "text-green-600" : "text-slate-900";
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
