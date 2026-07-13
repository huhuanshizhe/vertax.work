import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/auth/admin-auth";
import {
  evaluateLicenseTiming,
  verifyLicenseCodeWithConfig,
} from "@/lib/license/crypto";

const schema = z.object({
  code: z.string().min(10),
});

export async function POST(req: Request) {
  const session = await adminAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "请提供授权码" }, { status: 400 });
    }

    const payload = verifyLicenseCodeWithConfig(parsed.data.code.trim());
    const { expired, usageTimedOut } = evaluateLicenseTiming(payload);
    return NextResponse.json({
      ok: true,
      expired,
      usageTimedOut,
      payload,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "验签失败",
      },
      { status: 400 }
    );
  }
}
