export interface CaptchaActionsProps {
  onSubmit: () => void;
  submitLabel: string;
  disabled?: boolean;
  busy?: boolean;
  verified?: boolean;
  buttonClassName?: string;
}

export function CaptchaActions({
  onSubmit,
  submitLabel,
  disabled = false,
  busy = false,
  verified = false,
  buttonClassName,
}: CaptchaActionsProps) {
  const inactive = disabled || busy;

  return (
    <div className="captchakit-actions" data-captchakit-part="actions">
      <button
        type="button"
        className={buttonClassName}
        data-captchakit-part="button"
        data-captchakit-action="submit"
        onClick={() => onSubmit()}
        disabled={inactive || verified}
      >
        {submitLabel}
      </button>
    </div>
  );
}
