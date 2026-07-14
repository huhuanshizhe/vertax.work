import { jsonResponse, proxyFacebookToken } from "@/lib/oauth-relay";

export async function POST(request: Request) {
  try {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const result = await proxyFacebookToken(params);
    return jsonResponse(result.status, result.body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token proxy failed";
    return jsonResponse(500, { error: message });
  }
}
