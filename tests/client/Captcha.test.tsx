/**
 * @vitest-environment jsdom
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Captcha } from "../../src/client/Captcha";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function mockChallenge(overrides: Record<string, unknown> = {}) {
  return {
    token: "challenge-token",
    type: "math",
    challenge: { display: "7 × 8 = ?" },
    expiresAt: Date.now() + 60_000,
    ...overrides,
  };
}

describe("<Captcha />", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          return new Response(
            JSON.stringify({ success: true, token: "proof" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        return new Response(JSON.stringify(mockChallenge()), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
  });

  it("renders with defaults and fetches a challenge", async () => {
    render(<Captcha />);
    expect(await screen.findByText("7 × 8 = ?")).toBeTruthy();
    expect(screen.getByLabelText("CAPTCHA answer")).toBeTruthy();
    expect(document.querySelector('[data-theme="light"]')).toBeTruthy();
    expect(document.querySelector('[dir="ltr"]')).toBeTruthy();
  });

  it("renders text, number, and image challenges", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("type=text")) {
        return new Response(
          JSON.stringify(
            mockChallenge({ type: "text", challenge: { display: "ABCD" } }),
          ),
          { status: 200 },
        );
      }
      if (url.includes("type=number")) {
        return new Response(
          JSON.stringify(
            mockChallenge({ type: "number", challenge: { display: "1234" } }),
          ),
          { status: 200 },
        );
      }
      if (url.includes("type=image")) {
        return new Response(
          JSON.stringify(
            mockChallenge({
              type: "image",
              challenge: { image: "data:image/png;base64,aaa" },
            }),
          ),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify(mockChallenge()), { status: 200 });
    });

    const { rerender } = render(<Captcha type="text" />);
    expect(await screen.findByText("ABCD")).toBeTruthy();

    rerender(<Captcha type="number" />);
    expect(await screen.findByText("1234")).toBeTruthy();

    rerender(<Captcha type="image" />);
    const img = await screen.findByRole("img", {
      name: "CAPTCHA challenge image",
    });
    expect(img.getAttribute("src")).toBe("data:image/png;base64,aaa");
    expect(img.getAttribute("alt")).not.toMatch(/aaa|answer/i);
  });

  it("supports Persian locale and RTL", async () => {
    render(<Captcha locale="fa" />);
    expect(await screen.findByText("7 × 8 = ?")).toBeTruthy();
    expect(screen.getByLabelText("پاسخ کپچا")).toBeTruthy();
    expect(document.querySelector('[dir="rtl"]')).toBeTruthy();
    expect(document.querySelector('[data-locale="fa"]')).toBeTruthy();
    // Challenge text stays LTR so "7 × 8 = ?" is not visually reversed.
    expect(
      document.querySelector(".captchakit-display")?.getAttribute("dir"),
    ).toBe("ltr");
  });

  it("supports dark theme and custom classNames", async () => {
    render(
      <Captcha
        theme="dark"
        classNames={{
          container: "my-container",
          challenge: "my-challenge",
          input: "my-input",
          button: "my-button",
          error: "my-error",
        }}
      />,
    );
    await screen.findByText("7 × 8 = ?");
    const rootEl = document.querySelector(".captchakit.my-container");
    expect(rootEl).toBeTruthy();
    expect(rootEl?.getAttribute("data-theme")).toBe("dark");
    expect(document.querySelector(".captchakit-challenge.my-challenge")).toBeTruthy();
    expect(document.querySelector(".captchakit-input.my-input")).toBeTruthy();
    expect(document.querySelectorAll(".my-button").length).toBe(2);
    expect(document.querySelector(".captchakit-button.my-button")).toBeTruthy();
    expect(document.querySelector(".captchakit-refresh.my-button")).toBeTruthy();
  });

  it("submits an answer and calls onVerify", async () => {
    const onVerify = vi.fn();
    render(<Captcha onVerify={onVerify} />);
    await screen.findByText("7 × 8 = ?");

    fireEvent.change(screen.getByLabelText("CAPTCHA answer"), {
      target: { value: "56" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => {
      expect(onVerify).toHaveBeenCalledWith("proof");
    });
  });

  it("submits on Enter key", async () => {
    const onVerify = vi.fn();
    render(<Captcha onVerify={onVerify} />);
    await screen.findByText("7 × 8 = ?");
    const input = screen.getByLabelText("CAPTCHA answer");
    fireEvent.change(input, { target: { value: "56" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(onVerify).toHaveBeenCalledWith("proof"));
  });

  it("calls onError for invalid answers", async () => {
    const onError = vi.fn();
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (init?.method === "POST") {
        return new Response(
          JSON.stringify({
            success: false,
            error: "CAPTCHA_INVALID_ANSWER",
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify(mockChallenge()), { status: 200 });
    });

    render(<Captcha onError={onError} />);
    await screen.findByText("7 × 8 = ?");
    fireEvent.change(screen.getByLabelText("CAPTCHA answer"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("CAPTCHA_INVALID_ANSWER");
    });
    expect(
      screen.getByText("The answer is incorrect."),
    ).toBeTruthy();
  });

  it("refreshes the challenge", async () => {
    const fetchMock = vi.mocked(fetch);
    render(<Captcha />);
    await screen.findByText("7 × 8 = ?");

    fetchMock.mockImplementationOnce(async () =>
      new Response(
        JSON.stringify(
          mockChallenge({ challenge: { display: "3 + 4 = ?" } }),
        ),
        { status: 200 },
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh CAPTCHA" }));
    expect(await screen.findByText("3 + 4 = ?")).toBeTruthy();
  });

  it("respects disabled state", async () => {
    render(<Captcha disabled />);
    // May still show loading or empty — controls should be disabled once rendered.
    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      expect(buttons.every((button) => (button as HTMLButtonElement).disabled)).toBe(
        true,
      );
    });
  });

  it("shows loading state initially", () => {
    vi.mocked(fetch).mockImplementation(
      () => new Promise(() => undefined) as Promise<Response>,
    );
    render(<Captcha />);
    expect(screen.getByText("Loading…")).toBeTruthy();
  });

  it("ships CSS variables in styles.css", () => {
    const css = readFileSync(path.join(root, "src/client/styles.css"), "utf8");
    for (const name of [
      "--captchakit-primary",
      "--captchakit-background",
      "--captchakit-text",
      "--captchakit-muted",
      "--captchakit-border",
      "--captchakit-error",
      "--captchakit-radius",
    ]) {
      expect(css).toContain(name);
    }
  });
});
