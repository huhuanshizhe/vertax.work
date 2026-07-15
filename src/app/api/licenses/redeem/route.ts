import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { customerLicenses, orderShipments } from "@/db/schema";
import { verifyLicenseCodeWithConfig } from "@/lib/license/crypto";
import {
  isLicenseIssueType,
  LICENSE_TYPE_CUSTOMER,
  LICENSE_TYPE_ORDER,
  LICENSE_USAGE_UNUSED,
  LICENSE_USAGE_USED,
} from "@/lib/license/usage";

export const runtime = "nodejs";

const bodySchema = z.object({
  licenseType: z.string().min(1),
  licenseId: z.string().min(1),
  code: z.string().min(1),
});

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonWithCors(
  req: Request,
  data: unknown,
  init: { status?: number } = {}
) {
  return NextResponse.json(data, {
    status: init.status ?? 200,
    headers: corsHeaders(req),
  });
}

function readExtString(
  ext: Record<string, unknown> | undefined,
  key: string
): string | null {
  if (!ext) return null;
  const raw = ext[key];
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return value || null;
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req),
  });
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return jsonWithCors(req, { error: "参数无效" }, { status: 400 });
    }

    const licenseType = parsed.data.licenseType.trim();
    const licenseId = parsed.data.licenseId.trim();
    const code = parsed.data.code.trim();

    if (!isLicenseIssueType(licenseType)) {
      return jsonWithCors(req, { error: "无效授权码类型" }, { status: 400 });
    }
    if (!code) {
      return jsonWithCors(req, { error: "请提供授权码" }, { status: 400 });
    }

    let payload;
    try {
      payload = verifyLicenseCodeWithConfig(code);
    } catch (error) {
      return jsonWithCors(
        req,
        {
          error: error instanceof Error ? error.message : "授权码验签失败",
        },
        { status: 400 }
      );
    }

    const payloadType = readExtString(payload.ext, "license_type");
    const payloadId = readExtString(payload.ext, "license_id");
    if (payloadType !== licenseType || payloadId !== licenseId) {
      return jsonWithCors(
        req,
        { error: "授权码绑定信息不匹配" },
        { status: 400 }
      );
    }

    const now = new Date();

    if (licenseType === LICENSE_TYPE_CUSTOMER) {
      const [row] = await db
        .select()
        .from(customerLicenses)
        .where(eq(customerLicenses.id, licenseId))
        .limit(1);
      if (!row) {
        return jsonWithCors(req, { error: "授权码不存在" }, { status: 404 });
      }
      if (row.code !== code) {
        return jsonWithCors(req, { error: "授权码不匹配" }, { status: 400 });
      }
      if (row.usageStatus === LICENSE_USAGE_USED) {
        return jsonWithCors(
          req,
          { error: "授权码已被使用过", code: "already_used" },
          { status: 409 }
        );
      }

      const updated = await db
        .update(customerLicenses)
        .set({ usageStatus: LICENSE_USAGE_USED, usedAt: now })
        .where(
          and(
            eq(customerLicenses.id, licenseId),
            eq(customerLicenses.usageStatus, LICENSE_USAGE_UNUSED)
          )
        )
        .returning({ id: customerLicenses.id });

      if (updated.length === 0) {
        return jsonWithCors(
          req,
          { error: "授权码已被使用过", code: "already_used" },
          { status: 409 }
        );
      }

      return jsonWithCors(req, {
        ok: true,
        usageStatus: LICENSE_USAGE_USED,
        licenseType,
        licenseId,
      });
    }

    if (licenseType === LICENSE_TYPE_ORDER) {
      const [row] = await db
        .select()
        .from(orderShipments)
        .where(eq(orderShipments.id, licenseId))
        .limit(1);
      if (!row) {
        return jsonWithCors(req, { error: "授权码不存在" }, { status: 404 });
      }
      if (row.trackingNumber !== code) {
        return jsonWithCors(req, { error: "授权码不匹配" }, { status: 400 });
      }
      if (row.usageStatus === LICENSE_USAGE_USED) {
        return jsonWithCors(
          req,
          { error: "授权码已被使用过", code: "already_used" },
          { status: 409 }
        );
      }

      const updated = await db
        .update(orderShipments)
        .set({ usageStatus: LICENSE_USAGE_USED, usedAt: now })
        .where(
          and(
            eq(orderShipments.id, licenseId),
            eq(orderShipments.usageStatus, LICENSE_USAGE_UNUSED)
          )
        )
        .returning({ id: orderShipments.id });

      if (updated.length === 0) {
        return jsonWithCors(
          req,
          { error: "授权码已被使用过", code: "already_used" },
          { status: 409 }
        );
      }

      return jsonWithCors(req, {
        ok: true,
        usageStatus: LICENSE_USAGE_USED,
        licenseType,
        licenseId,
      });
    }

    return jsonWithCors(req, { error: "无效授权码类型" }, { status: 400 });
  } catch (error) {
    console.error("License redeem error:", error);
    return jsonWithCors(
      req,
      { error: error instanceof Error ? error.message : "核销失败" },
      { status: 500 }
    );
  }
}
