"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { UserRound } from "lucide-react";
import { colors, shadows } from "@/lib/design-tokens";

function getInitials(name?: string | null, email?: string | null) {
  const fromName = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (fromName.length >= 2) {
    return `${fromName[0][0]}${fromName[1][0]}`.toUpperCase();
  }
  if (fromName[0]?.[0]) return fromName[0][0].toUpperCase();
  return (email?.[0] ?? "U").toUpperCase();
}

const iconButtonClass =
  "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border transition-all hover:-translate-y-0.5";

export function NavAuthActions({
  onNavigate,
  compact = false,
}: {
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div
        className={
          compact
            ? "mx-3 h-10 rounded-2xl bg-slate-100"
            : "h-9 w-9 rounded-full bg-slate-100"
        }
        aria-hidden
      />
    );
  }

  const isAuthed = Boolean(session?.user);

  if (compact) {
    if (!isAuthed) {
      return (
        <Link
          className="block cursor-pointer rounded-2xl px-3 py-3 text-sm font-medium"
          href="/login"
          onClick={onNavigate}
          style={{ color: colors.text.primary }}
        >
          登录 / 注册
        </Link>
      );
    }
    return (
      <>
        <Link
          className="block cursor-pointer rounded-2xl px-3 py-3 text-sm font-medium"
          href="/account"
          onClick={onNavigate}
          style={{ color: colors.text.primary }}
        >
          账户资料
        </Link>
        <Link
          className="block cursor-pointer rounded-2xl px-3 py-3 text-sm font-medium"
          href="/account/orders"
          onClick={onNavigate}
          style={{ color: colors.text.primary }}
        >
          我的订单
        </Link>
        <button
          type="button"
          className="block w-full cursor-pointer rounded-2xl px-3 py-3 text-left text-sm font-medium"
          style={{ color: colors.text.secondary }}
          onClick={() => {
            onNavigate?.();
            void signOut({ callbackUrl: "/" });
          }}
        >
          退出登录
        </button>
      </>
    );
  }

  if (!isAuthed) {
    return (
      <Link
        href="/login"
        className={`hidden sm:inline-flex ${iconButtonClass}`}
        style={{
          borderColor: colors.border.light,
          background: colors.bg.secondary,
          boxShadow: shadows.sm,
          color: colors.text.secondary,
        }}
        aria-label="登录"
        title="登录"
      >
        <UserRound className="h-4 w-4" aria-hidden />
      </Link>
    );
  }

  const initials = getInitials(session?.user?.name, session?.user?.email);

  return (
    <Link
      href="/account"
      className={`hidden sm:inline-flex ${iconButtonClass}`}
      style={{
        borderColor: "transparent",
        background: colors.brand.gradient,
        boxShadow: shadows.sm,
        color: "#fff",
      }}
      aria-label="我的账户"
      title="我的账户"
    >
      <span className="text-xs font-bold" aria-hidden>
        {initials}
      </span>
    </Link>
  );
}
