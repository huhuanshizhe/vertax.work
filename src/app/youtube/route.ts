import {
  buildYouTubePageHtml,
  htmlResponse,
  jsonResponse,
} from "@/lib/oauth-relay";

export async function GET() {
  return htmlResponse(buildYouTubePageHtml());
}

export async function POST() {
  return jsonResponse(405, { error: "Method not allowed" });
}
