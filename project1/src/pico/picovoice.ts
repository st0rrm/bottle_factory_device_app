import { PorcupineWorker, PorcupineDetection } from "@picovoice/porcupine-web";
import { WebVoiceProcessor } from "@picovoice/web-voice-processor";

// @ts-ignore - Vite env variable
const ACCESS_KEY = import.meta.env.VITE_PV_ACCESS_KEY as string;

const KEYWORDS = [
  { label: "takeout", publicPath: "/pico/takeout_ko.ppn", sensitivity: 0.6 },
  { label: "pojang", publicPath: "/pico/pojang_ko.ppn", sensitivity: 0.6 },
];

let isListening = false;
let porcupine: PorcupineWorker | null = null;

export async function startWakeword(onDetect: (index: number) => void) {
  if (!ACCESS_KEY) throw new Error("Missing VITE_PV_ACCESS_KEY");
  if (isListening) return; // Already listening

  // @ts-ignore - PorcupineWorker API
  porcupine = await PorcupineWorker.create(
    ACCESS_KEY,
    KEYWORDS,
    (detection: PorcupineDetection) => {
      console.log("Porcupine detection:", detection);
      onDetect(detection.index);
    },
    { publicPath: "/pico/porcupine_worker.js" }
  );

  // @ts-ignore - WebVoiceProcessor API
  await WebVoiceProcessor.subscribe(porcupine);
  isListening = true;
}

export async function stopWakeword() {
  try {
    if (!isListening) return;

    // @ts-ignore - WebVoiceProcessor API
    await WebVoiceProcessor.unsubscribe(porcupine);

    if (porcupine) {
      await porcupine.release();
      porcupine = null;
    }

    isListening = false;
  } catch (e) {
    console.error("Error stopping wake word:", e);
  }
}
