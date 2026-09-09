/**
 * Boundary between question UI and whichever transcription provider backs
 * it. The browser's Web Speech API is the only implementation today; a
 * server-side or third-party provider could implement the same interface
 * later without any question component changing.
 */
export interface VoiceTranscriptionAdapter {
  isSupported(): boolean;
  start(handlers: {
    onResult: (transcript: string) => void;
    onError: (reason: string) => void;
    onEnd: () => void;
  }): void;
  stop(): void;
}

interface SpeechRecognitionResultLike {
  transcript: string;
}

interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const withSpeech = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return (
    withSpeech.SpeechRecognition ?? withSpeech.webkitSpeechRecognition ?? null
  );
}

/** Wraps the browser's native `SpeechRecognition` behind the adapter interface. */
export class WebSpeechAdapter implements VoiceTranscriptionAdapter {
  private recognition: SpeechRecognitionLike | null = null;

  isSupported(): boolean {
    return getConstructor() !== null;
  }

  start(handlers: {
    onResult: (transcript: string) => void;
    onError: (reason: string) => void;
    onEnd: () => void;
  }): void {
    const Recognition = getConstructor();
    if (!Recognition) {
      handlers.onError("unsupported");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) handlers.onResult(transcript);
    };
    recognition.onerror = (event) => {
      handlers.onError(event.error);
    };
    recognition.onend = () => {
      handlers.onEnd();
    };

    this.recognition = recognition;
    recognition.start();
  }

  stop(): void {
    this.recognition?.stop();
  }
}
