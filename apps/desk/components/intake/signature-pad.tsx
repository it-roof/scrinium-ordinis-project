"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export function SignaturePad({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  function resizeCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width < 1 || height < 1) return;

    const prev = valueRef.current;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1b1b1a";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    if (prev) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = prev;
    }
  }

  useEffect(() => {
    resizeCanvas();
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    canvasRef.current?.setPointerCapture(e.pointerId);
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    onChange("");
  }

  return (
    <div className={cn("space-y-2", className)}>
      <canvas
        ref={canvasRef}
        className="lab-intake-sig"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
      <button type="button" className="b-btn b-btn-ghost" onClick={clear}>
        Unterschrift löschen
      </button>
    </div>
  );
}
