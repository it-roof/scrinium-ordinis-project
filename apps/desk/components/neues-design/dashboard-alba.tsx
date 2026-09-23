import {
  LAB_FUNCTIONS,
  LabFunctionIcon,
} from "@/components/neues-design/lab-functions";

const NAV = [
  { label: "Übersicht", active: true },
  { label: "Meine Aufgaben", active: false },
  { label: "Zuweisen", active: false },
  { label: "Akten", active: false },
  { label: "Mandanten", active: false },
  { label: "Analyse", active: false },
  { label: "Prompts", active: false },
  { label: "Notizen", active: false },
] as const;

/** ALBA · Manrope — Rundungen wie Referenz-Screenshot */
export function DashboardAlba() {
  return (
    <div className="brand-lab-root brand-alba brand-alba-manrope">
      <div className="brand-lab-shell">
        <aside
          className="hidden w-[17rem] shrink-0 flex-col border-r px-4 py-8 md:flex"
          style={{
            background: "var(--b-bg-elev)",
            borderColor: "var(--b-line)",
          }}
        >
          <div className="flex items-center gap-3 px-2 pt-1">
            <span
              className="b-display flex size-10 items-center justify-center rounded-full text-[1.15rem]"
              style={{
                background: "var(--b-soft)",
                color: "var(--b-accent)",
              }}
            >
              A
            </span>
            <div>
              <p className="b-display text-[1.25rem] leading-none">Alba</p>
              <p className="b-meta mt-1">Quiet desk</p>
            </div>
          </div>
          <nav className="mt-9 flex flex-1 flex-col gap-1 px-0.5">
            {NAV.map((item) => (
              <span
                key={item.label}
                className="rounded-full px-3.5 py-2.5 text-[0.9375rem]"
                style={
                  item.active
                    ? {
                        background: "var(--b-soft)",
                        color: "var(--b-ink)",
                        fontWeight: 600,
                      }
                    : {
                        color: "var(--b-muted)",
                        fontWeight: 400,
                      }
                }
              >
                {item.label}
              </span>
            ))}
          </nav>
          <div
            className="mt-auto rounded-2xl px-3.5 py-3"
            style={{ background: "var(--b-soft)" }}
          >
            <p className="text-[0.8125rem] font-semibold">Scrinium</p>
            <p className="b-meta mt-0.5">Quiet workspace</p>
          </div>
        </aside>

        <main className="brand-lab-main">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pt-12 pb-14 md:px-10 md:pt-14">
            <header className="flex items-baseline justify-between gap-4">
              <p className="b-eyebrow" style={{ color: "var(--b-accent)" }}>
                Übersicht
              </p>
              <p className="b-meta">0 offen</p>
            </header>

            <h1 className="b-display b-title mt-6">
              Heute liegt nichts bei Ihnen.
            </h1>
            <p className="b-lead mt-4">
              Keine offenen Aufgaben. Wählen Sie eine Funktion — oder lassen Sie
              den Tag ruhig.
            </p>

            <p className="b-eyebrow mt-12" style={{ color: "var(--b-accent)" }}>
              Funktionen
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {LAB_FUNCTIONS.map((fn) => (
                <button
                  key={fn.title}
                  type="button"
                  className="flex min-h-[120px] flex-col items-start justify-between rounded-[1.25rem] border p-5 text-left"
                  style={{
                    background: "var(--b-bg-elev)",
                    borderColor: "var(--b-line)",
                  }}
                >
                  <LabFunctionIcon icon={fn.icon} />
                  <span className="b-display mt-3 text-[1.2rem]">{fn.title}</span>
                  <span className="b-meta mt-3">{fn.body}</span>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
