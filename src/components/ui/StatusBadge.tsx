'use client';

import React from 'react';

export interface StatusBadgeProps {
  status: string | boolean;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  let label = String(status);
  let badgeStyles = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (typeof status === 'boolean') {
    if (status) {
      label = 'Active';
      badgeStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      dotColor = 'bg-emerald-500';
    } else {
      label = 'Inactive';
      badgeStyles = 'bg-slate-100 text-slate-600 border-slate-200';
      dotColor = 'bg-slate-400';
    }
  } else {
    const s = String(status).toUpperCase();
    switch (s) {
      case 'ACTIVE':
        label = 'Active';
        badgeStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
        dotColor = 'bg-emerald-500';
        break;
      case 'INACTIVE':
        label = 'Inactive';
        badgeStyles = 'bg-slate-100 text-slate-600 border-slate-200';
        dotColor = 'bg-slate-400';
        break;
      case 'DRAFT':
        label = 'Draft';
        badgeStyles = 'bg-amber-50 text-amber-700 border-amber-200/80';
        dotColor = 'bg-amber-500';
        break;
      case 'CLOSED':
        label = 'Closed';
        badgeStyles = 'bg-slate-100 text-slate-700 border-slate-300';
        dotColor = 'bg-slate-500';
        break;
      case 'LOCKED':
        label = 'Locked';
        badgeStyles = 'bg-purple-50 text-purple-700 border-purple-200/80';
        dotColor = 'bg-purple-500';
        break;
      case 'THEORY':
        label = 'Theory';
        badgeStyles = 'bg-blue-50 text-blue-700 border-blue-200/80';
        dotColor = 'bg-blue-500';
        break;
      case 'PRACTICAL':
        label = 'Practical';
        badgeStyles = 'bg-purple-50 text-purple-700 border-purple-200/80';
        dotColor = 'bg-purple-500';
        break;
      case 'BOTH':
        label = 'Both (Theory & Practical)';
        badgeStyles = 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
        dotColor = 'bg-indigo-500';
        break;
      case 'ACTIVITY':
        label = 'Activity';
        badgeStyles = 'bg-teal-50 text-teal-700 border-teal-200/80';
        dotColor = 'bg-teal-500';
        break;
      case 'COMPULSORY':
        label = 'Compulsory';
        badgeStyles = 'bg-blue-50 text-blue-700 border-blue-200/80';
        dotColor = 'bg-blue-500';
        break;
      case 'OPTIONAL':
        label = 'Optional';
        badgeStyles = 'bg-slate-100 text-slate-600 border-slate-200';
        dotColor = 'bg-slate-400';
        break;
      default:
        label = String(status);
        badgeStyles = 'bg-slate-100 text-slate-700 border-slate-200';
        dotColor = 'bg-slate-400';
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold border transition-colors shadow-2xs ${badgeStyles} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{label}</span>
    </span>
  );
}
