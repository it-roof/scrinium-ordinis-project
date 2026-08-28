"use client";

import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import { segmentTextWithPlaceholders } from "@/lib/letters/placeholders";
import { cn } from "@/lib/utils";

const placeholderMarkClass =
  "m-0 rounded-[2px] border-0 bg-amber-200 p-0 text-inherit box-decoration-clone";

const bodyTypeClass =
  "box-border w-full whitespace-pre-wrap break-words border-0 p-0 font-sans text-[15px] leading-[1.625] tracking-normal";

function PlaceholderHighlightedText({
  text,
  trailingNewline = false,
}: {
  text: string;
  trailingNewline?: boolean;
}) {
  const segments = useMemo(() => segmentTextWithPlaceholders(text), [text]);

  if (segments.length === 0 && !text) {
    return trailingNewline ? "\u00a0" : null;
  }

  return (
    <>
      {segments.map((segment, index) =>
        segment.kind === "placeholder" ? (
          <mark key={`${segment.name}-${index}`} className={placeholderMarkClass}>
            {segment.value}
          </mark>
        ) : (
          <span key={`text-${index}`}>{segment.value}</span>
        )
      )}
      {trailingNewline ? "\n" : null}
    </>
  );
}

type PlaceholderHighlightInputProps = {
  id: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function PlaceholderHighlightInput({
  id,
  value,
  disabled,
  onChange,
  placeholder,
  className,
}: PlaceholderHighlightInputProps) {
  return (
    <div className="relative min-w-0 flex-1">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre py-1 text-sm leading-normal"
        aria-hidden
      >
        <PlaceholderHighlightedText text={value} />
      </div>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          className,
          "relative bg-transparent text-transparent caret-foreground selection:bg-primary/20"
        )}
      />
    </div>
  );
}

type PlaceholderHighlightTextareaProps = {
  id: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
};

export function PlaceholderHighlightTextarea({
  id,
  value,
  disabled,
  onChange,
  placeholder,
  minRows = 12,
}: PlaceholderHighlightTextareaProps) {
  const minHeight = `calc(${minRows} * 1.625 * 15px)`;

  return (
    <div className="relative w-full" style={{ minHeight }}>
      {/* Unsichtbarer Sizer — bestimmt die Höhe */}
      <div
        className={cn(bodyTypeClass, "invisible")}
        style={{ minHeight }}
        aria-hidden
      >
        <PlaceholderHighlightedText text={value} trailingNewline />
      </div>

      {/* Gelbe Platzhalter-Hervorhebung */}
      <div
        className={cn(bodyTypeClass, "pointer-events-none absolute inset-0 text-foreground")}
        aria-hidden
      >
        <PlaceholderHighlightedText text={value} trailingNewline />
      </div>

      {/* Eingabe — gleiche Typografie wie Overlay, Text transparent */}
      <textarea
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        spellCheck
        className={cn(
          bodyTypeClass,
          "absolute inset-0 resize-none overflow-hidden bg-transparent text-transparent caret-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 selection:bg-primary/20"
        )}
      />
    </div>
  );
}
