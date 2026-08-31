'use client';

import React from 'react';
import Link from 'next/link';
import {
  Building2,
  Calendar,
  CalendarOff,
  Layers,
  GraduationCap,
  LayoutGrid,
  BookOpen,
  Network,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Shield,
  Package,
  CreditCard,
} from 'lucide-react';

const CONFIG_CARDS = [
  {
    title: 'School Profile',
    description: 'Institution identity, bilingual name, registration, timezone, and contact details.',
    href: '/admin/settings/profile',
    icon: <Building2 className="w-6 h-6 text-blue-600" />,
    badge: 'Core Identity',
  },
  {
    title: 'Academic Sessions',
    description: 'Academic years/terms, session locking, date ranges, and active current session control.',
    href: '/admin/settings/academic-years',
    icon: <Calendar className="w-6 h-6 text-indigo-600" />,
    badge: 'Sessions',
  },
  {
    title: 'Holidays & School Calendar',
    description: 'Central non-working days, recurring weekly offs, public holidays, and date-range vacation periods.',
    href: '/admin/settings/holidays',
    icon: <CalendarOff className="w-6 h-6 text-rose-600" />,
    badge: 'Calendar',
  },
  {
    title: 'Class Categories',
    description: 'Dynamic grouping for Pre-Primary, Primary, Middle, Secondary, and Higher Secondary.',
    href: '/admin/settings/class-categories',
    icon: <Layers className="w-6 h-6 text-sky-600" />,
    badge: 'Hierarchy',
  },
  {
    title: 'School Classes & Grades',
    description: 'Standard grades/classes (Grade 1 to 12), category links, and sort ordering.',
    href: '/admin/settings/classes',
    icon: <GraduationCap className="w-6 h-6 text-emerald-600" />,
    badge: 'Academics',
  },
  {
    title: 'Class Sections',
    description: 'Section divisions (Section A, Rose), class relationships, and student capacity limits.',
    href: '/admin/settings/sections',
    icon: <LayoutGrid className="w-6 h-6 text-teal-600" />,
    badge: 'Capacity',
  },
  {
    title: 'Academic Subjects',
    description: 'Master subjects registry, curriculum codes, and classification types (Theory, Practical, Activity).',
    href: '/admin/settings/subjects',
    icon: <BookOpen className="w-6 h-6 text-violet-600" />,
    badge: 'Curriculum',
  },
  {
    title: 'Class-Subject Mapping',
    description: 'Assign master subjects to classes per academic session with compulsory/optional flags.',
    href: '/admin/settings/class-subjects',
    icon: <Network className="w-6 h-6 text-amber-600" />,
    badge: 'Workflow',
  },
  {
    title: 'Roles & Permissions',
    description: 'Institutional role management, security access levels, and 10-action RBAC matrix.',
    href: '/admin/settings/roles',
    icon: <Shield className="w-6 h-6 text-purple-600" />,
    badge: 'Security',
  },
  {
    title: 'Module Settings',
    description: 'Central module and feature packaging, optional capabilities, and feature toggles.',
    href: '/admin/settings/modules',
    icon: <Package className="w-6 h-6 text-pink-600" />,
    badge: 'Packaging',
  },
  {
    title: 'Software Subscription',
    description: 'Institutional ERP license, provider invoices, receiving accounts, and payment verification.',
    href: '/admin/settings/subscription',
    icon: <CreditCard className="w-6 h-6 text-rose-600" />,
    badge: 'Licensing',
  },
];

export default function AdministrationConfigHubPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administration Control Center</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Administration Configuration Masters
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Configure institutional identity, academic structures, grades, sections, subjects, and curriculum mappings.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 shrink-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <div className="text-xs">
            <p className="font-bold text-slate-800">Tenant Isolation Active</p>
            <p className="text-slate-500">PostgreSQL Engine Guard</p>
          </div>
        </div>
      </div>

      {/* Grid of Master Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {CONFIG_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                  {card.icon}
                </div>
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-600">
                  {card.badge}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {card.description}
                </p>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
              <span>Manage Master Data</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
