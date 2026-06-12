import Link from "next/link";

export function Button({
  className = "",
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-slate-700",
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    danger: "border border-red-300 bg-white text-red-600 hover:bg-red-50",
  }[variant];
  return (
    <button
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-700"
      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
  return (
    <Link
      href={href}
      className={`inline-block rounded-md px-3 py-1.5 text-sm font-medium transition ${styles}`}
    >
      {children}
    </Link>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm " +
  "text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white ${className}`}>
      {children}
    </div>
  );
}
