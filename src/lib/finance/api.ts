/* Client-side helper for the /api/finance/* route handlers.
   Returns null on success, or an error message to show. */
export async function financeApi(path: string, method: "POST" | "PATCH" | "DELETE", body: unknown): Promise<string | null> {
  try {
    const res = await fetch(`/api/finance/${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const payload = await res.json().catch(() => ({}));
    return (payload as { error?: string }).error ?? `Request failed (${res.status})`;
  } catch {
    return "Network error — try again";
  }
}
