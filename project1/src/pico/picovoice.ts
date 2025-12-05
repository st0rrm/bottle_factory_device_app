import { PorcupineWorker, PorcupineDetection } from "@picovoice/porcupine-web";
import { WebVoiceProcessor } from "@picovoice/web-voice-processor";

// Import base64-encoded WASM files
// @ts-ignore
import porcupineWasm from "./porcupine_wasm_base64.js";
// @ts-ignore
import porcupineWasmSimd from "./porcupine_wasm_simd_base64.js";

// Import base64-encoded model and keyword files
// @ts-ignore
import porcupineParamsKo from "./porcupine_params_ko_base64.js";
// @ts-ignore
import takeoutKo from "./takeout_ko_base64.js";
// @ts-ignore
import pojangKo from "./pojang_ko_base64.js";

// Set WASM files before creating PorcupineWorker
PorcupineWorker.setWasm(porcupineWasm);
PorcupineWorker.setWasmSimd(porcupineWasmSimd);

// @ts-ignore - Vite env variable
const ACCESS_KEY = import.meta.env.VITE_PC_ACCESS_KEY as string;

const KEYWORDS = [
  { label: "takeout", base64: takeoutKo, sensitivity: 0.6 },
  { label: "pojang", base64: pojangKo, sensitivity: 0.6 },
];

let isListening = false;
let porcupine: PorcupineWorker | null = null;

export async function startWakeword(onDetect: (index: number) => void) {
  if (!ACCESS_KEY) throw new Error("Missing VITE_PC_ACCESS_KEY");
  if (isListening) return; // Already listening

  console.log("[Picovoice] Starting initialization...");
  console.log("[Picovoice] ACCESS_KEY:", ACCESS_KEY.substring(0, 10) + "...");
  console.log("[Picovoice] KEYWORDS:", KEYWORDS);
  console.log("[Picovoice] Model base64 length:", porcupineParamsKo.length);

  // @ts-ignore - PorcupineWorker API
  porcupine = await PorcupineWorker.create(
    ACCESS_KEY,
    KEYWORDS,
    (detection: PorcupineDetection) => {
      console.log("Porcupine detection:", detection);
      onDetect(detection.index);
    },
    {
      base64: porcupineParamsKo,
      forceWrite: true, // Force re-write to IndexedDB
      version: 1,
    },
    {
      processErrorCallback: (error: Error) => {
        console.error("[Picovoice] Process error:", error);
      },
    }
  );

  console.log("[Picovoice] Initialization successful!");

  // @ts-ignore - WebVoiceProcessor API
  await WebVoiceProcessor.subscribe(porcupine);
  isListening = true;

  console.log("[Picovoice] Wake word detection started!");
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
