export async function safeJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  let body: Record<string, unknown>
  try { body = JSON.parse(text) } catch { body = { raw: text } }
  if (!res.ok) {
    const msg = (body.message as string) ?? `HTTP ${res.status}`
    return { ok: false, error: msg }
  }
  return body
}

export async function postJson(url: string, body: object): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  return safeJson(res)
}
