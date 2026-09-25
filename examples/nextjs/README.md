# CaptchaKit Next.js example

Minimal App Router demo:

1. Browser loads `<Captcha />` and solves a challenge via `GET/POST /api/captcha`
2. Component receives a **proof token** through `onVerify`
3. Form submits `{ email, captchaToken }` to `/api/register`
4. Server calls `verifyCaptcha({ token })` before accepting the form

CAPTCHA answer verification happens on the server.

## Setup

```bash
# from repo root
pnpm build

cd examples/nextjs
cp .env.example .env.local
# edit CAPTCHAKIT_SECRET (min 32 characters)

pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

```text
CAPTCHAKIT_SECRET=your-long-random-secret
```

Never expose this secret to client-side code.

## Notes

- The root `captchakit` package is linked via `file:../..`.
- The demo page loads `<Captcha />` with `next/dynamic` (`ssr: false`) to avoid dual-React issues when linking the local package.
