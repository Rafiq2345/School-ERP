'use client';

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  optional?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      optional = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-start">
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={inputId} className="block text-xs font-bold text-slate-700">
              {label}
            </label>
            {optional && (
              <span className="text-2xs text-slate-400 font-medium italic">Optional</span>
            )}
          </div>
        )}

        <div className="relative rounded-xl shadow-2xs">
          {leftIcon && (
            <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={`w-full rounded-xl border bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
              leftIcon ? 'ps-9' : ''
            } ${rightIcon ? 'pe-9' : ''} ${
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
            } ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-2xs font-semibold text-rose-600 mt-0.5">{error}</p>
        ) : helperText ? (
          <p className="text-2xs text-slate-500 mt-0.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
