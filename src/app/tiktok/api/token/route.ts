import { jsonResponse, proxyTikTokToken } from "@/lib/oauth-relay";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const result = await proxyTikTokToken(body);
    return jsonResponse(result.status, result.body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token proxy failed";
    return jsonResponse(500, { error: message });
  }
}
