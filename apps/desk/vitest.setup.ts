import { vi } from "vitest";

/** Next.js `server-only` throws in non-server bundles — noop in unit tests. */
vi.mock("server-only", () => ({}));
