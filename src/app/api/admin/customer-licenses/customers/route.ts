import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { adminAuth } from "@/auth/admin-auth";
import { db } from "@/db";
import { customerLicenses, users } from "@/db/schema";

export async function GET() {
  const session = await adminAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const rows = await db.select().from(users).orderBy(desc(users.updatedAt));

  const counts = await db
    .select({
      userId: customerLicenses.userId,
      value: sql<number>`count(*)::int`,
    })
    .from(customerLicenses)
    .groupBy(customerLicenses.userId);
  const countMap = new Map(counts.map((c) => [c.userId, c.value]));

  return NextResponse.json({
    customers: rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      company: u.company,
      phone: u.phone,
      status: u.status,
      manualLicenseCount: countMap.get(u.id) || 0,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    })),
  });
}
