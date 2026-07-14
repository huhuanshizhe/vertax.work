import { jsonResponse, proxyTwitterToken } from "@/lib/oauth-relay";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const clientId = request.headers.get("x-client-id") || "";
    const clientSecret = request.headers.get("x-client-secret") || "";
    const result = await proxyTwitterToken(body, clientId, clientSecret);
    return jsonResponse(result.status, result.body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token proxy failed";
    return jsonResponse(500, { error: message });
  }
}
