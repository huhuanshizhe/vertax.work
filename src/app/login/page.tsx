"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nextPath = useMemo(() => {
    if (typeof window === "undefined") return "/account";
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    return next && next.startsWith("/") ? next : "/account";
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("邮箱或密码不正确");
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <AuthPageShell
      brandTitle="让增长持续推进"
      brandSubtitle="登录后继续处理内容、线索、决策与 AI 协作"
      badge="Sign In"
      panelTitle="欢迎回来"
      panelSubtitle="输入账号信息以继续进入工作台。"
    >
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error ? (
          <div className="rounded-[20px] border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.06)] px-4 py-3 text-sm text-[var(--ci-danger)]">
            {error}
          </div>
        ) : null}

        <div className="space-y-2.5">
          <label className="text-sm font-medium text-[var(--ci-text)]" htmlFor="email">
            邮箱
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            className="h-12 rounded-2xl border-[var(--ci-border)] bg-white/78 text-[var(--ci-text)] shadow-[0_14px_30px_-24px_rgba(15,23,38,0.18)] placeholder:text-[var(--ci-text-muted)] focus-visible:border-[var(--ci-accent)] focus-visible:ring-[rgba(79,141,246,0.18)]"
          />
        </div>

        <div className="space-y-2.5">
          <label className="text-sm font-medium text-[var(--ci-text)]" htmlFor="password">
            密码
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="输入你的账户密码"
            required
            minLength={6}
            className="h-12 rounded-2xl border-[var(--ci-border)] bg-white/78 text-[var(--ci-text)] shadow-[0_14px_30px_-24px_rgba(15,23,38,0.18)] placeholder:text-[var(--ci-text-muted)] focus-visible:border-[var(--ci-accent)] focus-visible:ring-[rgba(79,141,246,0.18)]"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full cursor-pointer rounded-2xl bg-[linear-gradient(135deg,#4f8df6,#2563eb)] text-base font-medium text-white shadow-[0_22px_46px_-22px_rgba(79,141,246,0.62)] transition-transform duration-200 hover:-translate-y-0.5 hover:opacity-100"
        >
          {loading ? "正在进入工作台..." : "登录并进入工作台"}
        </Button>
      </form>

      <div className="mt-8 border-t border-[var(--ci-border)] pt-5">
        <p className="text-center text-sm leading-6 text-[var(--ci-text-secondary)]">
          还没有账号？{" "}
          <Link
            href={`/register?next=${encodeURIComponent(nextPath)}`}
            className="cursor-pointer font-medium text-[var(--ci-accent-strong)] underline-offset-4 hover:underline"
          >
            注册
          </Link>
          <br />
          需要人工诊断？{" "}
          <Link
            href="/diagnose"
            className="cursor-pointer font-medium text-[var(--ci-accent-strong)] underline-offset-4 hover:underline"
          >
            预约增长诊断
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}
