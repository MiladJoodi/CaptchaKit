import { useId } from "react";
import {
  DEFAULT_CAPTCHA_TYPE,
  DEFAULT_DIFFICULTY,
  DEFAULT_ENDPOINT,
  DEFAULT_LOCALE,
  DEFAULT_THEME,
} from "../shared/constants";
import type { CaptchaProps } from "../shared/types";
import { CaptchaActions } from "./CaptchaActions";
import { CaptchaChallenge } from "./CaptchaChallenge";
import { CaptchaInput } from "./CaptchaInput";
import { getDirection, getErrorMessage, getMessages } from "./i18n";
import { useCaptcha } from "./useCaptcha";

function cx(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Public CaptchaKit React component.
 * Talks to the server over HTTP — never verifies answers in the browser.
 */
export function Captcha({
  type = DEFAULT_CAPTCHA_TYPE,
  locale = DEFAULT_LOCALE,
  difficulty = DEFAULT_DIFFICULTY,
  theme = DEFAULT_THEME,
  endpoint = DEFAULT_ENDPOINT,
  classNames,
  onVerify,
  onError,
  disabled = false,
}: CaptchaProps) {
  const reactId = useId();
  const inputId = `captchakit-input-${reactId}`;
  const errorId = `captchakit-error-${reactId}`;
  const messages = getMessages(locale);
  const dir = getDirection(locale);

  const captcha = useCaptcha({
    type,
    locale,
    difficulty,
    endpoint,
    disabled,
    ...(onVerify ? { onVerify } : {}),
    ...(onError ? { onError } : {}),
  });

  const loading =
    captcha.status === "loading" || captcha.status === "idle";
  const showError = Boolean(captcha.errorCode);
  const errorMessage = captcha.errorCode
    ? getErrorMessage(locale, captcha.errorCode)
    : null;

  const controlsDisabled =
    disabled || captcha.isBusy || captcha.verified || loading;

  return (
    <div
      className={cx("captchakit", classNames?.container)}
      data-captchakit-part="container"
      data-theme={theme}
      data-locale={locale}
      data-status={captcha.status}
      dir={dir}
    >
      <CaptchaChallenge
        type={captcha.challengeType}
        challenge={captcha.challenge}
        className={cx("captchakit-challenge", classNames?.challenge)}
        label={messages.challengeLabel}
        imageAlt={messages.imageAlt}
        loading={loading}
        loadingLabel={messages.loading}
        onRefresh={() => {
          void captcha.refresh();
        }}
        refreshLabel={messages.refresh}
        refreshDisabled={disabled || captcha.isBusy}
        buttonClassName={cx(classNames?.button)}
      />

      <CaptchaInput
        id={inputId}
        value={captcha.answer}
        onChange={captcha.setAnswer}
        onSubmit={() => {
          void captcha.submit();
        }}
        label={messages.inputLabel}
        disabled={controlsDisabled}
        invalid={showError}
        {...(showError ? { describedBy: errorId } : {})}
        className={cx("captchakit-input", classNames?.input)}
        dir={dir}
      />

      <CaptchaActions
        onSubmit={() => {
          void captcha.submit();
        }}
        submitLabel={captcha.verified ? messages.verified : messages.submit}
        disabled={disabled}
        busy={captcha.isBusy || loading}
        verified={captcha.verified}
        buttonClassName={cx("captchakit-button", classNames?.button)}
      />

      {showError && errorMessage ? (
        <p
          id={errorId}
          className={cx("captchakit-error", classNames?.error)}
          data-captchakit-part="error"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
