// Request/response mapping for the two chat protocols the engine speaks: OpenAI-compatible
// Chat Completions (the default) and Anthropic Messages. The default model follows
// LLM_API_FORMAT (or LLM_PROTOCOL); a named preset may set apiFormat itself.
export type ApiFormat = "openai" | "anthropic";

export type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export interface ApiFormatSpec {
  key: string;
  apiFormat?: ApiFormat;
}

export const ANTHROPIC_DEFAULT_VERSION = "2023-06-01";
/** Appended to the Anthropic system prompt when the step expects a JSON object. */
export const JSON_ONLY_INSTRUCTION = "Reply with a single JSON object only, without Markdown fences or any other text.";

/** The protocol a model uses: an explicit preset field, else env for `default`, else OpenAI. */
export function resolveApiFormat(spec: ApiFormatSpec, env: NodeJS.ProcessEnv = process.env): ApiFormat {
  if (spec.apiFormat === "anthropic" || spec.apiFormat === "openai") return spec.apiFormat;
  if (spec.key === "default") {
    const raw = (env.LLM_API_FORMAT ?? env.LLM_PROTOCOL ?? "openai").trim().toLowerCase();
    if (!raw || raw === "openai" || raw === "chat_completions" || raw === "chat/completions") return "openai";
    if (raw === "anthropic" || raw === "messages") return "anthropic";
    throw new Error(`LLM_API_FORMAT must be openai or anthropic, got ${JSON.stringify(raw)}`);
  }
  return "openai";
}

export function anthropicVersion(env: NodeJS.ProcessEnv = process.env): string {
  return env.LLM_ANTHROPIC_VERSION?.trim() || ANTHROPIC_DEFAULT_VERSION;
}

function anthropicImage(url: string): Record<string, unknown> {
  const data = /^data:(image\/(?:png|jpeg|jpg|gif|webp));base64,(.+)$/i.exec(url);
  if (data) {
    const media = data[1]!.toLowerCase() === "image/jpg" ? "image/jpeg" : data[1]!.toLowerCase();
    return { type: "image", source: { type: "base64", media_type: media, data: data[2] } };
  }
  return { type: "image", source: { type: "url", url } };
}

export function toAnthropicContent(user: string | ContentPart[], userText: string): string | Array<Record<string, unknown>> {
  if (typeof user === "string") return user;
  if (Array.isArray(user)) {
    return user.map((part) => {
      if (part.type === "text") return { type: "text", text: part.text };
      return anthropicImage(part.image_url.url);
    });
  }
  return userText;
}

export function buildChatRequest(opts: {
  spec: ApiFormatSpec;
  baseUrl: string;
  apiKey: string;
  model: string;
  system: string;
  user: string | ContentPart[];
  userText: string;
  temperature: number;
  maxTokens: number;
  json?: boolean;
  jsonMode: boolean;
  extra?: Record<string, unknown>;
  env?: NodeJS.ProcessEnv;
}): { format: ApiFormat; url: string; headers: Record<string, string>; body: Record<string, unknown> } {
  const env = opts.env ?? process.env;
  const format = resolveApiFormat(opts.spec, env);
  const root = opts.baseUrl.replace(/\/$/, "");
  const wantJson = opts.jsonMode && opts.json !== false;
  if (format === "anthropic") {
    // Official and ModelHub roots usually omit /v1; if someone still includes it, do not double it.
    const anthropicRoot = root.replace(/\/v1$/i, "");
    const system = [opts.system, wantJson ? JSON_ONLY_INSTRUCTION : ""].filter((s) => s.trim()).join("\n\n");
    return {
      format,
      url: `${anthropicRoot}/v1/messages`,
      headers: {
        "content-type": "application/json",
        "anthropic-version": anthropicVersion(env),
        "x-api-key": opts.apiKey,
        authorization: `Bearer ${opts.apiKey}`,
      },
      body: {
        model: opts.model,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        ...(system ? { system } : {}),
        messages: [{ role: "user", content: toAnthropicContent(opts.user, opts.userText) }],
        ...(opts.extra ?? {}),
      },
    };
  }
  return {
    format,
    url: `${root}/chat/completions`,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${opts.apiKey}`,
    },
    body: {
      model: opts.model,
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content: typeof opts.user === "string" || Array.isArray(opts.user) ? opts.user : opts.userText },
      ],
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      ...(wantJson ? { response_format: { type: "json_object" } } : {}),
      ...(opts.extra ?? {}),
    },
  };
}

export function readChatContent(format: ApiFormat, json: Record<string, unknown>): { text: string; finishReason: string | undefined } {
  if (format === "anthropic") {
    const blocks = Array.isArray(json.content) ? json.content : [];
    const text = blocks
      .filter((b): b is { type?: string; text?: string } => !!b && typeof b === "object" && (b as { type?: string }).type === "text")
      .map((b) => b.text ?? "")
      .join("");
    const finishReason = typeof json.stop_reason === "string" ? json.stop_reason : undefined;
    return { text, finishReason };
  }
  const choice = (json.choices as Array<{ message?: { content?: string }; finish_reason?: string }> | undefined)?.[0];
  return { text: choice?.message?.content ?? "", finishReason: choice?.finish_reason };
}

export function isOutputLengthLimit(format: ApiFormat, finishReason: string | undefined): boolean {
  if (!finishReason) return false;
  return format === "anthropic" ? finishReason === "max_tokens" : finishReason === "length";
}

export function isContentFilter(finishReason: string | undefined): boolean {
  return finishReason === "content_filter" || finishReason === "sensitive";
}
