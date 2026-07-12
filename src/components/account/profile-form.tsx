"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AccountProfileForm({
  initial,
}: {
  initial: { name: string; email: string; company: string; phone: string };
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          company: form.get("company"),
          phone: form.get("phone"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setMessage("已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1.5 block text-sm font-medium">邮箱</label>
        <Input value={initial.email} disabled />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="name">
          姓名
        </label>
        <Input id="name" name="name" required defaultValue={initial.name} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="company">
          公司
        </label>
        <Input id="company" name="company" defaultValue={initial.company} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="phone">
          手机
        </label>
        <Input id="phone" name="phone" defaultValue={initial.phone} />
      </div>
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button
        className="rounded-xl bg-[#3B82F6] text-white hover:bg-[#2563EB]"
        disabled={loading}
        type="submit"
      >
        {loading ? "保存中…" : "保存"}
      </Button>
    </form>
  );
}
