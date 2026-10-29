/**
 * Server-only Meta (Llama API) adapter. Verified provider facts
 * (docs/phase00/META_POC_CONTRACT.md §2):
 *   endpoint   https://api.llama.com/v1/chat/completions
 *   auth       Authorization: Bearer $LLAMA_API_KEY  (server env only — the
 *              key is provisioned on the Convex deployment, never VITE_*)
 *   models     Llama-4-Maverick-17B-128E-Instruct-FP8 (default PoC model)
 *              Llama-4-Scout-17B-16E-Instruct-FP8 (cheaper alternative)
 *   official TS SDK: llama-api-client — we call fetch directly to keep the
 *   surface auditable and identical to convex/nebius.ts's pattern.
 *
 * Never throws: every failure path returns a typed MetaError the caller maps
 * to job state (needs_review / failed / retry).
 */
declare const process: { env: Record<string, string | undefined> };

export const LLAMA_BASE_URL = "https://api.llama.com/v1";
export const META_MODEL = "Llama-4-Maverick-17B-128E-Instruct-FP8" as const;
export const META_PROMPT_VERSION = 1 as const;

export function metaKey(): string | undefined {
  return process.env.LLAMA_API_KEY?.trim() || undefined;
}

export type MetaError =
  | { kind: "no_credential" }
  | { kind: "http"; status: number; body: string }
  | { kind: "timeout" }
  | { kind: "network"; message: string }
  | { kind: "invalid_json" };

export type MetaChatResult =
  | { ok: true; text: string; usage: { prompt_tokens?: number; completion_tokens?: number } | null; ms: number; model: string }
  | { ok: false; error: MetaError; ms: number };

const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_BODY_LOG = 400;

export async function chat(opts: {
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** Ask the provider for a JSON object reply (response_format json_object). */
  json?: boolean;
}): Promise<MetaChatResult> {
  const t0 = Date.now();
  const key = metaKey();
  if (!key) return { ok: false, error: { kind: "no_credential" }, ms: 0 };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(`${LLAMA_BASE_URL}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: opts.model ?? META_MODEL,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        max_tokens: opts.maxTokens ?? 4000,
        temperature: opts.temperature ?? 0,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) {
      return { ok: false, error: { kind: "http", status: res.status, body: (await res.text()).slice(0, MAX_BODY_LOG) }, ms: Date.now() - t0 };
    }
    const j = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      completion_message?: { content?: { text?: string } };
    };
    // Llama API returns either OpenAI-style choices[].message.content or
    // completion_message.content.text depending on endpoint shape.
    const text =
      j.choices?.[0]?.message?.content ??
      j.completion_message?.content?.text ??
      "";
    if (text === "") return { ok: false, error: { kind: "invalid_json" }, ms: Date.now() - t0 };
    return { ok: true, text, usage: j.usage ?? null, ms: Date.now() - t0, model: opts.model ?? META_MODEL };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return { ok: false, error: aborted ? { kind: "timeout" } : { kind: "network", message: String(e).slice(0, MAX_BODY_LOG) }, ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}
