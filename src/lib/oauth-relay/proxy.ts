export type ProxyResult = {
  status: number;
  body: unknown;
};

export async function proxyFormPost(
  targetUrl: string,
  body: string | Buffer,
  headers: Record<string, string> = {},
): Promise<ProxyResult> {
  const res = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body,
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }
  return { status: res.status, body: parsed };
}

export async function proxyGet(
  targetUrl: string,
  headers: Record<string, string> = {},
): Promise<ProxyResult> {
  const res = await fetch(targetUrl, {
    method: "GET",
    headers,
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }
  return { status: res.status, body: parsed };
}

export function jsonResponse(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
