"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function Topbar({ title }: { title: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-base font-semibold text-slate-800">{title}</h1>
      <button
        onClick={handleLogout}
        disabled={loading}
        className="text-sm text-slate-600 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
      >
        {loading ? "..." : "Chiqish"}
      </button>
    </header>
  );
}
