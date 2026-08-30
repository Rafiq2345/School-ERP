'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package,
  Search,
  CheckCircle2,
  XCircle,
  Lock,
  ChevronDown,
  ChevronUp,
  Layers,
  AlertTriangle,
  Sliders,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface FeatureItem {
  key: string;
  nameEn: string;
  nameUr: string;
  descriptionEn: string;
  isBaseFeature: boolean;
  isEnabled: boolean;
  dependsOn?: string[];
}

interface ModuleItem {
  code: string;
  nameEn: string;
  nameUr: string;
  descriptionEn: string;
  category: string;
  isBaseModule: boolean;
  isProtected: boolean;
  defaultTiers: string[];
  isEnabled: boolean;
  dependsOn?: string[];
  features: FeatureItem[];
}

const CATEGORIES = ['ALL', 'CORE', 'ACADEMIC', 'ADMINISTRATION', 'FINANCE', 'RESOURCES', 'SYSTEM'];

const TIER_BADGES: Record<string, { label: string; color: string }> = {
  BASE: { label: 'Base Core', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  STANDARD: { label: 'Standard', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  FULL: { label: 'Full Suite', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  ENTERPRISE: { label: 'Enterprise', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export function ModuleSettingsView() {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  // Safety Confirmation Dialog State
    const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });

  const { success, error } = useToast();

  const fetchModules = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/modules');
      const json = await res.json();
      if (json.success) {
        setModules(json.data);
      } else {
        error('Failed to load modules', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not reach server.');
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const toggleExpanded = (code: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleToggleModule = async (mod: ModuleItem) => {
    if (mod.isProtected && mod.isEnabled) {
      error('Protected Core Module', `The ${mod.nameEn} module is essential for ERP operations and cannot be disabled.`);
      return;
    }

    const nextState = !mod.isEnabled;
    const executeToggle = async () => {
      setTogglingKey(mod.code);
      try {
        const res = await fetch('/api/admin/modules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moduleCode: mod.code, isEnabled: nextState }),
        });
        const json = await res.json();

        if (json.success) {
          success(
            'Module Status Updated',
            `Module "${mod.nameEn}" is now ${nextState ? 'ENABLED' : 'DISABLED'}.`
          );
          fetchModules();
        } else {
          error('Action Blocked', json.error?.message);
        }
      } catch {
        error('Network Error', 'Failed to update module state.');
      } finally {
        setTogglingKey(null);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    };

    if (!nextState) {
      setConfirmModal({
        isOpen: true,
        title: `Disable "${mod.nameEn}"?`,
        message: `Disabling this module will hide its navigation, dashboard widgets, and operational screens. Historical data in PostgreSQL will NOT be deleted. Are you sure you want to proceed?`,
        onConfirm: executeToggle,
      });
    } else {
      await executeToggle();
    }
  };

  const handleToggleFeature = async (mod: ModuleItem, feat: FeatureItem) => {
    const nextState = !feat.isEnabled;
    setTogglingKey(`${mod.code}.${feat.key}`);
    try {
      const res = await fetch('/api/admin/modules/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleCode: mod.code,
          featureKey: feat.key,
          isEnabled: nextState,
        }),
      });
      const json = await res.json();

      if (json.success) {
        success(
          'Feature Updated',
          `Feature "${feat.nameEn}" in ${mod.nameEn} is now ${nextState ? 'ACTIVE' : 'DISABLED'}.`
        );
        fetchModules();
      } else {
        error('Action Blocked', json.error?.message);
      }
    } catch {
      error('Network Error', 'Failed to update feature state.');
    } finally {
      setTogglingKey(null);
    }
  };

  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      if (selectedCategory !== 'ALL' && m.category !== selectedCategory) {
        return false;
      }
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        m.nameEn.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.descriptionEn.toLowerCase().includes(q) ||
        m.features.some((f) => f.nameEn.toLowerCase().includes(q) || f.key.toLowerCase().includes(q))
      );
    });
  }, [modules, selectedCategory, searchQuery]);

  const enabledCount = useMemo(() => modules.filter((m) => m.isEnabled).length, [modules]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Central Module & Feature Registry</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-3xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                {enabledCount} of {modules.length} Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure core Base ERP and optional enterprise module packaging across the institution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search modules & features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl ps-8 pe-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Modules List Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          Loading configured modules & feature toggles...
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          No modules match your search filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredModules.map((mod) => {
            const isExpanded = expandedModules.has(mod.code);
            const activeFeaturesCount = mod.features.filter((f) => f.isEnabled).length;
            const isToggling = togglingKey === mod.code;

            return (
              <div
                key={mod.code}
                className={`rounded-2xl border transition-all ${
                  mod.isEnabled
                    ? 'bg-white border-slate-200 shadow-2xs'
                    : 'bg-slate-50/70 border-slate-200/70 opacity-80'
                }`}
              >
                {/* Main Module Row */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        mod.isProtected
                          ? 'bg-purple-50 text-purple-700'
                          : mod.isEnabled
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {mod.isProtected ? <Lock className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {mod.nameEn}
                        </span>
                        <span className="text-2xs font-mono text-slate-400">({mod.code})</span>
                        {mod.isProtected ? (
                          <span className="px-2 py-0.5 rounded-md text-3xs font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                            Core Protected
                          </span>
                        ) : mod.isBaseModule ? (
                          <span className="px-2 py-0.5 rounded-md text-3xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Base Core
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-3xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                            Optional Enterprise
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{mod.descriptionEn}</p>

                      {mod.dependsOn && mod.dependsOn.length > 0 && (
                        <p className="text-3xs text-amber-700 font-semibold mt-1">
                          Prerequisite: Requires {mod.dependsOn.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Switch */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 self-end sm:self-auto">
                    {mod.features.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(mod.code)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 transition-colors cursor-pointer"
                      >
                        <span>
                          {activeFeaturesCount} of {mod.features.length} Features
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                    )}

                    {/* Module Toggle Switch */}
                    <label
                      className={`relative inline-flex items-center select-none ${
                        mod.isProtected ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={mod.isEnabled}
                        disabled={mod.isProtected || isToggling}
                        onChange={() => handleToggleModule(mod)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Expanded Features Drawer */}
                {isExpanded && mod.features.length > 0 && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-2 rounded-b-2xl">
                    <h4 className="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Granular Sub-Features ({mod.nameEn})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {mod.features.map((feat) => {
                        const isFeatToggling = togglingKey === `${mod.code}.${feat.key}`;

                        return (
                          <div
                            key={feat.key}
                            className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                              feat.isEnabled && mod.isEnabled
                                ? 'bg-white border-slate-200/80 shadow-2xs'
                                : 'bg-white/50 border-slate-200/50 opacity-60'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-xs text-slate-800 truncate">
                                  {feat.nameEn}
                                </p>
                                {feat.isBaseFeature && (
                                  <span className="px-1.5 py-0.2 rounded text-3xs font-bold bg-slate-100 text-slate-600">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-2xs text-slate-500 mt-0.5 leading-relaxed">
                                {feat.descriptionEn}
                              </p>
                              {feat.dependsOn && (
                                <p className="text-3xs text-amber-600 font-mono mt-1">
                                  Requires: {feat.dependsOn.join(', ')}
                                </p>
                              )}
                            </div>

                            {/* Feature Switch */}
                            <label
                              className={`relative inline-flex items-center shrink-0 mt-0.5 ${
                                !mod.isEnabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={feat.isEnabled && mod.isEnabled}
                                disabled={!mod.isEnabled || isFeatToggling}
                                onChange={() => handleToggleFeature(mod, feat)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Safety Confirmation Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        subtitle="Please confirm before updating module availability."
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={confirmModal.onConfirm}
              isLoading={togglingKey !== null}
            >
              Confirm Disable
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{confirmModal.message}</p>
        </div>
      </Modal>
    </div>
  );
}
