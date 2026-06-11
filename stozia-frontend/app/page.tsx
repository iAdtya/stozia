"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, RFQ } from "@/lib/api";
import { Button, Card, ErrorBanner, LinkButton } from "./components/ui";

export default function HomePage() {
  const [rfqs, setRfqs] = useState<RFQ[] | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      setRfqs(await api.listRFQs());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete RFQ "${name}" and all its quotes?`)) return;
    try {
      await api.deleteRFQ(id);
      setRfqs((prev) => prev?.filter((r) => r.id !== id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">RFQs</h1>
          <p className="text-sm text-slate-500">
            Request-for-quote items and their supplier comparisons.
          </p>
        </div>
        <LinkButton href="/rfqs/new">+ New RFQ</LinkButton>
      </div>

      {error && <ErrorBanner message={error} />}

      <Card>
        {rfqs === null && !error ? (
          <p className="px-4 py-6 text-sm text-slate-500">Loading…</p>
        ) : rfqs && rfqs.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            No RFQs yet.{" "}
            <Link href="/rfqs/new" className="text-slate-900 underline">
              Create one
            </Link>{" "}
            or{" "}
            <Link href="/import" className="text-slate-900 underline">
              import a CSV
            </Link>
            .
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Item</th>
                <th className="px-4 py-2.5">MPN</th>
                <th className="px-4 py-2.5 text-right">Quantity</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rfqs?.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/rfqs/${r.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {r.item_name}
                    </Link>
                    <div className="text-xs text-slate-400">{r.description}</div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                    {r.manufacturer_part_number}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.quantity}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-2">
                      <LinkButton href={`/rfqs/${r.id}`} variant="secondary">
                        Compare
                      </LinkButton>
                      <Button
                        variant="danger"
                        onClick={() => handleDelete(r.id, r.item_name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
