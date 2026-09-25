import { verifyCaptcha } from "captchakit/server";

export const runtime = "nodejs";

/**
 * Example protected form endpoint.
 * Verifies the CAPTCHA proof token on the server before accepting the form.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const { email, captchaToken } = body as {
    email?: unknown;
    captchaToken?: unknown;
  };

  if (typeof email !== "string" || email.length === 0) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  if (typeof captchaToken !== "string" || captchaToken.length === 0) {
    return Response.json(
      { error: "CAPTCHA proof token is required" },
      { status: 400 },
    );
  }

  const result = await verifyCaptcha({ token: captchaToken });
  if (!result.success) {
    return Response.json(
      { error: "Invalid CAPTCHA", code: result.error },
      { status: 400 },
    );
  }

  return Response.json({
    success: true,
    message: `Registered ${email}`,
  });
}
