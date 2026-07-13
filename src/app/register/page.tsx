"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nextPath = useMemo(() => {
    if (typeof window === "undefined") return "/account/orders";
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (!next || !next.startsWith("/")) return "/account/orders";
    if (next === "/account") return "/account/orders";
    return next;
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
      company: String(form.get("company") || ""),
      phone: String(form.get("phone") || ""),
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "注册失败");
      }

      const result = await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        redirect: false,
      });

      if (result?.error) {
        router.push(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      brandTitle="创建你的增长账户"
      brandSubtitle="注册后即可购买模块授权、查看订单，并进入后续交付协作。"
      badge="Sign Up"
      panelTitle="注册账号"
      panelSubtitle="填写基本信息，创建后可立即购买授权。"
    >
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error ? (
          <div className="rounded-[20px] border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.06)] px-4 py-3 text-sm text-[var(--ci-danger)]">
            {error}
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ci-text)]" htmlFor="name">
            姓名
          </label>
          <Input
            id="name"
            name="name"
            required
            placeholder="张三"
            className="h-11 rounded-2xl border-[var(--ci-border)] bg-white/78"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ci-text)]" htmlFor="company">
            公司
          </label>
          <Input
            id="company"
            name="company"
            placeholder="公司名称（可选）"
            className="h-11 rounded-2xl border-[var(--ci-border)] bg-white/78"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ci-text)]" htmlFor="email">
            邮箱
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="h-11 rounded-2xl border-[var(--ci-border)] bg-white/78"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ci-text)]" htmlFor="phone">
            手机
          </label>
          <Input
            id="phone"
            name="phone"
            placeholder="手机号（可选）"
            className="h-11 rounded-2xl border-[var(--ci-border)] bg-white/78"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ci-text)]" htmlFor="password">
            密码
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="至少 6 位"
            className="h-11 rounded-2xl border-[var(--ci-border)] bg-white/78"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="mt-2 h-12 w-full cursor-pointer rounded-2xl bg-[linear-gradient(135deg,#4f8df6,#2563eb)] text-base font-medium text-white shadow-[0_22px_46px_-22px_rgba(79,141,246,0.62)] transition-transform duration-200 hover:-translate-y-0.5 hover:opacity-100"
        >
          {loading ? "创建中…" : "创建账号"}
        </Button>
      </form>

      <div className="mt-6 border-t border-[var(--ci-border)] pt-5">
        <p className="text-center text-sm text-[var(--ci-text-secondary)]">
          已有账号？{" "}
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className="cursor-pointer font-medium text-[var(--ci-accent-strong)] underline-offset-4 hover:underline"
          >
            登录
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}
