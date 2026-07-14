import {
  buildTikTokPageHtml,
  htmlResponse,
  jsonResponse,
} from "@/lib/oauth-relay";

export async function GET() {
  return htmlResponse(buildTikTokPageHtml());
}

export async function POST() {
  return jsonResponse(405, { error: "Method not allowed" });
}
