import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { adminAuth } from "@/auth/admin-auth";
import { db } from "@/db";
import { customerLicenses, users } from "@/db/schema";
import { createId } from "@/lib/ids";
import {
  customerDisplayName,
  issueLicenseCode,
} from "@/server/admin/issue-license";
import {
  LICENSE_TYPE_CUSTOMER,
  LICENSE_USAGE_UNUSED,
} from "@/lib/license/usage";

export async function GET(req: Request) {
  const session = await adminAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(customerLicenses)
    .where(eq(customerLicenses.userId, userId))
    .orderBy(desc(customerLicenses.createdAt));

  return NextResponse.json({
    licenses: rows.map((row) => ({
      id: row.id,
      code: row.code,
      modules: row.modules,
      period: row.period,
      expiresAt: row.expiresAt.toISOString(),
      monthlyLeadsLimit: row.monthlyLeadsLimit,
      usageLimitMonths: row.usageLimitMonths,
      usageExpiresAt: row.usageExpiresAt
        ? row.usageExpiresAt.toISOString()
        : null,
      enabled: row.enabled,
      usageStatus: row.usageStatus,
      usedAt: row.usedAt ? row.usedAt.toISOString() : null,
      issuedAt: row.issuedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    })),
  });
}

const createSchema = z.object({
  userId: z.string().min(1),
  modules: z.array(z.string()).min(1),
  period: z.string(),
  monthlyLeadsLimit: z.union([z.number(), z.null(), z.string()]).optional(),
  usageLimitMonths: z.union([z.number(), z.null(), z.string()]).optional(),
  expiresAt: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await adminAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数无效" }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, parsed.data.userId))
      .limit(1);
    if (!user) {
      return NextResponse.json({ error: "客户不存在" }, { status: 404 });
    }

    const customerName = customerDisplayName(user);
    if (!customerName) {
      return NextResponse.json({ error: "客户名称为空" }, { status: 400 });
    }

    const now = new Date();
    const id = createId("clic");
    const issued = issueLicenseCode({
      userId: user.id,
      licenseType: LICENSE_TYPE_CUSTOMER,
      licenseId: id,
      customerName,
      modules: parsed.data.modules,
      period: parsed.data.period,
      monthlyLeadsLimit: parsed.data.monthlyLeadsLimit,
      usageLimitMonths: parsed.data.usageLimitMonths,
      expiresAt: parsed.data.expiresAt,
    });

    await db.insert(customerLicenses).values({
      id,
      userId: user.id,
      code: issued.code,
      modules: issued.modules,
      period: issued.period,
      expiresAt: new Date(issued.expiresAtIso),
      monthlyLeadsLimit: issued.monthlyLeadsLimit,
      usageLimitMonths: issued.usageLimitMonths,
      usageExpiresAt: issued.usageExpiresAtIso
        ? new Date(issued.usageExpiresAtIso)
        : null,
      enabled: true,
      usageStatus: LICENSE_USAGE_UNUSED,
      usedAt: null,
      payloadJson: issued.payload as unknown as Record<string, unknown>,
      adminId: session.user.id,
      issuedAt: now,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      id,
      code: issued.code,
      expiresAt: issued.expiresAtIso,
      usageLimitMonths: issued.usageLimitMonths,
      usageExpiresAt: issued.usageExpiresAtIso,
      usageStatus: LICENSE_USAGE_UNUSED,
    });
  } catch (error) {
    console.error("Create customer license error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "生成授权码失败",
      },
      { status: 500 }
    );
  }
}
