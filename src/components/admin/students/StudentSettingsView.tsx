'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sliders, ArrowLeft, Plus, Edit, Trash2, CheckCircle, Tag, Shield, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export function StudentSettingsView() {
  const { success, error } = useToast();
  const [categories, setCategories] = useState<{ id: string; name: string; code: string; isActive: boolean }[]>([]);
  const [houses, setHouses] = useState<{ id: string; name: string; code: string; color: string | null; isActive: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Category Form Modal / State
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');

  // New House Form State
  const [newHouseName, setNewHouseName] = useState('');
  const [newHouseCode, setNewHouseCode] = useState('');
  const [newHouseColor, setNewHouseColor] = useState('#2563eb');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [catRes] = await Promise.all([
          fetch('/api/admin/config/class-categories').then((r) => r.json()),
        ]);
        if (catRes.success) setCategories(catRes.data);
      } catch {
        error('Error', 'Failed to load student settings.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [error]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/students">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 me-1" />
              Back to Directory
            </Button>
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-900">Student Module Configuration & Masters</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure student-specific categories, houses, admission number sequences, and policy parameters.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Student Categories */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Student Categories</h2>
          </div>
          <span className="text-3xs font-semibold text-slate-400">Used for Fee structures & discounts</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-800">General</span>
              <p className="text-3xs text-slate-400 font-mono">GEN</p>
            </div>
            <span className="text-3xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-800">Scholarship</span>
              <p className="text-3xs text-slate-400 font-mono">SCHOLAR</p>
            </div>
            <span className="text-3xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-800">Staff Child</span>
              <p className="text-3xs text-slate-400 font-mono">STAFF</p>
            </div>
            <span className="text-3xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-800">Orphan</span>
              <p className="text-3xs text-slate-400 font-mono">ORPHAN</p>
            </div>
            <span className="text-3xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
          </div>
        </div>
      </div>

      {/* 2. School Houses */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Student Houses</h2>
          </div>
          <span className="text-3xs font-semibold text-slate-400">Used for Sports & Inter-house competitions</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-red-600 inline-block" />
              <div>
                <span className="font-bold text-xs text-slate-800">Jinnah House</span>
                <p className="text-3xs text-slate-400 font-mono">JINNAH</p>
              </div>
            </div>
            <span className="text-3xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-600 inline-block" />
              <div>
                <span className="font-bold text-xs text-slate-800">Iqbal House</span>
                <p className="text-3xs text-slate-400 font-mono">IQBAL</p>
              </div>
            </div>
            <span className="text-3xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 inline-block" />
              <div>
                <span className="font-bold text-xs text-slate-800">Sir Syed House</span>
                <p className="text-3xs text-slate-400 font-mono">SYED</p>
              </div>
            </div>
            <span className="text-3xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500 inline-block" />
              <div>
                <span className="font-bold text-xs text-slate-800">Liaquat House</span>
                <p className="text-3xs text-slate-400 font-mono">LIAQUAT</p>
              </div>
            </div>
            <span className="text-3xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
