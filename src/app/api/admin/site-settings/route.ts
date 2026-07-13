import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/auth/admin-auth";
import {
  getSiteSettings,
  updateSiteSettings,
  resolvePaymentMode,
} from "@/server/site/settings";
import { isAlipayConfigured } from "@/lib/alipay/config";

export async function GET() {
  const session = await adminAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const settings = await getSiteSettings();
  const mode = await resolvePaymentMode();

  return NextResponse.json({
    paymentSandboxMode: settings.paymentSandboxMode,
    mode,
    gateways: {
      alipay: {
        configured: isAlipayConfigured(mode),
        sandboxConfigured: isAlipayConfigured("test"),
        liveConfigured: isAlipayConfigured("live"),
      },
    },
  });
}

const putSchema = z.object({
  paymentSandboxMode: z.boolean(),
});

export async function PUT(req: Request) {
  const session = await adminAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数无效" }, { status: 400 });
    }

    const mode = parsed.data.paymentSandboxMode ? "test" : "live";
    if (!parsed.data.paymentSandboxMode && !isAlipayConfigured("live")) {
      return NextResponse.json(
        {
          error:
            "Live 密钥未配置：请在环境变量填写 ALIPAY_LIVE_APP_ID / PRIVATE_KEY / ALIPAY_PUBLIC_KEY 后重试",
        },
        { status: 400 }
      );
    }

    const settings = await updateSiteSettings({
      paymentSandboxMode: parsed.data.paymentSandboxMode,
    });

    return NextResponse.json({
      success: true,
      paymentSandboxMode: settings.paymentSandboxMode,
      mode,
      gateways: {
        alipay: {
          configured: isAlipayConfigured(mode),
          sandboxConfigured: isAlipayConfigured("test"),
          liveConfigured: isAlipayConfigured("live"),
        },
      },
    });
  } catch (error) {
    console.error("Update site settings error:", error);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
