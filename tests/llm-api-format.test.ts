// The default model stays on OpenAI Chat Completions unless LLM_API_FORMAT (or a preset apiFormat)
// selects Anthropic Messages. These checks cover the request URL, headers, body and response parsing.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  JSON_ONLY_INSTRUCTION,
  buildChatRequest,
  isOutputLengthLimit,
  readChatContent,
  resolveApiFormat,
  toAnthropicContent,
} from "@aihot/backend/providers/llm-format";

const openaiSpec = { key: "default" as const };
const anthropicPreset = { key: "named-claude", apiFormat: "anthropic" as const };
const common = {
  baseUrl: "https://example.test/v1/",
  apiKey: "test-key",
  model: "one-model",
  system: "Be precise.",
  user: "Give JSON.",
  userText: "Give JSON.",
  temperature: 0.2,
  maxTokens: 512,
  jsonMode: true,
  extra: { thinking: { type: "disabled" } },
};

test("default format is OpenAI when the env is unset or openai", () => {
  assert.equal(resolveApiFormat(openaiSpec, {}), "openai");
  assert.equal(resolveApiFormat(openaiSpec, { LLM_API_FORMAT: "openai" }), "openai");
  assert.equal(resolveApiFormat(openaiSpec, { LLM_PROTOCOL: "chat_completions" }), "openai");
});

test("LLM_API_FORMAT=anthropic selects Messages; a named preset can too", () => {
  assert.equal(resolveApiFormat(openaiSpec, { LLM_API_FORMAT: "anthropic" }), "anthropic");
  assert.equal(resolveApiFormat(openaiSpec, { LLM_PROTOCOL: "messages" }), "anthropic");
  assert.equal(resolveApiFormat(anthropicPreset, { LLM_API_FORMAT: "openai" }), "anthropic");
  assert.equal(resolveApiFormat({ key: "deepseek-flash" }, { LLM_API_FORMAT: "anthropic" }), "openai");
});

test("an unknown LLM_API_FORMAT is rejected", () => {
  assert.throws(() => resolveApiFormat(openaiSpec, { LLM_API_FORMAT: "grpc" }), /must be openai or anthropic/);
});

test("OpenAI request keeps /chat/completions, Bearer and response_format", () => {
  const call = buildChatRequest({ ...common, spec: openaiSpec, env: {} });
  assert.equal(call.format, "openai");
  assert.equal(call.url, "https://example.test/v1/chat/completions");
  assert.equal(call.headers.authorization, "Bearer test-key");
  assert.equal(call.headers["x-api-key"], undefined);
  assert.deepEqual(call.body.messages, [
    { role: "system", content: "Be precise." },
    { role: "user", content: "Give JSON." },
  ]);
  assert.deepEqual(call.body.response_format, { type: "json_object" });
  assert.equal(call.body.max_tokens, 512);
  assert.deepEqual(call.body.thinking, { type: "disabled" });
});

test("Anthropic request uses /v1/messages, official headers plus Bearer, and Messages body", () => {
  const call = buildChatRequest({
    ...common,
    spec: openaiSpec,
    env: { LLM_API_FORMAT: "anthropic", LLM_ANTHROPIC_VERSION: "2023-06-01" },
  });
  assert.equal(call.format, "anthropic");
  assert.equal(call.url, "https://example.test/v1/messages");
  assert.equal(call.headers["content-type"], "application/json");
  assert.equal(call.headers["anthropic-version"], "2023-06-01");
  assert.equal(call.headers["x-api-key"], "test-key");
  assert.equal(call.headers.authorization, "Bearer test-key");
  assert.equal(call.body.system, `Be precise.\n\n${JSON_ONLY_INSTRUCTION}`);
  assert.deepEqual(call.body.messages, [{ role: "user", content: "Give JSON." }]);
  assert.equal(call.body.response_format, undefined);
  assert.equal(call.body.max_tokens, 512);
  assert.deepEqual(call.body.thinking, { type: "disabled" });
});

test("Anthropic JSON instruction is omitted when json mode is off", () => {
  const call = buildChatRequest({
    ...common,
    spec: anthropicPreset,
    jsonMode: false,
    env: {},
  });
  assert.equal(call.body.system, "Be precise.");
});

test("Anthropic response parsing joins text blocks and ignores thinking", () => {
  const { text, finishReason } = readChatContent("anthropic", {
    content: [
      { type: "thinking", thinking: "let me think" },
      { type: "text", text: "{\"ok\":" },
      { type: "text", text: "true}" },
    ],
    stop_reason: "end_turn",
  });
  assert.equal(text, "{\"ok\":true}");
  assert.equal(finishReason, "end_turn");
  assert.equal(isOutputLengthLimit("anthropic", "max_tokens"), true);
  assert.equal(isOutputLengthLimit("openai", "length"), true);
  assert.equal(isOutputLengthLimit("anthropic", "end_turn"), false);
});

test("OpenAI response parsing still reads choices[0].message.content", () => {
  const { text, finishReason } = readChatContent("openai", {
    choices: [{ message: { content: "{\"ok\":true}" }, finish_reason: "stop" }],
  });
  assert.equal(text, "{\"ok\":true}");
  assert.equal(finishReason, "stop");
});

test("Anthropic image parts are mapped from OpenAI image_url", () => {
  const content = toAnthropicContent(
    [
      { type: "text", text: "see" },
      { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
      { type: "image_url", image_url: { url: "https://example.test/a.png" } },
    ],
    "",
  );
  assert.deepEqual(content, [
    { type: "text", text: "see" },
    { type: "image", source: { type: "base64", media_type: "image/png", data: "abc" } },
    { type: "image", source: { type: "url", url: "https://example.test/a.png" } },
  ]);
});

test("Anthropic base URLs already ending in /v1 do not double the prefix", () => {
  const call = buildChatRequest({
    ...common,
    spec: anthropicPreset,
    baseUrl: "https://aidp.example/api/modelhub/online/anthropic/v1/",
    env: {},
  });
  assert.equal(call.url, "https://aidp.example/api/modelhub/online/anthropic/v1/messages");
});
