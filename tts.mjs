import { writeFileSync } from "node:fs";
import { SarvamAIClient } from "sarvamai";

process.loadEnvFile(new URL(".env", import.meta.url));

const client = new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY });

const response = await client.textToSpeech.convert({
  text: "आपका ₹501 सुरक्षित है। बैंक थोड़ा धीमा है, कृपया दोबारा भुगतान न करें।",
  language_code: "hi-IN",
  model: "bulbul:v4-flash",
  speaker: "shubh_hi_customer",
});

const out = new URL("output.wav", import.meta.url);
writeFileSync(out, Buffer.from(response.audios[0], "base64"));
console.log(`request_id: ${response.request_id}`);
console.log(`saved ${out.pathname}`);
