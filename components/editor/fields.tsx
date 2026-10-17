"use client";
import { useId } from "react";

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  hint,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  hint?: string;
  type?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="text-berry"> *</span>}
      </label>
      <input id={id} type={type} className="field" value={value} placeholder={placeholder} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${id}-h` : undefined} />
      {hint && (
        <p id={`${id}-h`} className="mt-1 text-xs text-ink-mute">
          {hint}
        </p>
      )}
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 6,
  maxLength,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {maxLength && (
          <span className="text-xs text-ink-mute" aria-live="polite">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      <textarea id={id} className="field resize-y" rows={rows} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="mt-1 text-xs text-ink-mute">{hint}</p>}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: T | "";
  onChange: (v: T | "") => void;
  options: Array<{ value: T; label: string }>;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select id={id} className="field appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2366485a%22 stroke-width=%222.5%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:14px] bg-[right_14px_center] bg-no-repeat pr-10" value={value} onChange={(e) => onChange(e.target.value as T | "")}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A row of pill buttons acting as a single-choice group. */
export function ChoiceGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; swatch?: string }>;
}) {
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.value} type="button" className="chip" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            {o.swatch && <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: o.swatch }} aria-hidden="true" />}
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="block text-xs text-ink-mute">{hint}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-berry" : "bg-ink-mute/40"}`}
      >
        <span className={`absolute left-0 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

export function Section({ title, children, description }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-line pb-6 last:border-0 last:pb-0">
      <div>
        <h3 className="text-base font-bold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-ink-mute">{description}</p>}
      </div>
      {children}
    </section>
  );
}
