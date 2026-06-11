"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button, Card, ErrorBanner, Field, inputClass } from "../../components/ui";

export default function NewRFQPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const f = new FormData(e.currentTarget);
    const deliveryRaw = (f.get("delivery_days") as string).trim();
    try {
      const rfq = await api.createRFQ({
        item_name: (f.get("item_name") as string).trim(),
        manufacturer_part_number: (f.get("manufacturer_part_number") as string).trim(),
        description: (f.get("description") as string).trim(),
        quantity: Number(f.get("quantity")),
        delivery_days: deliveryRaw === "" ? null : Number(deliveryRaw),
        notes: (f.get("notes") as string).trim() || null,
      });
      router.push(`/rfqs/${rfq.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to RFQs
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">New RFQ</h1>
      </div>

      {error && <ErrorBanner message={error} />}

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Item name">
            <input name="item_name" required className={inputClass} placeholder="Capacitor 10µF 25V" />
          </Field>
          <Field label="Manufacturer part number (MPN)" hint="Must be unique.">
            <input
              name="manufacturer_part_number"
              required
              className={inputClass}
              placeholder="CL21A106KAYNNNE"
            />
          </Field>
          <Field label="Description">
            <input name="description" required className={inputClass} placeholder="MLCC 10µF 25V X5R" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantity" hint="Whole number > 0.">
              <input
                name="quantity"
                type="number"
                min={1}
                required
                className={inputClass}
                placeholder="100"
              />
            </Field>
            <Field label="Delivery expectation (days)" hint="Optional.">
              <input name="delivery_days" type="number" min={0} className={inputClass} />
            </Field>
          </div>
          <Field label="Notes" hint="Optional.">
            <textarea name="notes" rows={2} className={inputClass} />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create RFQ"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
