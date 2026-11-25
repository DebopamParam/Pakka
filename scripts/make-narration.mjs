// Voices the replay's narrator with Sarvam TTS: one WAV per step in web/public/replay/narration/, one line per caption. The call and update
// steps get the narrator's line followed by the recorded Sarvam call, so each step plays one clip.
// Usage: node --env-file=.env scripts/make-narration.mjs   (needs ffmpeg on PATH)
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { SarvamAIClient } from "../services/control-tower/node_modules/sarvamai/dist/esm/index.mjs";

const LINES = {
  start: ["Festive sales bring record orders, and a lot of waste. Parcels that come back, courier hubs that jam, and big carts stuck behind small ones. Pakka is smart logistics for D2C brands. It cuts wasted returns, puts high-value carts first at peak, and moves orders off a failing hub, on its own."],
  order: [
    "A new order. Aditi Kulkarni in Hubballi, fourteen ninety nine rupees, cash on delivery.",
    "Pakka sends the buyer's traits to Flagsmith. Flagsmith matches the risky first C O D segment, and that segment's override of the C O D policy flag turns on a voice check before shipping.",
  ],
  call: ["Sarvam A I calls the buyer in Hinglish."],
  reply: ["The buyer says yes, send it.", "Claude reads the intent as confirm, and the order ships."],
  jam: ["Now, trouble. Courier one's Bengaluru hub jams, and latency spikes."],
  crash: [
    "In our Kubernetes cluster, the courier one pod falls into a crash loop.",
    "NudgeBee, connected to the cluster, detects the crash loop, and its event trigger starts our reroute automation.",
  ],
  reroute: [
    "But nothing changes until a person says yes. The automation stops at an approval step, and the on-call engineer approves it in NudgeBee.",
    "Then NudgeBee's run script action calls Pakka, which rewrites the courier routing remote config through Flagsmith's admin A P I.",
    "Every in-flight order moves to courier two. No code deploy.",
  ],
  update: ["Sarvam A I tells the buyer about the new courier."],
  end: [
    "Flagsmith decides who gets C O D, and where orders go. NudgeBee watches the cluster, with a human approving every fix. Sarvam A I talks to the buyer.",
    "How it connects. Flagsmith is self-hosted in Docker on our MacBook. NudgeBee is the hosted service, connected to our Kubernetes cluster, which runs in OrbStack on the same MacBook. Claude comes through the Claude A P I, and Sarvam through its cloud A P I. Fewer returns, no stuck orders, more profit. That's Pakka.",
  ],
};
const CALLS = { call: "confirm.wav", update: "update.wav" };

const replay = new URL("../web/public/replay/", import.meta.url).pathname;
const out = replay + "narration/";
mkdirSync(out, { recursive: true });
const sarvam = new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY });

const GAP = 0.35;
const seconds = (file) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]));
const timing = {};
for (const [step, texts] of Object.entries(LINES)) {
  const parts = [];
  timing[step] = [];
  let at = 0;
  for (const [i, text] of texts.entries()) {
    const res = await sarvam.textToSpeech.convert({ text, language_code: "en-IN", model: "bulbul:v4-flash", speaker: "girish_en_documentary" });
    const line = `${out}${step}.${i}.wav`;
    writeFileSync(line, Buffer.from(res.audios[0], "base64"));
    parts.push(line);
    timing[step].push(Math.round(at * 1000));
    at += seconds(line) + GAP;
  }
  if (CALLS[step]) parts.push(replay + CALLS[step]);
  const inputs = parts.flatMap((part) => ["-i", part]);
  const chain = parts.map((_, i) => `[${i}:a]aresample=24000,aformat=channel_layouts=mono${i < texts.length ? `,apad=pad_dur=${GAP}` : ""}[a${i}]`).join(";");
  const filter = `${chain};${parts.map((_, i) => `[a${i}]`).join("")}concat=n=${parts.length}:v=0:a=1`;
  execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", filter, `${out}${step}.wav`]);
  for (const line of parts.slice(0, texts.length)) execFileSync("rm", [line]);
  console.log(step, timing[step]);
}
// When each caption starts within its step's clip, so the captions follow the voice.
writeFileSync(new URL("../web/src/narration.json", import.meta.url), JSON.stringify(timing, null, 2) + "\n");
