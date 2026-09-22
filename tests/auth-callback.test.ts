import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      auth: {
        exchangeCodeForSession: mocks.exchangeCodeForSession,
        signOut: mocks.signOut,
      },
    }),
  ),
}));

import { GET } from "@/app/auth/callback/route";

describe("OAuth Callback Route Handler (/auth/callback)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signOut.mockResolvedValue({ error: null });
  });

  it("redirects to login when OAuth provider returns an error parameter", async () => {
    const request = new Request("http://localhost:3000/auth/callback?error=access_denied");
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=oauth_callback_error",
    );
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("redirects to login when authorization code parameter is missing", async () => {
    const request = new Request("http://localhost:3000/auth/callback");
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=session_missing",
    );
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("redirects to login when code exchange fails", async () => {
    mocks.exchangeCodeForSession.mockResolvedValueOnce({
      data: { session: null },
      error: new Error("Invalid grant code"),
    });

    const request = new Request("http://localhost:3000/auth/callback?code=bad-code");
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=oauth_callback_error",
    );
  });

  it("defensively destroys session and redirects to login when email is not @unsch.edu.pe", async () => {
    mocks.exchangeCodeForSession.mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: "user-123",
            email: "student@gmail.com",
          },
        },
      },
      error: null,
    });

    const request = new Request("http://localhost:3000/auth/callback?code=valid-code");
    const response = await GET(request);

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=domain_not_allowed",
    );
  });

  it("successfully redirects to next destination when email belongs to @unsch.edu.pe", async () => {
    mocks.exchangeCodeForSession.mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: "user-456",
            email: "28190012@unsch.edu.pe",
          },
        },
      },
      error: null,
    });

    const request = new Request("http://localhost:3000/auth/callback?code=valid-code&next=/seguimiento");
    const response = await GET(request);

    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/seguimiento");
  });

  it("neutralizes open redirect attempts with absolute URLs and falls back to root", async () => {
    mocks.exchangeCodeForSession.mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: "user-789",
            email: "valido@unsch.edu.pe",
          },
        },
      },
      error: null,
    });

    const request = new Request("http://localhost:3000/auth/callback?code=valid-code&next=https://evil.com/phishing");
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("neutralizes protocol-relative open redirect attempts (//evil.com)", async () => {
    mocks.exchangeCodeForSession.mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: "user-789",
            email: "valido@unsch.edu.pe",
          },
        },
      },
      error: null,
    });

    const request = new Request("http://localhost:3000/auth/callback?code=valid-code&next=//evil.com");
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
});
