'use client';

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// Input de texto con label opcional.
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className, id, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn('input-field', error && 'border-red-700/60', className)}
          {...rest}
        />
        {hint && !error && (
          <p className="mt-1 text-xs text-text-subtle">{hint}</p>
        )}
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// Textarea con el mismo estilo.
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, className, id, ...rest }, ref) => {
    const tId = id ?? rest.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={tId} className="label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={tId}
          rows={rest.rows ?? 3}
          className={cn('input-field resize-none', className)}
          {...rest}
        />
        {hint && <p className="mt-1 text-xs text-text-subtle">{hint}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
