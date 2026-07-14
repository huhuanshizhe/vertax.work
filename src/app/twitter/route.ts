import {
  buildTwitterPageHtml,
  htmlResponse,
  jsonResponse,
} from "@/lib/oauth-relay";

export async function GET() {
  return htmlResponse(buildTwitterPageHtml());
}

export async function POST() {
  return jsonResponse(405, { error: "Method not allowed" });
}
