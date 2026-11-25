// Sarvam speech (TTS + STT) and intent parsing (Azure-hosted Claude, keyword fallback).
import { SarvamAIClient } from "sarvamai";

const sarvam = process.env.SARVAM_API_KEY ? new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY }) : null;

function errorLabel(err) {
  return err?.statusCode ? `HTTP ${err.statusCode}` : err?.message || String(err);
}

// Sarvam bills per character, and demo takes replay the same lines, so each text is synthesised once.
const spoken = new Map();

export async function speak(text) {
  if (!sarvam) return { audio: null, simulated: true, error: "SARVAM_API_KEY not set" };
  if (spoken.has(text)) return { audio: spoken.get(text), simulated: false };
  try {
    const res = await sarvam.textToSpeech.convert({
      text,
      language_code: "hi-IN",
      model: "bulbul:v4-flash",
      speaker: "shubh_hi_customer",
    });
    const audio = res.audios?.[0] ?? null;
    if (audio) spoken.set(text, audio);
    return { audio, simulated: false };
  } catch (err) {
    return { audio: null, simulated: true, error: `Sarvam TTS failed: ${errorLabel(err)}` };
  }
}

// Returns {transcript} or {error}; the caller turns an error into a 503 asking for the typed reply.
export async function transcribe(wav) {
  if (!sarvam) return { error: "SARVAM_API_KEY not set" };
  try {
    const file = new File([wav], "reply.wav", { type: "audio/wav" });
    const res = await sarvam.speechToText.transcribe({ file, model: "saaras:v4", mode: "codemix" });
    return { transcript: res.transcript ?? "" };
  } catch (err) {
    return { error: `Sarvam STT failed: ${errorLabel(err)}` };
  }
}

const INTENTS = ["confirm", "cancel", "reschedule", "unclear"];
const KEYWORDS = [
  ["reschedule", ["kal", "baad", "later", "reschedule", "parso", "agle"]],
  ["cancel", ["nahi", "nahin", "na", "cancel", "mat", "no"]],
  ["confirm", ["haan", "haa", "ha", "han", "yes", "theek", "thik", "confirm", "ok", "okay", "bilkul", "हाँ", "हां", "ठीक"]],
];

export function keywordIntent(text) {
  const words = text.toLowerCase().split(/[^\p{L}\p{M}]+/u).filter(Boolean);
  for (const [intent, keys] of KEYWORDS) if (words.some((w) => keys.includes(w))) return intent;
  return "unclear";
}

async function claudeIntent(text) {
  const res = await fetch(`${process.env.AZURE_ANTHROPIC_ENDPOINT.replace(/\/$/, "")}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.AZURE_ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-5-5",
      max_tokens: 400, // Opus thinks first; a tiny budget leaves no room for the answer.
      system:
        "You classify an Indian buyer's Hinglish reply to a Cash-on-Delivery order confirmation call. " +
        "Answer with exactly one lowercase word: confirm, cancel, reschedule or unclear.",
      messages: [{ role: "user", content: text }],
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const word = (data.content?.find((c) => c.type === "text")?.text || "").trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!INTENTS.includes(word)) throw new Error(`unexpected answer "${word}"`);
  return word;
}

export async function parseIntent(text) {
  if (process.env.AZURE_ANTHROPIC_ENDPOINT && process.env.AZURE_ANTHROPIC_KEY) {
    try {
      return { intent: await claudeIntent(text), intent_source: "claude" };
    } catch (err) {
      return { intent: keywordIntent(text), intent_source: "keywords", intent_error: `Claude failed: ${err.message}` };
    }
  }
  return { intent: keywordIntent(text), intent_source: "keywords" };
}
