import { createCaptchaHandlers } from "captchakit/server";

export const runtime = "nodejs";

export const { GET, POST } = createCaptchaHandlers();
