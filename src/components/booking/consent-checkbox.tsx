// ConsentCheckbox — datasteget (WP-13 R1, ingen referens). Inbyggd checkbox, aldrig
// förkryssad (hård regel, koden sätter aldrig `defaultChecked`).
import type { ReactNode, Ref } from "react";
import { useId } from "react";

export function ConsentCheckbox({
  checked,
  onChange,
  required,
  error,
  children,
  ref,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  error?: string;
  children: ReactNode;
  ref?: Ref<HTMLInputElement>;
}) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-start gap-2.5">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          checked={checked}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={errorId}
          onChange={(e) => {
            onChange(e.target.checked);
          }}
          className="mt-0.5 size-5 shrink-0 accent-ink"
        />
        <span className="text-13 leading-body text-ink">{children}</span>
      </label>
      {error ? (
        <span id={errorId} role="alert" className="text-13 text-ink">
          {error}
        </span>
      ) : null}
    </div>
  );
}
