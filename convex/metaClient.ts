/**
 * Server-only Meta Model API adapter (owner's primary provider — supersedes
 * the earlier Llama-API spike). Verified provider facts
 * (docs/phase00/META_POC_CONTRACT.md §2):
 *   endpoint   https://api.meta.ai/v1/chat/completions
 *   auth       Authorization: Bearer $MODEL_API_KEY  (Convex server env only —
 *              provisioned on the isolated dev deployment; NEVER VITE_*,
 *              Vercel env, git or client)
 *   model      muse-spark-1.3  (Standard mode — NOT the -contributor variant)
 *
 * The provider is swappable internally via MetaProvider so a second endpoint
 * can be registered deliberately — there is NO silent fallback: a call only
 * ever uses the configured provider or fails as `no_credential`.
 *
 * Never throws: every failure returns a typed MetaError the caller maps to
 * job state (needs_review / failed / retry).
 */
declare const process: { env: Record<string, string | undefined> };

export type MetaProvider = {
  name: string;
  baseUrl: string;
  chatPath: string;
  /** Convex server-side env var holding the key. */
  keyEnv: string;
  model: string;
};

export const META_SPARK: MetaProvider = {
  name: "meta-model-api",
  baseUrl: "https://api.meta.ai/v1",
  chatPath: "/chat/completions",
  keyEnv: "MODEL_API_KEY",
  model: "muse-spark-1.3",
};

export const META_PROMPT_VERSION = 2 as const;

function keyFor(p: MetaProvider): string | undefined {
  return process.env[p.keyEnv]?.trim() || undefined;
}

export type MetaError =
  | { kind: "no_credential" }
  | { kind: "http"; status: number; body: string }
  | { kind: "timeout" }
  | { kind: "network"; message: string }
  | { kind: "invalid_json" };

export type MetaChatResult =
  | { ok: true; text: string; usage: { prompt_tokens?: number; completion_tokens?: number } | null; ms: number; model: string; provider: string }
  | { ok: false; error: MetaError; ms: number };

const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_BODY_LOG = 400;

export async function chat(opts: {
  system: string;
  user: string;
  provider?: MetaProvider;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** Ask the provider for a JSON object reply (response_format json_object). */
  json?: boolean;
}): Promise<MetaChatResult> {
  const t0 = Date.now();
  const provider = opts.provider ?? META_SPARK;
  const key = keyFor(provider);
  if (!key) return { ok: false, error: { kind: "no_credential" }, ms: 0 };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(`${provider.baseUrl}${provider.chatPath}`, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: provider.model,
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
    const text =
      j.choices?.[0]?.message?.content ??
      j.completion_message?.content?.text ??
      "";
    if (text === "") return { ok: false, error: { kind: "invalid_json" }, ms: Date.now() - t0 };
    return { ok: true, text, usage: j.usage ?? null, ms: Date.now() - t0, model: provider.model, provider: provider.name };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return { ok: false, error: aborted ? { kind: "timeout" } : { kind: "network", message: String(e).slice(0, MAX_BODY_LOG) }, ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}
