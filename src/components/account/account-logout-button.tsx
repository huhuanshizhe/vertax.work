"use client";

import { signOut } from "next-auth/react";

export function AccountLogoutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        void signOut({ callbackUrl: "/" });
      }}
      className="text-sm text-slate-500 hover:text-slate-800"
    >
      退出
    </button>
  );
}
