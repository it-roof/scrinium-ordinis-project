import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

export function ChatMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-neutral max-w-none text-[1.02rem] leading-[1.7] text-foreground",
        "prose-headings:font-heading prose-headings:font-medium prose-headings:tracking-tight prose-headings:text-foreground",
        "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
        "prose-p:my-3 prose-p:text-foreground",
        "prose-a:text-foreground prose-a:underline prose-a:underline-offset-2",
        "prose-strong:font-semibold prose-strong:text-foreground",
        "prose-li:marker:text-muted-foreground",
        "prose-pre:rounded-sm prose-pre:border prose-pre:border-border prose-pre:bg-muted/50 prose-pre:text-[0.9rem]",
        "prose-code:rounded-sm prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.9em] prose-code:font-normal prose-code:before:content-none prose-code:after:content-none",
        "prose-blockquote:border-l-foreground/20 prose-blockquote:text-muted-foreground",
        "prose-hr:border-border",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
