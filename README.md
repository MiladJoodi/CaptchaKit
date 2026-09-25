# CaptchaKit

Self-hosted CAPTCHA for React and Next.js. No database, Redis, or external CAPTCHA provider required.

Answers are generated and verified on the server. The browser never receives the plaintext answer.

## Features

* CAPTCHA types: `text`, `number`, `math`, `image`
* English (`en`) and Persian (`fa`) with RTL support
* Difficulty levels: `easy`, `medium`, `hard`
* Light and dark themes
* Custom styling with `classNames` and CSS variables
* HMAC-signed, short-lived tokens
* One-time verification and replay protection
* Attempt limits and rate limiting
* Next.js App Router support

## Installation

```bash
npm install captchakit
```

## Quick Start

### 1. Add your secret

Create `.env.local`:

```env
CAPTCHAKIT_SECRET=your-long-random-secret-at-least-32-chars
```

Keep this value server-side.

### 2. Add the CAPTCHA API

Create `app/api/captcha/route.ts`:

```ts
import { createCaptchaHandlers } from "captchakit/server";

export const { GET, POST } = createCaptchaHandlers();
```

CaptchaKit uses `/api/captcha` by default.

### 3. Add CAPTCHA to your form

```tsx
"use client";

import { useState } from "react";
import { Captcha } from "captchakit";
import "captchakit/styles.css";

export default function Form() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!captchaToken) {
      alert("Please complete the CAPTCHA first.");
      return;
    }

    const formData = new FormData(e.currentTarget);

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        captchaToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error);
      return;
    }

    alert("Form submitted successfully!");
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="email"
        type="email"
        placeholder="you@example.com"
        required
      />

      <Captcha
        type="math"
        locale="fa"
        difficulty="easy"
        onVerify={setCaptchaToken}
        onError={() => setCaptchaToken(null)}
      />

      <button type="submit" disabled={!captchaToken}>
        Submit
      </button>
    </form>
  );
}
```

When the user solves the CAPTCHA, `onVerify` returns a proof token.

Send that token with the action you want to protect.

### 4. Verify the token on your server

Create `app/api/register/route.ts`:

```ts
import { verifyCaptcha } from "captchakit/server";

export async function POST(request: Request) {
  const { email, captchaToken } = await request.json();

  const result = await verifyCaptcha({
    token: captchaToken,
  });

  if (!result.success) {
    return Response.json(
      { error: result.error },
      { status: 400 }
    );
  }

  // CAPTCHA verified.
  // Continue with your protected action.

  return Response.json({
    success: true,
    email,
  });
}
```

Always verify the proof token on the server before processing the request.

## CAPTCHA Types

| Type     | Description                    |
| -------- | ------------------------------ |
| `text`   | Random characters              |
| `number` | Random digits                  |
| `math`   | Arithmetic expression          |
| `image`  | Distorted characters as an SVG |

Example:

```tsx
<Captcha
  type="math"
  locale="en"
  difficulty="hard"
/>
```

## Configuration

```tsx
<Captcha
  type="math"
  locale="en"
  difficulty="medium"
  theme="light"
  endpoint="/api/captcha"
  onVerify={(token) => {}}
  onError={(error) => {}}
  disabled={false}
/>
```

### Props

| Prop         | Type                                      | Default          |
| ------------ | ----------------------------------------- | ---------------- |
| `type`       | `"text" \| "number" \| "math" \| "image"` | `"math"`         |
| `locale`     | `"en" \| "fa"`                            | `"en"`           |
| `difficulty` | `"easy" \| "medium" \| "hard"`            | `"medium"`       |
| `theme`      | `"light" \| "dark"`                       | `"light"`        |
| `endpoint`   | `string`                                  | `"/api/captcha"` |
| `onVerify`   | `(token: string) => void`                 | —                |
| `onError`    | `(error: CaptchaErrorCode) => void`       | —                |
| `disabled`   | `boolean`                                 | `false`          |

### Localization

```tsx
<Captcha locale="fa" />
```

Persian mode uses RTL layout and supports Persian digits.

## Styling

Import the default styles:

```ts
import "captchakit/styles.css";
```

### Theme

```tsx
<Captcha theme="dark" />
```

### Custom classes

Customize individual parts with `classNames`:

```tsx
<Captcha
  classNames={{
    container: "my-captcha",
    challenge: "my-challenge",
    input: "my-input",
    button: "my-button",
    error: "my-error",
  }}
/>
```

Available classes:

* `container`
* `challenge`
* `input`
* `button`
* `error`

Works with regular CSS, CSS Modules, Tailwind CSS, or other class-based styling systems.

### CSS variables

```css
:root {
  --captchakit-primary: #18181b;
  --captchakit-background: #ffffff;
  --captchakit-text: #18181b;
  --captchakit-muted: #71717a;
  --captchakit-border: #e4e4e7;
  --captchakit-error: #dc2626;
  --captchakit-radius: 8px;
}
```

## Security & Limitations

* CAPTCHA challenges and answers are generated server-side.
* Tokens are signed with HMAC-SHA256.
* Challenge answers are stored as hashes, not plaintext.
* Challenges expire after 5 minutes.
* Proof tokens expire after 10 minutes.
* Challenges and proofs can only be used once.
* Each challenge allows up to 5 failed attempts.
* Default rate limit is 20 challenges per minute per identifier.
* The default `MemoryStore` is process-local.
* For multiple server instances, use a shared `CaptchaStore`.
* No database or Redis is required for a single-process deployment.
* Image CAPTCHA uses SVG and does not require native dependencies.
* No audio CAPTCHA or external CAPTCHA provider is included.
* CaptchaKit has not undergone a formal security audit.

CAPTCHA helps reduce automated abuse but is not a guarantee against bypass.

## License

MIT