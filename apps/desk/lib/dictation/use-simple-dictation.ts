"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type SpeechRecognitionResultLike = {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
};

type SpeechRecognitionEventLike = {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function stopRecognition(recognition: SpeechRecognitionLike | null) {
  if (!recognition) {
    return;
  }
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
  try {
    recognition.abort?.() ?? recognition.stop();
  } catch {
    try {
      recognition.stop();
    } catch {
      // ignore
    }
  }
}

function appendTranscript(current: string, chunk: string): string {
  const trimmed = chunk.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return current;
  }
  if (!current.trim()) {
    return trimmed;
  }
  const needsSpace = !/\s$/.test(current);
  return `${current}${needsSpace ? " " : ""}${trimmed}`;
}

/**
 * Diktat-Session für ein Textfeld: Aufnahme sammelt Text,
 * Übernehmen/Verwerfen entscheidet der Aufrufer.
 */
export function useSimpleDictation() {
  const [listening, setListening] = useState(false);
  const [sessionText, setSessionText] = useState("");
  const [interim, setInterim] = useState("");
  const sessionTextRef = useRef("");
  const interimRef = useRef("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const sessionRef = useRef(0);
  const restartTimerRef = useRef<number | null>(null);
  const wantListeningRef = useRef(false);

  const syncSessionText = useCallback((next: string) => {
    sessionTextRef.current = next;
    setSessionText(next);
  }, []);

  const syncInterim = useCallback((next: string) => {
    interimRef.current = next;
    setInterim(next);
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const discardSession = useCallback(() => {
    wantListeningRef.current = false;
    clearRestartTimer();
    sessionRef.current += 1;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    stopRecognition(recognition);
    setListening(false);
    syncInterim("");
    syncSessionText("");
  }, [clearRestartTimer, syncInterim, syncSessionText]);

  const stopListening = useCallback((): string => {
    wantListeningRef.current = false;
    clearRestartTimer();
    sessionRef.current += 1;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    stopRecognition(recognition);
    setListening(false);
    const pendingInterim = interimRef.current;
    if (pendingInterim.trim()) {
      syncSessionText(
        appendTranscript(sessionTextRef.current, pendingInterim)
      );
    }
    syncInterim("");
    return sessionTextRef.current;
  }, [clearRestartTimer, syncInterim, syncSessionText]);

  const startListening = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      toast.error("Diktieren wird in diesem Browser nicht unterstützt.");
      return;
    }

    clearRestartTimer();
    const previous = recognitionRef.current;
    recognitionRef.current = null;
    stopRecognition(previous);

    const session = sessionRef.current + 1;
    sessionRef.current = session;
    wantListeningRef.current = true;
    syncInterim("");

    const begin = () => {
      if (sessionRef.current !== session || !wantListeningRef.current) {
        return;
      }

      const recognition = new SpeechRecognitionCtor();
      recognition.lang = "de-DE";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        if (sessionRef.current !== session) {
          return;
        }
        let finalChunk = "";
        let interimChunk = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) {
            finalChunk += result[0].transcript;
          } else {
            interimChunk += result[0].transcript;
          }
        }
        if (finalChunk) {
          syncSessionText(
            appendTranscript(sessionTextRef.current, finalChunk)
          );
        }
        syncInterim(interimChunk.replace(/\s+/g, " ").trim());
      };

      recognition.onerror = (event) => {
        if (sessionRef.current !== session) {
          return;
        }
        if (event.error === "not-allowed") {
          toast.error("Mikrofon-Zugriff wurde verweigert.");
          wantListeningRef.current = false;
          recognitionRef.current = null;
          setListening(false);
          syncInterim("");
          return;
        }
        if (event.error === "aborted") {
          return;
        }
        if (event.error === "no-speech") {
          return;
        }
        toast.error("Diktieren fehlgeschlagen.");
        wantListeningRef.current = false;
        recognitionRef.current = null;
        setListening(false);
        syncInterim("");
      };

      recognition.onend = () => {
        if (sessionRef.current !== session) {
          return;
        }
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
        }
        const pending = interimRef.current;
        if (pending.trim()) {
          syncSessionText(
            appendTranscript(sessionTextRef.current, pending)
          );
        }
        syncInterim("");
        setListening(false);

        // Chrome beendet oft nach Pausen — Session weiterlaufen lassen.
        if (wantListeningRef.current) {
          clearRestartTimer();
          restartTimerRef.current = window.setTimeout(() => {
            if (sessionRef.current === session && wantListeningRef.current) {
              begin();
            }
          }, 220);
        }
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
        setListening(true);
      } catch {
        toast.error("Diktieren konnte nicht gestartet werden.");
        wantListeningRef.current = false;
        setListening(false);
        recognitionRef.current = null;
      }
    };

    restartTimerRef.current = window.setTimeout(begin, previous ? 180 : 0);
  }, [clearRestartTimer, syncInterim, syncSessionText]);

  const toggleListening = useCallback(() => {
    if (listening || recognitionRef.current || wantListeningRef.current) {
      stopListening();
      return;
    }
    startListening();
  }, [listening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      clearRestartTimer();
      sessionRef.current += 1;
      stopRecognition(recognitionRef.current);
      recognitionRef.current = null;
    };
  }, [clearRestartTimer]);

  const liveText = interim
    ? appendTranscript(sessionText, interim)
    : sessionText;
  const hasSession = listening || sessionText.length > 0 || interim.length > 0;

  return {
    listening,
    interim,
    sessionText,
    liveText,
    hasSession,
    startListening,
    stopListening,
    discardSession,
    toggleListening,
  };
}

export function mergeDictationIntoValue(
  current: string,
  dictated: string
): string {
  return appendTranscript(current, dictated);
}
