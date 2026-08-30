'use client';

import React from 'react';

export interface Option {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  error?: string;
  helperText?: string;
  optional?: boolean;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      helperText,
      optional = false,
      placeholder,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-start">
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={selectId} className="block text-xs font-bold text-slate-700">
              {label}
            </label>
            {optional && (
              <span className="text-2xs text-slate-400 font-medium italic">Optional</span>
            )}
          </div>
        )}

        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={`w-full rounded-xl border bg-slate-50/50 px-3 py-2 text-xs text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 appearance-none cursor-pointer ${
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
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

Select.displayName = 'Select';
