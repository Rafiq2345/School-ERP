'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Plus,
  Trash2,
  Edit2,
  Layers,
  Shield,
  HelpCircle,
  RefreshCw,
  X,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { DetectedField, FieldType } from '@/lib/services/form-analyzer-service';

interface AIFormAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFieldsApproved: () => void;
}

const AVAILABLE_SECTIONS = [
  'Student Personal Details',
  'Academic Information',
  'Parent/Guardian',
  'Contact Information',
  'Address',
  'Medical Information',
  'Previous School',
  'Documents',
  'Other Information',
];

const AVAILABLE_TYPES: FieldType[] = [
  'TEXT',
  'NUMBER',
  'DATE',
  'DROPDOWN',
  'MULTISELECT',
  'CHECKBOX',
  'TEXTAREA',
];

export function AIFormAnalyzerModal({ isOpen, onClose, onFieldsApproved }: AIFormAnalyzerModalProps) {
  const { success, error, info } = useToast();

  const [step, setStep] = useState<'upload' | 'analyzing' | 'review'>('upload');
  const [fileName, setFileName] = useState('Beaconhouse_Admission_Form_2026.pdf');
  const [rawText, setRawText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('STANDARD_COMPREHENSIVE');

  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([]);
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('ALL');
  const [isApproving, setIsApproving] = useState(false);

  // Inline editing state for a specific field
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  const handleStartAnalysis = async () => {
    setStep('analyzing');
    try {
      const res = await fetch('/api/admin/students/form-analyzer/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          rawContentText: rawText || undefined,
          templatePreset: selectedTemplate,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setDetectedFields(json.data.detectedFields);
        setStep('review');
        success(
          'Analysis Complete',
          `Detected ${json.data.summary.total} fields (${json.data.summary.standardMapped} standard matches, ${json.data.summary.customSuggested} custom suggested).`
        );
      } else {
        error('Analysis Failed', json.error?.message || 'Could not analyze document.');
        setStep('upload');
      }
    } catch {
      error('Network Error', 'Failed to connect to AI Form Analyzer.');
      setStep('upload');
    }
  };

  const handleActionChange = (id: string, action: DetectedField['action']) => {
    setDetectedFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, action } : f))
    );
  };

  const handleFieldChange = (id: string, updates: Partial<DetectedField>) => {
    setDetectedFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleAddManualField = () => {
    const newField: DetectedField = {
      id: `manual-${Date.now()}`,
      rawLabel: 'New Custom Field',
      fieldLabel: 'New Custom Field',
      fieldKey: `custom_field_${Date.now().toString(36)}`,
      fieldType: 'TEXT',
      isRequired: false,
      section: 'Other Information',
      action: 'CREATE_CUSTOM',
      confidenceScore: 1.0,
    };
    setDetectedFields((prev) => [...prev, newField]);
    setEditingFieldId(newField.id);
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= detectedFields.length) return;

    const copy = [...detectedFields];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setDetectedFields(copy);
  };

  const handleApproveAndCommit = async () => {
    const fieldsToCreate = detectedFields
      .filter((f) => f.action === 'CREATE_CUSTOM')
      .map((f, idx) => ({
        fieldLabel: f.fieldLabel,
        fieldKey: f.fieldKey,
        fieldType: f.fieldType,
        isRequired: f.isRequired,
        section: f.section,
        options: f.options,
        sortOrder: idx + 1,
      }));

    if (fieldsToCreate.length === 0) {
      info('No Custom Fields', 'No new custom fields were selected for creation.');
      onClose();
      return;
    }

    setIsApproving(true);
    try {
      const res = await fetch('/api/admin/students/form-analyzer/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: fieldsToCreate }),
      });

      const json = await res.json();
      if (json.success) {
        success(
          'Custom Fields Created',
          `Successfully created and activated ${json.data.createdCount} custom field(s).`
        );
        onFieldsApproved();
        onClose();
      } else {
        error('Approval Failed', json.error?.message || 'Could not create custom fields.');
      }
    } catch {
      error('Network Error', 'Failed to approve custom fields.');
    } finally {
      setIsApproving(false);
    }
  };

  const filteredFields = detectedFields.filter((f) =>
    selectedSectionFilter === 'ALL' ? true : f.section === selectedSectionFilter
  );

  const customFieldsCount = detectedFields.filter((f) => f.action === 'CREATE_CUSTOM').length;
  const standardFieldsCount = detectedFields.filter((f) => f.action === 'MAP_TO_STANDARD').length;
  const ignoredFieldsCount = detectedFields.filter((f) => f.action === 'IGNORE').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Form-to-Fields Generator"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Safety Header Banner */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-blue-900 block">AI-Assisted Configuration Suggestion</span>
            <p className="text-blue-800/80 mt-0.5 leading-relaxed">
              Upload your school&apos;s existing printed/PDF admission form. AI detects standard student fields and suggests necessary custom fields. <strong>No fields are added to your ERP until you review and click Approve.</strong>
            </p>
          </div>
        </div>

        {/* STEP 1: UPLOAD FORM */}
        {step === 'upload' && (
          <div className="space-y-5">
            <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 rounded-2xl p-8 text-center transition-all">
              <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center mx-auto mb-3 text-blue-600">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">Upload School Admission Form</p>
              <p className="text-xs text-slate-500 mt-1">
                Drag and drop your PDF form or scanned image (PDF, PNG, JPG, WebP)
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFileName(e.target.files[0].name);
                      }
                    }}
                  />
                  <span className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 shadow-xs">
                    Choose Local File
                  </span>
                </label>
                <span className="text-xs text-slate-400 font-mono">{fileName}</span>
              </div>
            </div>

            {/* Quick Template Presets */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Or Select a Sample School Form Template:</span>
                <span className="text-3xs text-slate-400">Pre-loaded formats</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setFileName('Comprehensive_Private_School_Form.pdf');
                    setSelectedTemplate('STANDARD_COMPREHENSIVE');
                  }}
                  className="p-3 bg-white border border-slate-200 hover:border-blue-400 rounded-xl text-start transition-all cursor-pointer"
                >
                  <span className="font-bold text-slate-900 block">Comprehensive Form</span>
                  <span className="text-3xs text-slate-500">Standard + Medical + Bus Route</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFileName('Religious_Academy_Admission.pdf');
                    setSelectedTemplate('ISLAMIC_ACADEMY');
                  }}
                  className="p-3 bg-white border border-slate-200 hover:border-blue-400 rounded-xl text-start transition-all cursor-pointer"
                >
                  <span className="font-bold text-slate-900 block">Islamic Academy Form</span>
                  <span className="text-3xs text-slate-500">Includes Hafiz-e-Quran & Urdu</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFileName('Cambridge_O_Levels_Admission.pdf');
                    setSelectedTemplate('CAMBRIDGE_SYSTEM');
                  }}
                  className="p-3 bg-white border border-slate-200 hover:border-blue-400 rounded-xl text-start transition-all cursor-pointer"
                >
                  <span className="font-bold text-slate-900 block">Cambridge / O-Levels</span>
                  <span className="text-3xs text-slate-500">House, Subject stream & Hospital</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="md" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="md" onClick={handleStartAnalysis}>
                <Sparkles className="w-4 h-4 me-1.5" />
                Analyze Form with AI
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: ANALYZING SPINNER */}
        {step === 'analyzing' && (
          <div className="py-12 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-900">Analyzing Form Structure & Matching Standard Fields...</p>
              <p className="text-xs text-slate-500 mt-1">Comparing detected fields against Student, Guardian, and Academic masters.</p>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & MAPPING TABLE */}
        {step === 'review' && (
          <div className="space-y-4">
            {/* Top Metrics & Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3 text-xs">
                <span className="font-bold text-slate-800">
                  Total Detected: <strong className="text-slate-900">{detectedFields.length}</strong>
                </span>
                <span>&bull;</span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {standardFieldsCount} Standard Matches
                </span>
                <span>&bull;</span>
                <span className="text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  {customFieldsCount} New Custom Fields
                </span>
                {ignoredFieldsCount > 0 && (
                  <>
                    <span>&bull;</span>
                    <span className="text-slate-500 font-semibold bg-slate-200 px-2 py-0.5 rounded-full">
                      {ignoredFieldsCount} Ignored
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedSectionFilter}
                  onChange={(e) => setSelectedSectionFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                >
                  <option value="ALL">All Sections</option>
                  {AVAILABLE_SECTIONS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>

                <Button variant="outline" size="sm" onClick={handleAddManualField}>
                  <Plus className="w-3.5 h-3.5 me-1" />
                  Add Field
                </Button>
              </div>
            </div>

            {/* Review Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-3xs tracking-wider sticky top-0 bg-slate-50 z-10">
                  <tr>
                    <th className="px-3 py-2.5 text-start">Detected Label</th>
                    <th className="px-3 py-2.5 text-start">Field Key</th>
                    <th className="px-3 py-2.5 text-start">Type</th>
                    <th className="px-3 py-2.5 text-start">Section</th>
                    <th className="px-3 py-2.5 text-center">Required?</th>
                    <th className="px-3 py-2.5 text-start">Decision / Action</th>
                    <th className="px-3 py-2.5 text-end">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredFields.map((f, idx) => {
                    const isEditing = editingFieldId === f.id;
                    const isStandard = f.action === 'MAP_TO_STANDARD';
                    const isCustom = f.action === 'CREATE_CUSTOM';
                    const isIgnored = f.action === 'IGNORE';

                    return (
                      <tr
                        key={f.id}
                        className={`transition-colors ${
                          isStandard
                            ? 'bg-emerald-50/30'
                            : isCustom
                            ? 'bg-indigo-50/20'
                            : 'bg-slate-50/60 opacity-60'
                        }`}
                      >
                        {/* Label */}
                        <td className="px-3 py-2.5 font-semibold text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={f.fieldLabel}
                              onChange={(e) => handleFieldChange(f.id, { fieldLabel: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
                            />
                          ) : (
                            <div>
                              <span>{f.fieldLabel}</span>
                              {f.standardMatchDescription && (
                                <p className="text-3xs text-emerald-700 font-normal">{f.standardMatchDescription}</p>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Key */}
                        <td className="px-3 py-2.5 font-mono text-3xs text-slate-500">
                          {isEditing ? (
                            <input
                              type="text"
                              value={f.fieldKey}
                              onChange={(e) => handleFieldChange(f.id, { fieldKey: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono"
                            />
                          ) : (
                            f.fieldKey
                          )}
                        </td>

                        {/* Type */}
                        <td className="px-3 py-2.5">
                          {isEditing ? (
                            <select
                              value={f.fieldType}
                              onChange={(e) => handleFieldChange(f.id, { fieldType: e.target.value as FieldType })}
                              className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
                            >
                              {AVAILABLE_TYPES.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="font-mono text-3xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                              {f.fieldType}
                            </span>
                          )}
                        </td>

                        {/* Section */}
                        <td className="px-3 py-2.5 text-slate-700">
                          {isEditing ? (
                            <select
                              value={f.section}
                              onChange={(e) => handleFieldChange(f.id, { section: e.target.value })}
                              className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
                            >
                              {AVAILABLE_SECTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-3xs bg-slate-100 px-2 py-0.5 rounded-full font-semibold">
                              {f.section}
                            </span>
                          )}
                        </td>

                        {/* Required */}
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={f.isRequired}
                            onChange={(e) => handleFieldChange(f.id, { isRequired: e.target.checked })}
                            disabled={isStandard}
                            className="rounded text-blue-600"
                          />
                        </td>

                        {/* Action */}
                        <td className="px-3 py-2.5">
                          <select
                            value={f.action}
                            onChange={(e) => handleActionChange(f.id, e.target.value as any)}
                            className="border border-slate-200 rounded-lg px-2 py-1 text-2xs font-bold bg-white"
                          >
                            <option value="MAP_TO_STANDARD">Map to Standard Field</option>
                            <option value="CREATE_CUSTOM">Create Custom Field</option>
                            <option value="IGNORE">Ignore / Skip</option>
                          </select>
                        </td>

                        {/* Edit & Reorder Controls */}
                        <td className="px-3 py-2.5 text-end">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingFieldId(isEditing ? null : f.id)}
                              className="p-1 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-slate-600"
                              title="Edit Field Configuration"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveField(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-slate-400 disabled:opacity-30"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveField(idx, 'down')}
                              disabled={idx === detectedFields.length - 1}
                              className="p-1 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-slate-400 disabled:opacity-30"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStep('upload');
                  setEditingFieldId(null);
                }}
              >
                &larr; Re-Upload / Change Form
              </Button>

              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApproveAndCommit}
                  isLoading={isApproving}
                >
                  <CheckCircle className="w-4 h-4 me-1.5" />
                  Approve & Create Custom Fields ({customFieldsCount})
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
