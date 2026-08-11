'use client';

import { useId, type ReactNode } from 'react';

export type FieldAccessibilityProps = {
  id: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

interface FormFieldProps {
  label: ReactNode;
  /** Optional explicit control id. Defaults to a generated unique id. */
  id?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** Applied to the wrapper div. */
  className?: string;
  /** Overrides the default label styling. */
  labelClassName?: string;
  children: (props: FieldAccessibilityProps) => ReactNode;
}

/**
 * Shared form field shell: owns the label→control association, hint and
 * error wiring (aria-describedby + aria-invalid + role=alert), and required
 * indicator, so every form gets a consistent, accessible contract.
 *
 * The control itself is supplied via render prop so consumers keep full
 * control over type, value, onChange, and styling.
 */
export default function FormField({
  label,
  id,
  hint,
  error,
  required = false,
  className = '',
  labelClassName,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ');

  const fieldProps: FieldAccessibilityProps = {
    id: fieldId,
    ...(error ? { 'aria-invalid': true } : {}),
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
  };

  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className={labelClassName ?? 'block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2'}
      >
        {label}
        {required && <span className="text-tertiary" aria-hidden="true"> *</span>}
      </label>
      {children(fieldProps)}
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-on-surface-variant/70">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>
          {error}
        </p>
      )}
    </div>
  );
}
