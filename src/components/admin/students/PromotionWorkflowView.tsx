'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  ArrowRight,
  RotateCcw,
  History,
  Users,
  CheckCircle,
  AlertTriangle,
  Info,
  Layers,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Search,
  Filter,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { PromotionDecision } from '@/lib/services/promotion-service';

interface MasterData {
  sessions: any[];
  classes: any[];
  sections: any[];
}

export function PromotionWorkflowView() {
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'workflow' | 'history'>('workflow');
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [masters, setMasters] = useState<MasterData>({ sessions: [], classes: [], sections: [] });

  // Step 1: Selection Form State
  const [actionType, setActionType] = useState<'PROMOTE' | 'GRADUATE'>('PROMOTE');
  const [sourceSessionId, setSourceSessionId] = useState('');
  const [targetSessionId, setTargetSessionId] = useState('');
  const [sourceClassId, setSourceClassId] = useState('');
  const [sourceSectionId, setSourceSectionId] = useState('ALL');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('ALL');

  // Step 2: Preview State
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [isTerminalClass, setIsTerminalClass] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<Record<string, { decision: PromotionDecision; targetSectionId?: string; rollNumber?: string; remarks?: string }>>({});

  // Confirmation Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  // Batch History State
  const [batches, setBatches] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [rollbackBatch, setRollbackBatch] = useState<any>(null);
  const [rollbackReason, setRollbackReason] = useState('');
  const [isRollingBack, setIsRollingBack] = useState(false);

  // 1. Fetch Masters
  useEffect(() => {
    async function loadMasters() {
      try {
        const [sessRes, classRes, secRes] = await Promise.all([
          fetch('/api/admin/config/sessions'),
          fetch('/api/admin/config/classes'),
          fetch('/api/admin/config/sections'),
        ]);

        const [sessJson, classJson, secJson] = await Promise.all([
          sessRes.json(),
          classRes.json(),
          secRes.json(),
        ]);

        const sList = sessJson.data?.sessions || sessJson.data || [];
        const cList = classJson.data?.classes || classJson.data || [];
        const scList = secJson.data?.sections || secJson.data || [];

        setMasters({ sessions: sList, classes: cList, sections: scList });

        // Auto-select current session
        const currentSess = sList.find((s: any) => s.isCurrent) || sList[0];
        if (currentSess) {
          setSourceSessionId(currentSess.id);
          const otherSess = sList.find((s: any) => s.id !== currentSess.id);
          if (otherSess) setTargetSessionId(otherSess.id);
        }

        if (cList.length > 0) {
          setSourceClassId(cList[0].id);
        }
      } catch (err) {
        console.error('Failed to load master configuration', err);
      } finally {
        setLoadingMasters(false);
      }
    }
    loadMasters();
  }, []);

  // Update target class suggestion and Action Type when source class changes
  useEffect(() => {
    if (!sourceClassId || masters.classes.length === 0) return;

    const currentIndex = masters.classes.findIndex((c) => c.id === sourceClassId);
    const highest = currentIndex === masters.classes.length - 1;
    setIsTerminalClass(highest);

    if (highest) {
      // Auto-suggest Graduation for the terminal/final class
      setActionType('GRADUATE');
      setTargetClassId('');
    } else {
      // Default to Promotion for normal intermediate classes
      setActionType('PROMOTE');
      const nextClass = masters.classes[currentIndex + 1];
      if (nextClass) setTargetClassId(nextClass.id);
    }
  }, [sourceClassId, masters.classes]);

  const isGraduation = actionType === 'GRADUATE';

  // Load Preview
  const handleLoadPreview = async () => {
    if (!sourceSessionId || !sourceClassId) {
      error('Validation', 'Please select source session and source class.');
      return;
    }
    if (!isGraduation && !targetSessionId) {
      error('Validation', 'Please select target academic session.');
      return;
    }
    if (!isGraduation && !targetClassId) {
      error('Validation', 'Please select target class for promotion.');
      return;
    }

    setLoadingPreview(true);
    try {
      const url = `/api/admin/students/promotion/preview?sourceSessionId=${sourceSessionId}&sourceClassId=${sourceClassId}&sourceSectionId=${sourceSectionId}&targetClassId=${targetClassId}`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.success) {
        const studentList = json.data.students || [];
        setStudents(studentList);
        setIsTerminalClass(json.data.isTerminalClass);

        // Populate default decisions based on selected Action Type
        const initDecisions: Record<string, any> = {};
        for (const s of studentList) {
          initDecisions[s.studentId] = {
            decision: !s.isEligible ? 'EXCLUDE' : (isGraduation ? 'GRADUATE' : 'PROMOTE'),
            targetSectionId: targetSectionId !== 'ALL' ? targetSectionId : undefined,
            rollNumber: s.currentRollNumber || undefined,
          };
        }
        setDecisions(initDecisions);
        setPreviewLoaded(true);
        setExecutionResult(null);
      } else {
        error('Preview Failed', json.error?.message || 'Could not load student preview.');
      }
    } catch {
      error('Network Error', 'Failed to fetch student preview roster.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Bulk Apply Decision
  const handleBulkSetDecision = (decision: PromotionDecision) => {
    const updated = { ...decisions };
    for (const s of students) {
      if (s.isEligible || decision === 'EXCLUDE') {
        updated[s.studentId] = {
          ...updated[s.studentId],
          decision,
        };
      }
    }
    setDecisions(updated);
  };

  // Compute Decision Counts
  const counts = {
    promote: 0,
    repeat: 0,
    graduate: 0,
    hold: 0,
    exclude: 0,
  };

  for (const s of students) {
    const dec = decisions[s.studentId]?.decision || 'EXCLUDE';
    if (dec === 'PROMOTE') counts.promote++;
    else if (dec === 'REPEAT') counts.repeat++;
    else if (dec === 'GRADUATE') counts.graduate++;
    else if (dec === 'HOLD') counts.hold++;
    else if (dec === 'EXCLUDE') counts.exclude++;
  }

  // Execute Batch
  const handleProcessBatch = async () => {
    setIsProcessing(true);
    try {
      const studentDecisionPayload = students.map((s) => ({
        studentId: s.studentId,
        decision: decisions[s.studentId]?.decision || 'EXCLUDE',
        targetSectionId: decisions[s.studentId]?.targetSectionId || undefined,
        rollNumber: decisions[s.studentId]?.rollNumber || undefined,
        remarks: decisions[s.studentId]?.remarks || undefined,
      }));

      const res = await fetch('/api/admin/students/promotion/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSessionId,
          targetSessionId: isGraduation && !targetSessionId ? sourceSessionId : targetSessionId,
          sourceClassId,
          sourceSectionId: sourceSectionId !== 'ALL' ? sourceSectionId : undefined,
          targetClassId: targetClassId || undefined,
          targetSectionId: targetSectionId !== 'ALL' ? targetSectionId : undefined,
          isGraduation,
          studentDecisions: studentDecisionPayload,
        }),
      });

      const json = await res.json();
      if (json.success) {
        success(
          isGraduation ? 'Graduation Completed' : 'Promotion Completed',
          `Batch ${json.data.batchNumber} executed successfully.`
        );
        setExecutionResult(json.data);
        setIsConfirmModalOpen(false);
        setPreviewLoaded(false);
        loadBatches();
      } else {
        error('Processing Failed', json.error?.message || 'Could not process batch.');
      }
    } catch {
      error('Network Error', 'Failed to execute batch transaction.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Load Batch History
  const loadBatches = async () => {
    setLoadingBatches(true);
    try {
      const res = await fetch('/api/admin/students/promotion/batches');
      const json = await res.json();
      if (json.success) {
        setBatches(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load batch history', err);
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadBatches();
    }
  }, [activeTab]);

  // Execute Rollback
  const handleRollback = async () => {
    if (!rollbackBatch) return;
    if (!rollbackReason.trim()) {
      error('Validation', 'A rollback reason is required.');
      return;
    }

    setIsRollingBack(true);
    try {
      const res = await fetch(`/api/admin/students/promotion/batches/${rollbackBatch.id}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rollbackReason.trim() }),
      });

      const json = await res.json();
      if (json.success) {
        success('Rollback Successful', `Batch ${rollbackBatch.batchNumber} has been safely rolled back.`);
        setRollbackBatch(null);
        setRollbackReason('');
        loadBatches();
      } else {
        error('Rollback Failed', json.error?.message || 'Could not rollback promotion batch.');
      }
    } catch {
      error('Network Error', 'Failed to connect to rollback service.');
    } finally {
      setIsRollingBack(false);
    }
  };

  const availableSections = masters.sections.filter((s) => s.classId === sourceClassId);
  const targetSections = masters.sections.filter((s) => s.classId === targetClassId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Promotion &amp; Graduation Processing</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Session-end bulk student transitions, next-class promotions, and terminal-grade graduation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('workflow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'workflow'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              New Batch Workflow
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Batch History &amp; Rollback
            </button>
          </div>

          <Link href="/admin/students">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 me-1.5" />
              Student Directory
            </Button>
          </Link>
        </div>
      </div>

      {/* SUCCESS EXECUTION BANNER */}
      {executionResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-emerald-900">
                  {executionResult.isGraduation ? 'Graduation' : 'Promotion'} Batch Successfully Executed! (Batch #{executionResult.batchNumber})
                </h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  All academic records, enrollments, and status transitions were committed atomically to PostgreSQL.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setActiveTab('history')}>
                View in Batch History
              </Button>
              <Link href="/admin/students">
                <Button size="sm" variant="primary">
                  View Student Directory
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-emerald-200/80 text-center">
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-3xs font-bold text-slate-400 uppercase block">Promoted</span>
              <span className="text-base font-bold text-emerald-700">{executionResult.promotedCount}</span>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-3xs font-bold text-slate-400 uppercase block">Repeated</span>
              <span className="text-base font-bold text-amber-700">{executionResult.repeatedCount}</span>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-3xs font-bold text-slate-400 uppercase block">Graduated</span>
              <span className="text-base font-bold text-purple-700">{executionResult.graduatedCount}</span>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-3xs font-bold text-slate-400 uppercase block">Held</span>
              <span className="text-base font-bold text-blue-700">{executionResult.heldCount}</span>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-3xs font-bold text-slate-400 uppercase block">Excluded</span>
              <span className="text-base font-bold text-slate-600">{executionResult.excludedCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: WORKFLOW */}
      {activeTab === 'workflow' && (
        <div className="space-y-6">
          {/* STEP 1: SELECTION CARD */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center border border-blue-200">
                  1
                </span>
                <h2 className="text-sm font-bold text-slate-900">Define Batch &amp; Operation Action Type</h2>
              </div>
            </div>

            {/* EXPLICIT ACTION TYPE SELECTOR */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Select Operation Action Type *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Promote Students */}
                <div
                  onClick={() => {
                    setActionType('PROMOTE');
                    const currentIndex = masters.classes.findIndex((c) => c.id === sourceClassId);
                    const nextClass = masters.classes[currentIndex + 1];
                    if (nextClass) setTargetClassId(nextClass.id);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                    actionType === 'PROMOTE'
                      ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-100 text-blue-950'
                      : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl ${
                      actionType === 'PROMOTE' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">Promote Students</span>
                      {!isTerminalClass && (
                        <span className="text-3xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                          Standard Progression
                        </span>
                      )}
                    </div>
                    <p className="text-2xs text-slate-500 leading-relaxed">
                      Advances eligible students into the next academic class in the upcoming session. Creates new active enrollments.
                    </p>
                  </div>
                </div>

                {/* 2. Graduate / Complete Students */}
                <div
                  onClick={() => {
                    setActionType('GRADUATE');
                    setTargetClassId('');
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                    actionType === 'GRADUATE'
                      ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-100 text-purple-950'
                      : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl ${
                      actionType === 'GRADUATE'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">Graduate / Complete Students</span>
                      {isTerminalClass && (
                        <span className="text-3xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                          Suggested for Final Class
                        </span>
                      )}
                    </div>
                    <p className="text-2xs text-slate-500 leading-relaxed">
                      Closes final class enrollment and marks students as Graduated. All transcripts, exams, and accounts remain permanently intact.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SELECTION GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* SOURCE SECTION */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-4">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Source Placement (Current Roster)
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-2xs font-bold text-slate-600 mb-1">
                      Current Academic Session *
                    </label>
                    <select
                      value={sourceSessionId}
                      onChange={(e) => setSourceSessionId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      {masters.sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code}) {s.isCurrent ? '★ Current Active' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-2xs font-bold text-slate-600 mb-1">Class *</label>
                      <select
                        value={sourceClassId}
                        onChange={(e) => setSourceClassId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        {masters.classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-2xs font-bold text-slate-600 mb-1">Section</label>
                      <select
                        value={sourceSectionId}
                        onChange={(e) => setSourceSectionId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="ALL">All Sections</option>
                        {availableSections.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* TARGET SECTION */}
              <div
                className={`p-4 rounded-xl border space-y-4 ${
                  actionType === 'PROMOTE'
                    ? 'bg-blue-50/40 border-blue-200'
                    : 'bg-purple-50/40 border-purple-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider block ${
                      actionType === 'PROMOTE' ? 'text-blue-900' : 'text-purple-900'
                    }`}
                  >
                    {actionType === 'PROMOTE' ? 'Target Placement (Next Session)' : 'Graduation & Completion Details'}
                  </span>
                </div>

                <div className="space-y-3">
                  {actionType === 'PROMOTE' ? (
                    <>
                      <div>
                        <label className="block text-2xs font-bold text-slate-700 mb-1">
                          Target Academic Session *
                        </label>
                        <select
                          value={targetSessionId}
                          onChange={(e) => setTargetSessionId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        >
                          {masters.sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.code}) {s.isCurrent ? '★ Current' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-2xs font-bold text-slate-700 mb-1">
                            Target Class *
                          </label>
                          <select
                            value={targetClassId}
                            onChange={(e) => setTargetClassId(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          >
                            {masters.classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-2xs font-bold text-slate-700 mb-1">
                            Default Section
                          </label>
                          <select
                            value={targetSectionId}
                            onChange={(e) => setTargetSectionId(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          >
                            <option value="ALL">Auto / Retain Section</option>
                            {targetSections.map((sec) => (
                              <option key={sec.id} value={sec.id}>
                                {sec.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-purple-100/60 p-4 rounded-xl border border-purple-200 text-xs text-purple-900 space-y-2">
                      <div className="flex items-center gap-2 font-bold">
                        <GraduationCap className="w-4 h-4 text-purple-700" />
                        Final Program Graduation
                      </div>
                      <p className="text-2xs text-purple-800 leading-relaxed">
                        Students processed under this batch will have their current academic session enrollments marked as <strong>GRADUATED</strong>. No subsequent class enrollments will be generated. Historical transcripts, fee vouchers, and exam results remain permanently accessible.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={handleLoadPreview}
                isLoading={loadingPreview}
                disabled={loadingMasters}
                className={actionType === 'GRADUATE' ? 'bg-purple-700 hover:bg-purple-800' : ''}
              >
                <Users className="w-4 h-4 me-1.5" />
                Load Student Roster Preview
              </Button>
            </div>
          </div>

          {/* STEP 2: PREVIEW & REVIEW EXCEPTIONS */}
          {previewLoaded && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center border border-blue-200">
                    2
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      {isGraduation ? 'Review Graduation Roster & Exceptions' : 'Review Promotion Roster & Exceptions'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {students.length} students loaded. Set individual decisions, override target sections, or hold students.
                    </p>
                  </div>
                </div>

                {/* Bulk Decision Toolbar */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-3xs font-bold text-slate-400 uppercase me-1">Set All:</span>
                  {!isGraduation && (
                    <button
                      onClick={() => handleBulkSetDecision('PROMOTE')}
                      className="px-2.5 py-1 rounded-lg text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                    >
                      Promote All
                    </button>
                  )}
                  {isGraduation && (
                    <button
                      onClick={() => handleBulkSetDecision('GRADUATE')}
                      className="px-2.5 py-1 rounded-lg text-3xs font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition"
                    >
                      Graduate All
                    </button>
                  )}
                  <button
                    onClick={() => handleBulkSetDecision('REPEAT')}
                    className="px-2.5 py-1 rounded-lg text-3xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition"
                  >
                    Repeat All
                  </button>
                  <button
                    onClick={() => handleBulkSetDecision('HOLD')}
                    className="px-2.5 py-1 rounded-lg text-3xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                  >
                    Hold All
                  </button>
                </div>
              </div>

              {/* Mode Context Banner */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  isGraduation
                    ? 'bg-purple-50/80 border-purple-200 text-purple-900 font-medium'
                    : 'bg-blue-50/80 border-blue-200 text-blue-900 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    <strong>Current Operation:</strong>{' '}
                    {isGraduation
                      ? 'Graduation Batch (Terminal class program completion)'
                      : `Promotion Batch (${masters.classes.find((c) => c.id === sourceClassId)?.name || 'Class'} → ${masters.classes.find((c) => c.id === targetClassId)?.name || 'Next Class'})`}
                  </span>
                </div>
                <span className="font-mono text-3xs font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                  {students.filter((s) => s.isEligible).length} of {students.length} Eligible
                </span>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-3xs tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Current Placement</th>
                      <th className="py-2.5 px-3">Roll #</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Student Decision</th>
                      <th className="py-2.5 px-3">Target Placement</th>
                      <th className="py-2.5 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {students.map((s, idx) => {
                      const dec = decisions[s.studentId]?.decision || 'EXCLUDE';
                      return (
                        <tr
                          key={s.studentId}
                          className={`hover:bg-slate-50/80 transition ${
                            !s.isEligible ? 'bg-slate-50/50 opacity-70' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono text-slate-400 text-3xs">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{s.studentName}</div>
                            {s.studentNameUr && <div className="text-3xs text-slate-500 font-urdu">{s.studentNameUr}</div>}
                            <span className="font-mono text-3xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                              {s.admissionNo}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-medium text-slate-700">
                              {s.currentClassName} - {s.currentSectionName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-3xs">{s.currentRollNumber || '-'}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-3xs font-bold uppercase ${
                                s.currentStatus === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {s.currentStatus}
                            </span>
                            {!s.isEligible && (
                              <span className="block text-3xs text-rose-600 mt-0.5">{s.ineligibleReason}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={dec}
                              disabled={!s.isEligible}
                              onChange={(e) => {
                                setDecisions({
                                  ...decisions,
                                  [s.studentId]: {
                                    ...decisions[s.studentId],
                                    decision: e.target.value as PromotionDecision,
                                  },
                                });
                              }}
                              className={`border rounded-lg px-2 py-1 text-xs font-bold focus:outline-none ${
                                dec === 'PROMOTE'
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                  : dec === 'GRADUATE'
                                  ? 'bg-purple-50 border-purple-300 text-purple-800'
                                  : dec === 'REPEAT'
                                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                                  : dec === 'HOLD'
                                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                                  : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}
                            >
                              {!isGraduation && <option value="PROMOTE">Promote</option>}
                              {isGraduation && <option value="GRADUATE">Graduate</option>}
                              <option value="REPEAT">Repeat Class</option>
                              <option value="HOLD">Hold / Pending</option>
                              <option value="EXCLUDE">Exclude from Batch</option>
                            </select>
                          </td>
                          <td className="py-2.5 px-3">
                            {dec === 'PROMOTE' ? (
                              <select
                                value={decisions[s.studentId]?.targetSectionId || ''}
                                onChange={(e) => {
                                  setDecisions({
                                    ...decisions,
                                    [s.studentId]: {
                                      ...decisions[s.studentId],
                                      targetSectionId: e.target.value,
                                    },
                                  });
                                }}
                                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-2xs"
                              >
                                <option value="">Auto Section</option>
                                {targetSections.map((sec) => (
                                  <option key={sec.id} value={sec.id}>
                                    {sec.name}
                                  </option>
                                ))}
                              </select>
                            ) : dec === 'REPEAT' ? (
                              <select
                                value={decisions[s.studentId]?.targetSectionId || s.currentSectionId}
                                onChange={(e) => {
                                  setDecisions({
                                    ...decisions,
                                    [s.studentId]: {
                                      ...decisions[s.studentId],
                                      targetSectionId: e.target.value,
                                    },
                                  });
                                }}
                                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-2xs"
                              >
                                {availableSections.map((sec) => (
                                  <option key={sec.id} value={sec.id}>
                                    {sec.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-3xs text-slate-400 italic">N/A (Graduation/Hold)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              placeholder="Notes..."
                              value={decisions[s.studentId]?.remarks || ''}
                              onChange={(e) => {
                                setDecisions({
                                  ...decisions,
                                  [s.studentId]: {
                                    ...decisions[s.studentId],
                                    remarks: e.target.value,
                                  },
                                });
                              }}
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-3xs w-28 focus:outline-none focus:ring-1 focus:ring-blue-200"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Summary Bar & Action Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-4 text-xs font-bold flex-wrap">
                  <span className="text-slate-600">Batch Decisions:</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Promote: {counts.promote}
                  </span>
                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Repeat: {counts.repeat}
                  </span>
                  <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    Graduate: {counts.graduate}
                  </span>
                  <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Hold: {counts.hold}
                  </span>
                  <span className="text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded">
                    Excluded: {counts.exclude}
                  </span>
                </div>

                <Button
                  variant="primary"
                  onClick={() => setIsConfirmModalOpen(true)}
                  disabled={counts.promote === 0 && counts.repeat === 0 && counts.graduate === 0}
                  className={isGraduation ? 'bg-purple-700 hover:bg-purple-800' : ''}
                >
                  <ShieldCheck className="w-4 h-4 me-1.5" />
                  Proceed to Final Confirmation
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BATCH HISTORY & ROLLBACK */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Promotion &amp; Graduation Batch History</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit trail of past bulk runs with breakdown statistics and transactional rollback controls.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={loadBatches} isLoading={loadingBatches}>
              <RotateCcw className="w-3.5 h-3.5 me-1.5" />
              Refresh History
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-3xs tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Batch #</th>
                  <th className="py-2.5 px-3">Execution Date</th>
                  <th className="py-2.5 px-3">Source &rarr; Target</th>
                  <th className="py-2.5 px-3">Operation / Class</th>
                  <th className="py-2.5 px-3">Students Summary</th>
                  <th className="py-2.5 px-3">Processed By</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {batches.length > 0 ? (
                  batches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{b.batchNumber}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-3xs">
                        {new Date(b.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800">{b.sourceSession?.name}</span>
                        <ArrowRight className="w-3 h-3 inline mx-1 text-slate-400" />
                        <span className="font-semibold text-purple-800">{b.targetSession?.name}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-700">{b.sourceClass?.name}</span>
                        <ArrowRight className="w-3 h-3 inline mx-1 text-slate-400" />
                        <span
                          className={`font-bold ${
                            b.isGraduation ? 'text-purple-700' : 'text-slate-900'
                          }`}
                        >
                          {b.isGraduation ? 'Graduation Batch' : b.targetClass?.name || 'Class'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-3xs font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                            P: {b.promotedCount}
                          </span>
                          <span className="text-3xs font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                            R: {b.repeatedCount}
                          </span>
                          <span className="text-3xs font-bold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                            G: {b.graduatedCount}
                          </span>
                          <span className="text-3xs font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                            H: {b.heldCount}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-3xs text-slate-500">
                        {b.processedBy?.username || 'Administrator'}
                      </td>
                      <td className="py-2.5 px-3">
                        {b.isRolledBack ? (
                          <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                            Rolled Back
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                            Committed
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-end">
                        {!b.isRolledBack ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRollbackBatch(b);
                              setRollbackReason('');
                            }}
                            className="border-rose-200 text-rose-700 hover:bg-rose-50 text-3xs"
                          >
                            <RotateCcw className="w-3 h-3 me-1" />
                            Rollback
                          </Button>
                        ) : (
                          <span className="text-3xs text-slate-400 italic">Reverted</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-xs text-slate-400">
                      No bulk promotion batches executed yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title={isGraduation ? 'Confirm Graduation Batch Processing' : 'Confirm Promotion Batch Processing'}
        maxWidth="lg"
      >
        <div className="space-y-5">
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              isGraduation ? 'bg-purple-50 border-purple-200' : 'bg-amber-50 border-amber-200'
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                isGraduation ? 'text-purple-600' : 'text-amber-600'
              }`}
            />
            <div
              className={`text-xs leading-relaxed space-y-1 ${
                isGraduation ? 'text-purple-950' : 'text-amber-950'
              }`}
            >
              <strong className="font-bold block">
                {isGraduation ? 'Graduation Batch Confirmation:' : 'Promotion Batch Confirmation:'}
              </strong>
              {isGraduation
                ? 'This action will graduate the selected students, closing their final classroom enrollment. All historical academic records, invoices, and exam results remain permanently intact.'
                : 'This action will close current enrollments in the source session and create active new-session enrollments for all promoted students.'}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase block">
              Final Processing Summary
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-bold">
              <div className="bg-white p-2 rounded-lg border border-emerald-200 text-emerald-700">
                <span className="text-3xs text-slate-400 block">Promote</span>
                {counts.promote}
              </div>
              <div className="bg-white p-2 rounded-lg border border-amber-200 text-amber-700">
                <span className="text-3xs text-slate-400 block">Repeat</span>
                {counts.repeat}
              </div>
              <div className="bg-white p-2 rounded-lg border border-purple-200 text-purple-700">
                <span className="text-3xs text-slate-400 block">Graduate</span>
                {counts.graduate}
              </div>
              <div className="bg-white p-2 rounded-lg border border-blue-200 text-blue-700">
                <span className="text-3xs text-slate-400 block">Hold</span>
                {counts.hold}
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 text-slate-600">
                <span className="text-3xs text-slate-400 block">Excluded</span>
                {counts.exclude}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isProcessing}
              onClick={handleProcessBatch}
              className={isGraduation ? 'bg-purple-700 hover:bg-purple-800' : 'bg-blue-600 hover:bg-blue-700'}
            >
              <CheckCircle className="w-4 h-4 me-1.5" />
              {isGraduation ? 'Execute Graduation Batch' : 'Execute Promotion Batch'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ROLLBACK MODAL */}
      <Modal
        isOpen={!!rollbackBatch}
        onClose={() => setRollbackBatch(null)}
        title="Rollback Promotion / Graduation Batch"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong>Rollback Warning:</strong> Rolling back Batch #{rollbackBatch?.batchNumber} will revert all target enrollments/graduation statuses and restore all source enrollments to active status.
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Rollback Mandatory Reason *
            </label>
            <textarea
              value={rollbackReason}
              onChange={(e) => setRollbackReason(e.target.value)}
              placeholder="State administrative reason for rolling back this batch..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setRollbackBatch(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isRollingBack}
              onClick={handleRollback}
              className="bg-rose-600 hover:bg-rose-700"
            >
              <RotateCcw className="w-4 h-4 me-1.5" />
              Confirm Safe Rollback
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
