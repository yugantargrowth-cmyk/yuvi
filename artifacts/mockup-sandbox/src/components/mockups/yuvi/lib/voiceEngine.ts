// lib/voiceEngine.ts — Voice Interface Engine for YUVI OS
// Speech-to-Text (STT) via Web Speech API & Text-to-Speech (TTS) via SpeechSynthesis

export interface VoiceEngineConfig {
  lang?: string;
  rate?: number;
  pitch?: number;
  voiceName?: string;
}

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

let activeRecognition: any = null;

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as IWindowWithSpeech;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean("speechSynthesis" in window);
}

/**
 * Returns available system voices for text-to-speech.
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) return [];
  return window.speechSynthesis.getVoices();
}

/**
 * Initiates speech recognition session with callbacks.
 */
export function startListening(options: {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onEnd: () => void;
  lang?: string;
}): { stop: () => void } {
  if (!isSpeechRecognitionSupported()) {
    options.onError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
    options.onEnd();
    return { stop: () => {} };
  }

  const w = window as unknown as IWindowWithSpeech;
  const SpeechRecognitionClass = w.SpeechRecognition || w.webkitSpeechRecognition;

  try {
    if (activeRecognition) {
      try {
        activeRecognition.abort();
      } catch {
        // ignore
      }
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = options.lang || "en-IN";
    recognition.maxAlternatives = 1;

    activeRecognition = recognition;

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          final += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      if (final) {
        options.onTranscript(final.trim(), true);
      } else if (interim) {
        options.onTranscript(interim.trim(), false);
      }
    };

    recognition.onerror = (event: any) => {
      let msg = "Microphone error";
      if (event.error === "not-allowed") {
        msg = "Microphone access was denied. Please allow microphone permissions in browser settings.";
      } else if (event.error === "no-speech") {
        msg = "No speech was detected. Please try speaking again.";
      } else if (event.error === "network") {
        msg = "Network issue with speech recognition service.";
      } else {
        msg = `Speech recognition error: ${event.error}`;
      }
      options.onError(msg);
    };

    recognition.onend = () => {
      activeRecognition = null;
      options.onEnd();
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    options.onError(`Failed to start speech recognition: ${msg}`);
    options.onEnd();
    return { stop: () => {} };
  }
}

/**
 * Halts active listening session.
 */
export function stopListening(): void {
  if (activeRecognition) {
    try {
      activeRecognition.stop();
    } catch {
      // ignore
    }
    activeRecognition = null;
  }
}

/**
 * Synthesizes text to speech using browser SpeechSynthesis.
 */
export function speakText(
  text: string,
  options?: {
    voiceName?: string;
    rate?: number;
    pitch?: number;
    onEnd?: () => void;
    onError?: (error: string) => void;
  },
): void {
  if (!isSpeechSynthesisSupported()) {
    if (options?.onError) options.onError("Speech synthesis is not supported on this browser.");
    return;
  }

  // Cancel any existing utterance
  window.speechSynthesis.cancel();

  // Strip markdown symbols for natural speech pronunciation
  const cleanText = text
    .replace(/[#*_`~>-]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanText) {
    if (options?.onEnd) options.onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = options?.rate ?? 1.05;
  utterance.pitch = options?.pitch ?? 1.0;

  // Pick suitable voice if specified or choose English voice
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    if (options?.voiceName) {
      const match = voices.find(v => v.name === options.voiceName);
      if (match) utterance.voice = match;
    } else {
      // Prefer Indian English or modern natural English voice
      const preferred = voices.find(
        v => v.lang === "en-IN" || v.name.includes("India") || v.name.includes("Natural") || v.lang.startsWith("en"),
      );
      if (preferred) utterance.voice = preferred;
    }
  }

  utterance.onend = () => {
    if (options?.onEnd) options.onEnd();
  };

  utterance.onerror = (e) => {
    if (e.error !== "canceled" && options?.onError) {
      options.onError(`Speech synthesis error: ${e.error}`);
    }
    if (options?.onEnd) options.onEnd();
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Cancels active speech synthesis playback.
 */
export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}
