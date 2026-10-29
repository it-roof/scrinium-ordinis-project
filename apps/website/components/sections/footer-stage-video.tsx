"use client";

import { useEffect, useRef, type CSSProperties } from "react";

type FooterStageVideoProps = {
  src: string;
  className?: string;
  style?: CSSProperties;
  /** Wiedergabegeschwindigkeit (Default 1 = normal) */
  playbackRate?: number;
};

/** Footer-Stage-Video: Loop mit konfigurierbarer playbackRate. */
export function FooterStageVideo({
  src,
  className,
  style,
  playbackRate = 1,
}: FooterStageVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.playbackRate = playbackRate;
    const onPlay = () => {
      el.playbackRate = playbackRate;
    };
    el.addEventListener("play", onPlay);
    return () => el.removeEventListener("play", onPlay);
  }, [playbackRate, src]);

  return (
    <video
      ref={ref}
      data-slot="background-media-video"
      className={className}
      style={style}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
    />
  );
}
