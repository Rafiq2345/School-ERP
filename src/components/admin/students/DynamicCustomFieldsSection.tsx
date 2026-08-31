'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export interface CustomFieldItem {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
  validationRules: any;
  options?: { id: string; label: string; value: string }[];
}

interface DynamicCustomFieldsSectionProps {
  customFields: CustomFieldItem[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export function DynamicCustomFieldsSection({ customFields, values, onChange }: DynamicCustomFieldsSectionProps) {
  if (!customFields || customFields.length === 0) return null;

  // Group fields by section
  const grouped = new Map<string, CustomFieldItem[]>();
  for (const f of customFields) {
    const section = (f.validationRules && f.validationRules.section) || 'School-Specific Custom Details';
    if (!grouped.has(section)) {
      grouped.set(section, []);
    }
    grouped.get(section)!.push(f);
  }

  return (
    <>
      {Array.from(grouped.entries()).map(([sectionName, fields]) => (
        <div key={sectionName} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">{sectionName}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {fields.map((f) => {
              const currentValue = values[f.fieldKey] !== undefined ? values[f.fieldKey] : '';

              if (f.fieldType === 'DROPDOWN' || f.fieldType === 'MULTISELECT') {
                return (
                  <div key={f.id}>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {f.label} {f.isRequired && <span className="text-rose-500">*</span>}
                    </label>
                    <select
                      value={currentValue}
                      onChange={(e) => onChange(f.fieldKey, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Select option</option>
                      {f.options &&
                        f.options.map((opt) => (
                          <option key={opt.id} value={opt.label}>
                            {opt.label}
                          </option>
                        ))}
                    </select>
                  </div>
                );
              }

              if (f.fieldType === 'TEXTAREA') {
                return (
                  <div key={f.id} className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {f.label} {f.isRequired && <span className="text-rose-500">*</span>}
                    </label>
                    <textarea
                      value={currentValue}
                      onChange={(e) => onChange(f.fieldKey, e.target.value)}
                      placeholder={`Enter ${f.label.toLowerCase()}...`}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                );
              }

              return (
                <Input
                  key={f.id}
                  label={`${f.label} ${f.isRequired ? '*' : ''}`}
                  type={f.fieldType === 'NUMBER' ? 'number' : f.fieldType === 'DATE' ? 'date' : 'text'}
                  placeholder={`Enter ${f.label.toLowerCase()}...`}
                  value={currentValue}
                  onChange={(e) => onChange(f.fieldKey, e.target.value)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
