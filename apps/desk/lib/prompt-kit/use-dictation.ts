"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  addSectionToSession,
  applySpeechResult,
  finalizeSpeechInterims,
  flattenBlocks,
  type DictationBlock,
} from "@/lib/prompt-kit/dictation";

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

/**
 * Diktat-Session: Abschnitte + Sprache als Blöcke.
 * Übernehmen/Verwerfen gilt für die gesamte Session.
 */
export function usePromptKitDictation() {
  const [listening, setListening] = useState(false);
  const [blocks, setBlocks] = useState<DictationBlock[]>([]);
  const blocksRef = useRef<DictationBlock[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const sessionRef = useRef(0);
  const restartTimerRef = useRef<number | null>(null);

  const syncBlocks = useCallback((next: DictationBlock[]) => {
    blocksRef.current = next;
    setBlocks(next);
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback((): DictationBlock[] => {
    clearRestartTimer();
    sessionRef.current += 1;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    stopRecognition(recognition);
    setListening(false);
    const finalized = finalizeSpeechInterims(blocksRef.current);
    syncBlocks(finalized);
    return finalized;
  }, [clearRestartTimer, syncBlocks]);

  const discardSession = useCallback(() => {
    clearRestartTimer();
    sessionRef.current += 1;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    stopRecognition(recognition);
    setListening(false);
    syncBlocks([]);
  }, [clearRestartTimer, syncBlocks]);

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
    setListening(false);

    const session = sessionRef.current + 1;
    sessionRef.current = session;

    const begin = () => {
      if (sessionRef.current !== session) {
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
        syncBlocks(
          applySpeechResult(blocksRef.current, finalChunk, interimChunk)
        );
      };

      recognition.onerror = (event) => {
        if (sessionRef.current !== session) {
          return;
        }
        if (event.error === "not-allowed") {
          toast.error("Mikrofon-Zugriff wurde verweigert.");
        } else if (
          event.error !== "aborted" &&
          event.error !== "no-speech"
        ) {
          toast.error("Diktieren fehlgeschlagen.");
        }
        recognitionRef.current = null;
        setListening(false);
        syncBlocks(finalizeSpeechInterims(blocksRef.current));
      };

      recognition.onend = () => {
        if (sessionRef.current !== session) {
          return;
        }
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
          setListening(false);
          syncBlocks(finalizeSpeechInterims(blocksRef.current));
        }
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
        setListening(true);
      } catch {
        toast.error("Diktieren konnte nicht gestartet werden.");
        setListening(false);
        recognitionRef.current = null;
      }
    };

    restartTimerRef.current = window.setTimeout(begin, previous ? 180 : 0);
  }, [clearRestartTimer, syncBlocks]);

  const toggleListening = useCallback(() => {
    if (listening || recognitionRef.current) {
      stopListening();
      return;
    }
    startListening();
  }, [listening, startListening, stopListening]);

  const addSection = useCallback(
    (insert: string) => {
      const keepListening = listening || Boolean(recognitionRef.current);

      // Zuerst Mic stoppen — sonst ballert Chrome das alte Transkript nochmal rein
      if (keepListening) {
        clearRestartTimer();
        sessionRef.current += 1;
        const recognition = recognitionRef.current;
        recognitionRef.current = null;
        stopRecognition(recognition);
        setListening(false);
      }

      const sealed = finalizeSpeechInterims(blocksRef.current);
      syncBlocks(addSectionToSession(sealed, insert));

      if (keepListening) {
        startListening();
      }
    },
    [
      clearRestartTimer,
      listening,
      startListening,
      syncBlocks,
    ]
  );

  useEffect(() => {
    return () => {
      clearRestartTimer();
      sessionRef.current += 1;
      stopRecognition(recognitionRef.current);
      recognitionRef.current = null;
    };
  }, [clearRestartTimer]);

  const hasSession = listening || blocks.length > 0;
  const sessionText = flattenBlocks(blocks);

  return {
    listening,
    blocks,
    hasSession,
    sessionText,
    startListening,
    stopListening,
    toggleListening,
    discardSession,
    addSection,
  };
}
