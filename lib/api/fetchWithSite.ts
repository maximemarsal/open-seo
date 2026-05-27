/**
 * Wrap fetch to inject the `x-site-id` header (and the Authorization Bearer).
 * Use this whenever you call a route that scopes data per-site.
 *
 * For React components, prefer the useFetchWithSite() hook from
 * contexts/SiteContext which automatically pulls the active site.
 */
export async function fetchWithSite(
  url: string,
  init: RequestInit | undefined,
  ctx: { idToken: string; siteId: string }
): Promise<Response> {
  const headers = new Headers(init?.headers || {});
  headers.set("Authorization", `Bearer ${ctx.idToken}`);
  if (ctx.siteId) headers.set("x-site-id", ctx.siteId);
  return fetch(url, { ...init, headers });
}
