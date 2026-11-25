// Voices the replay's narrator with Sarvam TTS: one WAV per step in web/public/replay/narration/. The call and update
// steps get the narrator's line followed by the recorded Sarvam call, so each step plays one clip.
// Usage: node --env-file=.env scripts/make-narration.mjs   (needs ffmpeg on PATH)
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { SarvamAIClient } from "../services/control-tower/node_modules/sarvamai/dist/esm/index.mjs";

const LINES = {
  start: "Festive sales bring record orders, and a lot of waste. Parcels that come back, courier hubs that jam, and big carts stuck behind small ones. Pakka is smart logistics for D2C brands. It cuts wasted returns, puts high-value carts first at peak, and moves orders off a failing hub, on its own.",
  order: "A new order. Aditi Kulkarni in Hubballi, fourteen ninety nine rupees, cash on delivery. Flagsmith puts this buyer in the risky first C O D segment, so Pakka confirms by voice before shipping.",
  call: "Sarvam A I calls the buyer in Hinglish.",
  reply: "The buyer says yes, send it. Claude reads the intent as confirm, and the order ships.",
  jam: "Now, trouble. SwiftShip's Bengaluru hub jams, and latency spikes.",
  crash: "In our Kubernetes cluster, the SwiftShip pod falls into a crash loop. NudgeBee detects it, and starts the reroute runbook.",
  reroute: "On-call approves it in NudgeBee. The runbook flips the courier routing flag in Flagsmith, and every in-flight order moves to DakExpress. No code deploy.",
  update: "Sarvam A I tells the buyer about the new courier.",
  end: "Fewer returns, no stuck orders, and more profit from festive traffic. That's Pakka.",
};
const CALLS = { call: "confirm.wav", update: "update.wav" };

const replay = new URL("../web/public/replay/", import.meta.url).pathname;
const out = replay + "narration/";
mkdirSync(out, { recursive: true });
const sarvam = new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY });

for (const [step, text] of Object.entries(LINES)) {
  const res = await sarvam.textToSpeech.convert({ text, language_code: "en-IN", model: "bulbul:v4-flash", speaker: "girish_en_documentary" });
  const line = `${out}${step}.line.wav`;
  writeFileSync(line, Buffer.from(res.audios[0], "base64"));
  const inputs = CALLS[step] ? ["-i", line, "-i", replay + CALLS[step]] : ["-i", line];
  const filter = CALLS[step]
    ? "[0:a]aresample=24000,aformat=channel_layouts=mono,apad=pad_dur=0.4[a];[1:a]aresample=24000,aformat=channel_layouts=mono[b];[a][b]concat=n=2:v=0:a=1"
    : "aresample=24000,aformat=channel_layouts=mono";
  execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", filter, `${out}${step}.wav`]);
  execFileSync("rm", [line]);
  console.log(step, "ok");
}
