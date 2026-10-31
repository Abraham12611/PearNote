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

/** Structure-only diagnostic — NEVER contains message text, request bodies,
 *  or response values. Safe for job errors and logs. */
export type MetaDiag = {
  topLevelKeys: string[];
  choices: number;
  finishReason: string | null;
  contentType: string;
  refusal: boolean;
  usage: { prompt_tokens?: number; completion_tokens?: number; reasoning_tokens?: number } | null;
};

export type MetaChatResult =
  | { ok: true; text: string; usage: MetaDiag["usage"]; ms: number; model: string; provider: string; diag: MetaDiag }
  | { ok: false; error: MetaError; ms: number; diag?: MetaDiag };

const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_BODY_LOG = 400;

export async function chat(opts: {
  system: string;
  user: string;
  provider?: MetaProvider;
  maxTokens?: number;
  /** Documented Meta param for reasoning models — prefer over max_tokens. */
  maxCompletionTokens?: number;
  /** muse reasoning: "low" keeps a usable answer under the token cap. */
  reasoningEffort?: "low" | "medium" | "high";
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
        ...(opts.maxTokens !== undefined ? { max_tokens: opts.maxTokens } : {}),
        ...(opts.maxCompletionTokens !== undefined ? { max_completion_tokens: opts.maxCompletionTokens } : {}),
        ...(opts.reasoningEffort !== undefined ? { reasoning_effort: opts.reasoningEffort } : {}),
        // Muse reasoning default is 1.0 — only override when the caller asks.
        ...(opts.temperature === undefined ? {} : { temperature: opts.temperature }),
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) {
      return { ok: false, error: { kind: "http", status: res.status, body: (await res.text()).slice(0, MAX_BODY_LOG) }, ms: Date.now() - t0 };
    }
    const j = (await res.json()) as Record<string, unknown>;
    const choices = Array.isArray(j.choices) ? (j.choices as Record<string, unknown>[]) : [];
    const ch0 = choices[0] ?? {};
    const msg = (ch0.message ?? {}) as Record<string, unknown>;
    const usage = (j.usage ?? null) as MetaDiag["usage"];
    const diag: MetaDiag = {
      topLevelKeys: Object.keys(j).slice(0, 20),
      choices: choices.length,
      finishReason: typeof ch0.finish_reason === "string" ? ch0.finish_reason : null,
      contentType: Array.isArray(msg.content) ? "array" : typeof msg.content,
      refusal: msg.refusal !== undefined && msg.refusal !== null,
      usage: usage === null ? null : {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        reasoning_tokens: (usage as Record<string, unknown> & { completion_tokens_details?: { reasoning_tokens?: number } })
          .completion_tokens_details?.reasoning_tokens,
      },
    };
    const text =
      (typeof msg.content === "string" ? msg.content : undefined) ??
      ((j.completion_message as { content?: { text?: string } } | undefined)?.content?.text) ??
      "";
    if (text === "") {
      return { ok: false, error: { kind: "invalid_json" }, ms: Date.now() - t0, diag };
    }
    return { ok: true, text, usage: diag.usage, ms: Date.now() - t0, model: provider.model, provider: provider.name, diag };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return { ok: false, error: aborted ? { kind: "timeout" } : { kind: "network", message: String(e).slice(0, MAX_BODY_LOG) }, ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}
