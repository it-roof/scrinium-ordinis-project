"use client";

import { MenuIcon } from "lucide-react";
import { useEffect } from "react";

import { useMattersSession } from "@/components/app/matters-shell";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatThread } from "@/components/chat/chat-thread";

export function ChatWorkspace({
  matterId = null,
  hideHeader = false,
}: {
  matterId?: string | null;
  hideHeader?: boolean;
}) {
  const {
    active,
    activeMatter,
    firstName,
    draft,
    busy,
    composerRef,
    threadRef,
    setDraft,
    openSidebar,
    loadScope,
    send,
    stop,
    createLetter,
    setLetter,
  } = useMattersSession();

  useEffect(() => {
    if (hideHeader) return;
    void loadScope(matterId);
  }, [hideHeader, loadScope, matterId]);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {hideHeader ? null : (
        <header className="flex h-14 shrink-0 items-center gap-3 px-3 sm:px-5">
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted lg:hidden"
            onClick={openSidebar}
            aria-label="Menü öffnen"
          >
            <MenuIcon className="size-4" />
          </button>
          {active?.title || activeMatter?.title ? (
            <p className="truncate font-heading text-sm tracking-tight">
              {active?.title ?? activeMatter?.title}
            </p>
          ) : null}
        </header>
      )}

      <div ref={threadRef} className="flex-1 overflow-y-auto">
        <ChatThread
          messages={active?.messages ?? []}
          firstName={firstName}
          matterTitle={activeMatter?.title}
          letter={active?.letter}
          busy={busy}
          onCreateLetter={createLetter}
          onLetterChange={setLetter}
        />
      </div>

      <ChatComposer
        draft={draft}
        busy={busy}
        composerRef={composerRef}
        onDraftChange={setDraft}
        onSend={send}
        onStop={stop}
      />
    </section>
  );
}
