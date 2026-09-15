"use client";

import { useEffect, useState } from "react";

const LEVEL_BOOST = 1.8;
const SILENCE_FLOOR = 0.08;

function createIdleLevels(barCount: number): number[] {
  return Array.from({ length: barCount }, () => SILENCE_FLOOR);
}

/**
 * Scrollende Mikrofon-Tonspur im Claude-Stil:
 * neuer Pegel rechts, Historie nach links, sqrt-Kurve für ruhige Sprache.
 */
export function useAudioWaveform(
  active: boolean,
  barCount = 24
): number[] {
  const [levels, setLevels] = useState(() => createIdleLevels(barCount));

  useEffect(() => {
    if (!active) {
      setLevels(createIdleLevels(barCount));
      return;
    }

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    const history = createIdleLevels(barCount);

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
          video: false,
        });
      } catch {
        if (!cancelled) {
          setLevels(createIdleLevels(barCount));
        }
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const AudioContextCtor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextCtor) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      audioContext = new AudioContextCtor();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      const data = new Uint8Array(analyser.fftSize);
      let lastPush = 0;
      const pushEveryMs = 45;
      let smoothed = SILENCE_FLOOR;

      const tick = (now: number) => {
        if (cancelled) {
          return;
        }

        analyser.getByteTimeDomainData(data);

        let sumSquares = 0;
        for (let i = 0; i < data.length; i += 1) {
          const sample = ((data[i] ?? 128) - 128) / 128;
          sumSquares += sample * sample;
        }
        const rms = Math.sqrt(sumSquares / data.length);
        // Claude: sqrt-Kurve + Boost, damit normale Sprache die volle Höhe nutzt
        const raw = Math.min(1, Math.sqrt(Math.min(rms * 6, 1)));
        const target = Math.min(raw * LEVEL_BOOST, 1);
        smoothed = smoothed * 0.55 + target * 0.45;
        const level = Math.max(SILENCE_FLOOR, smoothed);

        if (now - lastPush >= pushEveryMs) {
          lastPush = now;
          history.shift();
          history.push(level);
          setLevels([...history]);
        }

        rafId = window.requestAnimationFrame(tick);
      };

      if (audioContext.state === "suspended") {
        await audioContext.resume().catch(() => undefined);
      }
      if (!cancelled) {
        rafId = window.requestAnimationFrame(tick);
      }
    }

    void start();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      void audioContext?.close().catch(() => undefined);
      audioContext = null;
    };
  }, [active, barCount]);

  return levels;
}
