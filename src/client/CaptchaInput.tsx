import type { KeyboardEvent } from "react";

export interface CaptchaInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  label: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
  dir?: "ltr" | "rtl";
}

export function CaptchaInput({
  id,
  value,
  onChange,
  onSubmit,
  label,
  disabled = false,
  invalid = false,
  describedBy,
  className,
  dir,
}: CaptchaInputProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!disabled) onSubmit();
    }
  };

  return (
    <div className="captchakit-field">
      <label className="captchakit-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={className}
        data-captchakit-part="input"
        type="text"
        name="captchakit-answer"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        dir={dir}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
