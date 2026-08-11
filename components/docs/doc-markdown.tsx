import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

type DocMarkdownProps = {
  content: string;
  className?: string;
};

export function DocMarkdown({ content, className }: DocMarkdownProps) {
  return (
    <div
      className={cn(
        "prose prose-slate max-w-none dark:prose-invert",
        "prose-headings:font-heading prose-headings:font-medium prose-headings:tracking-tight",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-pre:rounded-xl prose-pre:bg-muted/60",
        "prose-img:rounded-xl prose-img:border prose-img:border-border/70",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const isInternal = href?.startsWith("/");

            if (isInternal && href) {
              return (
                <Link href={href} className="text-primary hover:underline">
                  {children}
                </Link>
              );
            }

            return (
              <a href={href} target="_blank" rel="noreferrer noopener">
                {children}
              </a>
            );
          },
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={alt ?? ""} className="rounded-xl border border-border/70" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
