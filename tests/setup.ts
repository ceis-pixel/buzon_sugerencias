import { vi } from "vitest";

// Next.js enforces this import boundary; unit tests run outside its compiler.
vi.mock("server-only", () => ({}));
