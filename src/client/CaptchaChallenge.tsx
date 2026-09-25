import type { CaptchaChallengeDisplay, CaptchaType } from "../shared/types";

export interface CaptchaChallengeProps {
  type: CaptchaType | null;
  challenge: CaptchaChallengeDisplay | null;
  className?: string;
  label: string;
  imageAlt: string;
  loading: boolean;
  loadingLabel: string;
  onRefresh: () => void;
  refreshLabel: string;
  refreshDisabled?: boolean;
  buttonClassName?: string;
}

function RefreshIcon() {
  return (
    <svg
      className="captchakit-refresh-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <polyline points="21 3 21 9 15 9" />
    </svg>
  );
}

/**
 * Renders the visual challenge (text display or image).
 * Never receives or shows the CAPTCHA answer.
 */
export function CaptchaChallenge({
  type,
  challenge,
  className,
  label,
  imageAlt,
  loading,
  loadingLabel,
  onRefresh,
  refreshLabel,
  refreshDisabled = false,
  buttonClassName,
}: CaptchaChallengeProps) {
  const refreshButton = (
    <button
      type="button"
      className={
        buttonClassName
          ? `captchakit-refresh ${buttonClassName}`
          : "captchakit-refresh"
      }
      data-captchakit-part="button"
      data-captchakit-action="refresh"
      onClick={() => onRefresh()}
      disabled={refreshDisabled}
      aria-label={refreshLabel}
    >
      <RefreshIcon />
    </button>
  );

  if (loading || !challenge) {
    return (
      <div
        className={className}
        data-captchakit-part="challenge"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="captchakit-loading">{loadingLabel}</span>
        {refreshButton}
      </div>
    );
  }

  if (type === "image" && challenge.image) {
    return (
      <div
        className={className}
        data-captchakit-part="challenge"
        aria-label={label}
      >
        <img
          className="captchakit-image"
          src={challenge.image}
          alt={imageAlt}
          width={200}
          height={52}
          draggable={false}
        />
        {refreshButton}
      </div>
    );
  }

  return (
    <div
      className={className}
      data-captchakit-part="challenge"
      aria-label={label}
    >
      {/* Always LTR so math/number strings like "7 + 4 = ?" never reverse under RTL UI. */}
      <span className="captchakit-display" dir="ltr">
        {challenge.display ?? ""}
      </span>
      {refreshButton}
    </div>
  );
}
