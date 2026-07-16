import { eq } from "drizzle-orm";

import { auth } from "@/auth/user-auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  buildDesktopLoginPageHtml,
  type DesktopLoginProfile,
} from "@/lib/oauth-relay/desktop-login";
import { htmlResponse, jsonResponse } from "@/lib/oauth-relay";

export async function GET() {
  // bust soft-cache: login HTML embeds scripts that must stay fresh
  const session = await auth();
  let profile: DesktopLoginProfile | null = null;

  const userId = session?.user?.id?.trim();
  if (userId) {
    const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (row) {
      profile = {
        userId: row.id,
        name: row.name || session?.user?.name || "",
        email: row.email || session?.user?.email || "",
        phone: row.phone || "",
        company: row.company || "",
      };
    } else if (session?.user) {
      profile = {
        userId,
        name: session.user.name || "",
        email: session.user.email || "",
        phone: "",
        company: "",
      };
    }
  }

  const response = htmlResponse(buildDesktopLoginPageHtml(profile));
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function POST() {
  return jsonResponse(405, { error: "Method not allowed" });
}
