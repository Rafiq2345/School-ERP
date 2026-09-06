'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Layers,
  Building2,
  Compass,
  MapPin,
  Globe,
  Phone,
  Mail,
  User,
  Eye,
  Edit2,
  Power,
  Plus,
  Search,
  X,
  History,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Clock,
  ExternalLink,
  ShieldCheck,
  FileText,
  Lock,
  Unlock,
  Archive,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export interface ZoneItem {
  id: string;
  tenantId: string;
  headOfficeId: string;
  regionId: string | null;
  name: string;
  code: string;
  shortName: string | null;
  countryId: string | null;
  stateId: string | null;
  cityId: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  phone: string | null;
  altPhone: string | null;
  email: string | null;
  website: string | null;
  managerEmployeeId: string | null;
  adminContactEmployeeId: string | null;
  managerName: string | null;
  adminContact: string | null;
  coverageNotes: string | null;
  coveredDistricts: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  headOffice?: { id: string; name: string; code: string; city: string; status: string } | null;
  region?: { id: string; name: string; code: string; shortName: string | null; city: string; status: string; headOfficeId: string } | null;
  countryRef?: { id: string; name: string; isoCode: string; phoneCallingCode: string; currencyCode: string } | null;
  stateRef?: { id: string; name: string; code: string; type: string } | null;
  cityRef?: { id: string; name: string; code: string } | null;
  manager?: {
    id: string;
    employeeNo: string;
    firstNameEn: string;
    lastNameEn: string | null;
    department?: { name: string } | null;
    designation?: { name: string } | null;
  } | null;
  adminContactPerson?: {
    id: string;
    employeeNo: string;
    firstNameEn: string;
    lastNameEn: string | null;
    department?: { name: string } | null;
    designation?: { name: string } | null;
  } | null;
}

interface CountryRef {
  id: string;
  isoCode: string;
  name: string;
  phoneCallingCode: string;
  currencyCode: string;
  currencySymbol: string;
  defaultTimezone: string;
}

interface StateRef {
  id: string;
  countryId: string;
  code: string;
  name: string;
  type: string;
}

interface CityRef {
  id: string;
  stateId: string;
  code: string;
  name: string;
}

interface EmployeeLookupItem {
  id: string;
  employeeNo: string;
  fullName: string;
  firstNameEn: string;
  lastNameEn: string | null;
  department: string | null;
  designation: string | null;
  phone: string | null;
  email: string | null;
}

interface AuditLogItem {
  id: string;
  action: string;
  changeSummary: string | null;
  userId: string | null;
  timestamp: string;
  oldValues: any;
  newValues: any;
}

interface StatsData {
  total: number;
  active: number;
  inactive: number;
  archived: number;
  directHoCount: number;
  headOfficesCount: number;
  regionsCount: number;
  citiesCount: number;
  availableCities: string[];
  availableHeadOffices: { id: string; name: string; code: string; city: string; status: string }[];
  availableRegions: { id: string; name: string; code: string; shortName: string | null; city: string; status: string; headOfficeId: string }[];
}

export function ZonesView() {
  const searchParams = useSearchParams();
  const { success, error } = useToast();

  const [items, setItems] = useState<ZoneItem[]>([]);
  const [stats, setStats] = useState<StatsData>({
    total: 0,
    active: 0,
    inactive: 0,
    archived: 0,
    directHoCount: 0,
    headOfficesCount: 0,
    regionsCount: 0,
    citiesCount: 0,
    availableCities: [],
    availableHeadOffices: [],
    availableRegions: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Reference Masters State
  const [countries, setCountries] = useState<CountryRef[]>([]);
  const [states, setStates] = useState<StateRef[]>([]);
  const [cities, setCities] = useState<CityRef[]>([]);
  const [employees, setEmployees] = useState<EmployeeLookupItem[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [headOfficeFilter, setHeadOfficeFilter] = useState('ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualCodeOverride, setManualCodeOverride] = useState(false);

  // Detail Drawer State
  const [selectedZone, setSelectedZone] = useState<ZoneItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'audit'>('overview');
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Status Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetZone, setTargetZone] = useState<ZoneItem | null>(null);
  const [targetNewStatus, setTargetNewStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    headOfficeId: '',
    regionId: '',
    name: '',
    code: '',
    shortName: '',
    countryId: '',
    stateId: '',
    cityId: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    phone: '',
    altPhone: '',
    email: '',
    website: '',
    managerEmployeeId: '',
    adminContactEmployeeId: '',
    managerName: '',
    adminContact: '',
    coverageNotes: '',
    coveredDistricts: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
    remarks: '',
  });

  // Selected Country for dynamic calling code badge
  const selectedCountryObj = useMemo(() => {
    return countries.find((c) => c.id === formData.countryId) || null;
  }, [countries, formData.countryId]);

  const activeCallingCode = selectedCountryObj?.phoneCallingCode || '+92';

  // Filter available regions by selected headOfficeId in the form
  const formAvailableRegions = useMemo(() => {
    if (!formData.headOfficeId) return stats.availableRegions;
    return stats.availableRegions.filter((r) => r.headOfficeId === formData.headOfficeId);
  }, [stats.availableRegions, formData.headOfficeId]);

  // Fetch list of zones
  const fetchZones = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (headOfficeFilter !== 'ALL') params.set('headOfficeId', headOfficeFilter);
      if (regionFilter !== 'ALL') params.set('regionId', regionFilter);
      if (cityFilter !== 'ALL') params.set('city', cityFilter);

      const res = await fetch(`/api/admin/organization/zones?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data.items || []);
        setStats(data.data.stats || {
          total: 0,
          active: 0,
          inactive: 0,
          archived: 0,
          directHoCount: 0,
          headOfficesCount: 0,
          regionsCount: 0,
          citiesCount: 0,
          availableCities: [],
          availableHeadOffices: [],
          availableRegions: [],
        });
      } else {
        error(data.error?.message || 'Failed to load zones.');
      }
    } catch {
      error('Network error loading zones.');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, headOfficeFilter, regionFilter, cityFilter, error]);

  // Fetch Reference Masters (Countries, Employees)
  const fetchInitialReferenceData = useCallback(async () => {
    try {
      const [countriesRes, employeesRes] = await Promise.all([
        fetch('/api/admin/reference/countries'),
        fetch('/api/admin/employees/lookup'),
      ]);

      const countriesData = await countriesRes.json();
      if (countriesData.success) {
        setCountries(countriesData.data || []);
      }

      const employeesData = await employeesRes.json();
      if (employeesData.success) {
        setEmployees(employeesData.data || []);
      }
    } catch {
      // Fallback silently
    }
  }, []);

  // Fetch States when Country changes
  const fetchStatesForCountry = useCallback(async (countryId: string) => {
    if (!countryId) {
      setStates([]);
      setCities([]);
      return;
    }
    try {
      const res = await fetch(`/api/admin/reference/states?countryId=${countryId}`);
      const data = await res.json();
      if (data.success) {
        setStates(data.data || []);
      }
    } catch {
      setStates([]);
    }
  }, []);

  // Fetch Cities when State changes
  const fetchCitiesForState = useCallback(async (stateId: string) => {
    if (!stateId) {
      setCities([]);
      return;
    }
    try {
      const res = await fetch(`/api/admin/reference/cities?stateId=${stateId}`);
      const data = await res.json();
      if (data.success) {
        setCities(data.data || []);
      }
    } catch {
      setCities([]);
    }
  }, []);

  // Generate Zone Code
  const handleAutoGenerateCode = useCallback(async (cityCodeOrPrefix?: string) => {
    try {
      const prefix = cityCodeOrPrefix || formData.city || 'GEN';
      const res = await fetch(`/api/admin/organization/zones/generate-code?prefix=${encodeURIComponent(prefix)}`);
      const data = await res.json();
      if (data.success && data.data?.code) {
        setFormData((prev) => ({ ...prev, code: data.data.code }));
      }
    } catch {
      // Ignore
    }
  }, [formData.city]);

  // Reset form to defaults
  const resetForm = useCallback(() => {
    const defaultHO = stats.availableHeadOffices[0]?.id || '';
    setFormData({
      headOfficeId: defaultHO,
      regionId: '',
      name: '',
      code: '',
      shortName: '',
      countryId: '',
      stateId: '',
      cityId: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      phone: '',
      altPhone: '',
      email: '',
      website: '',
      managerEmployeeId: '',
      adminContactEmployeeId: '',
      managerName: '',
      adminContact: '',
      coverageNotes: '',
      coveredDistricts: '',
      status: 'ACTIVE',
      remarks: '',
    });
    setManualCodeOverride(false);
    setIsEditing(false);
    setEditingId(null);
  }, [stats.availableHeadOffices]);

  // Open Create Modal
  const handleOpenCreate = useCallback(() => {
    resetForm();
    const defaultHO = stats.availableHeadOffices[0]?.id || '';
    const pk = countries.find((c) => c.isoCode === 'PK');
    setFormData((prev) => ({
      ...prev,
      headOfficeId: defaultHO,
      countryId: pk?.id || '',
      country: pk?.name || 'Pakistan',
    }));
    handleAutoGenerateCode('GEN');
    setIsFormOpen(true);
  }, [resetForm, stats.availableHeadOffices, countries, handleAutoGenerateCode]);

  // Initial Load
  useEffect(() => {
    fetchZones();
    fetchInitialReferenceData();
  }, [fetchZones, fetchInitialReferenceData]);

  // Handle URL search params on mount
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create') {
      handleOpenCreate();
    }
  }, [searchParams, handleOpenCreate]);

  // Cascading location effect in form
  useEffect(() => {
    if (formData.countryId) {
      fetchStatesForCountry(formData.countryId);
    }
  }, [formData.countryId, fetchStatesForCountry]);

  useEffect(() => {
    if (formData.stateId) {
      fetchCitiesForState(formData.stateId);
    }
  }, [formData.stateId, fetchCitiesForState]);

  // Open Edit Modal
  const handleOpenEdit = async (zone: ZoneItem) => {
    setIsEditing(true);
    setEditingId(zone.id);
    setManualCodeOverride(true);

    if (zone.countryId) {
      await fetchStatesForCountry(zone.countryId);
      if (zone.stateId) {
        await fetchCitiesForState(zone.stateId);
      }
    }

    setFormData({
      headOfficeId: zone.headOfficeId || '',
      regionId: zone.regionId || '',
      name: zone.name,
      code: zone.code,
      shortName: zone.shortName || '',
      countryId: zone.countryId || '',
      stateId: zone.stateId || '',
      cityId: zone.cityId || '',
      addressLine1: zone.addressLine1 || '',
      addressLine2: zone.addressLine2 || '',
      city: zone.city || '',
      state: zone.state || '',
      country: zone.country || '',
      postalCode: zone.postalCode || '',
      phone: zone.phone || '',
      altPhone: zone.altPhone || '',
      email: zone.email || '',
      website: zone.website || '',
      managerEmployeeId: zone.managerEmployeeId || '',
      adminContactEmployeeId: zone.adminContactEmployeeId || '',
      managerName: zone.managerName || '',
      adminContact: zone.adminContact || '',
      coverageNotes: zone.coverageNotes || '',
      coveredDistricts: zone.coveredDistricts || '',
      status: zone.status,
      remarks: zone.remarks || '',
    });

    setIsFormOpen(true);
  };

  // Open Detail Drawer
  const handleOpenDetail = async (zone: ZoneItem) => {
    setSelectedZone(zone);
    setDetailTab('overview');
    setIsDetailOpen(true);

    setIsLoadingAudit(true);
    try {
      const res = await fetch(`/api/admin/organization/zones/${zone.id}/audit`);
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.data || []);
      }
    } catch {
      setAuditLogs([]);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // Handle Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      error('Zone Name is required.');
      return;
    }
    if (!formData.code.trim()) {
      error('Zone Code is required.');
      return;
    }
    if (!formData.headOfficeId) {
      error('Parent Head Office is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditing && editingId
        ? `/api/admin/organization/zones/${editingId}`
        : '/api/admin/organization/zones';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        success(isEditing ? 'Zone updated successfully.' : 'Zone created successfully.');
        setIsFormOpen(false);
        resetForm();
        fetchZones();
      } else {
        error(data.error?.message || 'Operation failed.');
      }
    } catch {
      error('Network error during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Status Toggle Modal
  const handleOpenStatusModal = (zone: ZoneItem, newStatus: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED') => {
    setTargetZone(zone);
    setTargetNewStatus(newStatus);
    setStatusReason('');
    setIsStatusModalOpen(true);
  };

  // Confirm Status Toggle
  const handleConfirmStatusChange = async () => {
    if (!targetZone) return;

    setIsStatusSubmitting(true);
    try {
      const res = await fetch(`/api/admin/organization/zones/${targetZone.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetNewStatus,
          reason: statusReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        success(`Zone status updated to ${targetNewStatus}.`);
        setIsStatusModalOpen(false);
        setTargetZone(null);
        fetchZones();
      } else {
        error(data.error?.message || 'Failed to update status.');
      }
    } catch {
      error('Network error updating status.');
    } finally {
      setIsStatusSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Breadcrumb Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Link href="/admin/settings" className="hover:text-brand-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Administration Configuration
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span className="text-slate-900 font-bold">Zone / Area Management</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl border border-purple-200/60 shadow-sm">
              <Layers className="h-6 w-6" />
            </div>
            Zone / Area Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cluster-level academic and operational zones across regions or directly attached to head offices.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchZones}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 border-slate-200"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Zone
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Zones</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
            <span className="text-xs text-slate-500">all clusters</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              {stats.active} Active
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-amber-600">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
              {stats.inactive} Inactive
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Clusters</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{stats.active}</span>
            <span className="text-xs text-slate-500">operational</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {stats.archived > 0 ? `${stats.archived} archived clusters` : 'Full operational integrity'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Parent Head Offices</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-700">{stats.headOfficesCount}</span>
            <span className="text-xs text-slate-500">governing HOs</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Across {stats.availableHeadOffices.length} registered head offices
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hierarchy Attachment</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Compass className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-700">{stats.regionsCount}</span>
            <span className="text-xs text-slate-500">Regions linked</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">{stats.directHoCount}</span> direct HO attachments
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search zones by name, code, city, manager, district..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
              <option value="ARCHIVED">Archived Only</option>
            </select>
          </div>

          {/* Head Office Filter */}
          <div>
            <select
              value={headOfficeFilter}
              onChange={(e) => setHeadOfficeFilter(e.target.value)}
              className="w-full py-2 px-3 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-700"
            >
              <option value="ALL">All Head Offices</option>
              {stats.availableHeadOffices.map((ho) => (
                <option key={ho.id} value={ho.id}>
                  {ho.name} ({ho.code})
                </option>
              ))}
            </select>
          </div>

          {/* Region Filter */}
          <div>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full py-2 px-3 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-700"
            >
              <option value="ALL">All Regions / Attachments</option>
              <option value="NONE">⚡ Direct HO (No Region)</option>
              {stats.availableRegions.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {reg.name} ({reg.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* City Filter & Quick Badges */}
        {(stats.availableCities.length > 0 || search || statusFilter !== 'ALL' || headOfficeFilter !== 'ALL' || regionFilter !== 'ALL' || cityFilter !== 'ALL') && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-slate-600">Filter by City:</span>
              <button
                onClick={() => setCityFilter('ALL')}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                  cityFilter === 'ALL'
                    ? 'bg-brand-50 text-brand-700 border border-brand-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                All Cities
              </button>
              {stats.availableCities.map((c) => (
                <button
                  key={c}
                  onClick={() => setCityFilter(c)}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    cityFilter === c
                      ? 'bg-brand-50 text-brand-700 border border-brand-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {(search || statusFilter !== 'ALL' || headOfficeFilter !== 'ALL' || regionFilter !== 'ALL' || cityFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                  setHeadOfficeFilter('ALL');
                  setRegionFilter('ALL');
                  setCityFilter('ALL');
                }}
                className="text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Reset all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Zone Identity & Code</th>
                <th className="py-3 px-4">Hierarchy Attachment</th>
                <th className="py-3 px-4">Location & Coverage</th>
                <th className="py-3 px-4">Leadership & Contacts</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-brand-600" />
                      <p className="text-sm font-medium">Loading zones...</p>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="p-3 bg-slate-100 text-slate-400 rounded-full">
                        <Layers className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-slate-700">No Zones Found</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {search || statusFilter !== 'ALL' || headOfficeFilter !== 'ALL' || regionFilter !== 'ALL' || cityFilter !== 'ALL'
                            ? 'No zones matched your filter criteria.'
                            : 'Get started by creating your first academic cluster/zone.'}
                        </p>
                      </div>
                      <Button size="sm" onClick={handleOpenCreate} className="bg-brand-600 hover:bg-brand-700 text-white">
                        <Plus className="h-4 w-4 mr-1.5" />
                        Add First Zone
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((zone) => {
                  const isDirectHO = !zone.regionId;
                  return (
                    <tr key={zone.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* Identity & Code */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-purple-50 text-purple-700 rounded-lg border border-purple-100 mt-0.5">
                            <Layers className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                                {zone.name}
                              </span>
                              {zone.shortName && (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                                  {zone.shortName}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200/70 rounded-md text-xs font-mono font-bold">
                                {zone.code}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Hierarchy Attachment */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1.5">
                          {/* Parent Head Office */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            <Building2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            <span className="font-semibold">{zone.headOffice?.name || 'Head Office'}</span>
                          </div>

                          {/* Parent Region / Direct Attachment */}
                          {isDirectHO ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/80 rounded text-[11px] font-medium">
                              <Sparkles className="h-3 w-3" />
                              Direct Head Office Attachment
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <Compass className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              <span>{zone.region?.name || 'Region'}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Location & Coverage */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>
                              {zone.city || 'Karachi'}{zone.state ? `, ${zone.state}` : ''}
                            </span>
                          </div>
                          {zone.coveredDistricts && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              <span className="font-semibold text-slate-600">Coverage: </span>
                              {zone.coveredDistricts}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Leadership & Contacts */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1 text-xs">
                          {zone.managerName ? (
                            <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                              <User className="h-3.5 w-3.5 text-brand-600 shrink-0" />
                              <span className="truncate max-w-[170px]">{zone.managerName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No Manager Assigned</span>
                          )}

                          <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                            {zone.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {zone.phone}
                              </span>
                            )}
                            {zone.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-slate-400" />
                                {zone.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-top">
                        {zone.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        )}
                        {zone.status === 'INACTIVE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Inactive
                          </span>
                        )}
                        {zone.status === 'ARCHIVED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <Archive className="h-3 w-3" />
                            Archived
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenDetail(zone)}
                            title="View Full Details & Audit"
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(zone)}
                            title="Edit Zone"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() =>
                              handleOpenStatusModal(
                                zone,
                                zone.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
                              )
                            }
                            title={zone.status === 'ACTIVE' ? 'Deactivate Zone' : 'Activate Zone'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              zone.status === 'ACTIVE'
                                ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <Power className="h-4 w-4" />
                          </button>

                          {zone.status !== 'ARCHIVED' && (
                            <button
                              onClick={() => handleOpenStatusModal(zone, 'ARCHIVED')}
                              title="Archive Zone"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT ZONE MODAL */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          if (!isSubmitting) setIsFormOpen(false);
        }}
        title={isEditing ? `Edit Zone: ${formData.name || 'Zone'}` : 'Add New Zone / Area'}
        maxWidth="2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-6 pt-2">
          {/* SECTION 1: Organizational Hierarchy & Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Layers className="h-4 w-4 text-purple-600" />
              <span>1. Organizational Hierarchy & Identity</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Parent Head Office (Required) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parent Head Office <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.headOfficeId}
                  onChange={(e) => {
                    const nextHoId = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      headOfficeId: nextHoId,
                      // reset region if it doesn't belong to newly selected HO
                      regionId: '',
                    }));
                  }}
                  className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">-- Select Parent Head Office --</option>
                  {stats.availableHeadOffices.map((ho) => (
                    <option key={ho.id} value={ho.id}>
                      {ho.name} ({ho.code})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  The primary governing Head Office for this Zone.
                </p>
              </div>

              {/* Parent Region (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parent Region <span className="text-slate-400 font-normal">(Optional Layer)</span>
                </label>
                <select
                  value={formData.regionId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, regionId: e.target.value }))}
                  className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">⚡ None (Direct Head Office Attachment)</option>
                  {formAvailableRegions.map((reg) => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name} ({reg.code})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Leave as &apos;None&apos; if this Zone attaches directly to the Head Office without a Region.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Zone Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Zone / Area Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Karachi Central Academic Zone"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              {/* Short Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Short Name / Acronym <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. KC-ZONE"
                  value={formData.shortName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, shortName: e.target.value.toUpperCase() }))}
                  className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg uppercase focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            {/* Zone Code */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Zone Code <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-slate-500 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manualCodeOverride}
                      onChange={(e) => setManualCodeOverride(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
                    />
                    Manual Override
                  </label>
                  {!manualCodeOverride && (
                    <button
                      type="button"
                      onClick={() => handleAutoGenerateCode(formData.city)}
                      className="text-[11px] text-brand-600 hover:text-brand-700 font-medium flex items-center gap-0.5"
                    >
                      <Sparkles className="h-3 w-3" />
                      Re-generate
                    </button>
                  )}
                </div>
              </div>
              <input
                type="text"
                required
                disabled={!manualCodeOverride}
                placeholder="e.g. ZN-KHI-001"
                value={formData.code}
                onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="w-full py-2 px-3 text-sm font-mono font-semibold uppercase bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Unique identifier across the organization (e.g. ZN-KHI-001, ZN-LHR-002).
              </p>
            </div>
          </div>

          {/* SECTION 2: Geographical Location & Reference Masters */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <span>2. Geographical Location & Reference Masters</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Country */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                <select
                  value={formData.countryId}
                  onChange={(e) => {
                    const countryId = e.target.value;
                    const c = countries.find((item) => item.id === countryId);
                    setFormData((prev) => ({
                      ...prev,
                      countryId,
                      country: c ? c.name : prev.country,
                      stateId: '',
                      cityId: '',
                    }));
                  }}
                  className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">-- Select Country --</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.isoCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* State / Province */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State / Province</label>
                <select
                  value={formData.stateId}
                  disabled={!formData.countryId || states.length === 0}
                  onChange={(e) => {
                    const stateId = e.target.value;
                    const s = states.find((item) => item.id === stateId);
                    setFormData((prev) => ({
                      ...prev,
                      stateId,
                      state: s ? s.name : prev.state,
                      cityId: '',
                    }));
                  }}
                  className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">-- Select State/Province --</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <select
                  value={formData.cityId}
                  disabled={!formData.stateId || cities.length === 0}
                  onChange={(e) => {
                    const cityId = e.target.value;
                    const c = cities.find((item) => item.id === cityId);
                    setFormData((prev) => ({
                      ...prev,
                      cityId,
                      city: c ? c.name : prev.city,
                    }));
                    if (c?.code && !manualCodeOverride && !isEditing) {
                      handleAutoGenerateCode(c.code);
                    }
                  }}
                  className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">-- Select City --</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address Line 1 & Line 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 1</label>
                <input
                  type="text"
                  placeholder="e.g. Zone 1 Administrative Office, Block 7"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 2 / Building Wing</label>
                <input
                  type="text"
                  placeholder="e.g. Academic Operations Wing, 1st Floor"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData((prev) => ({ ...prev, addressLine2: e.target.value }))}
                  className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            {/* Postal Code & Custom City fallback */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Postal / ZIP Code</label>
                <input
                  type="text"
                  placeholder="e.g. 75300"
                  value={formData.postalCode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, postalCode: e.target.value }))}
                  className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City Name (Display / Override)</label>
                <input
                  type="text"
                  placeholder="e.g. Karachi"
                  value={formData.city}
                  onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                  className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Official Communications & Contacts */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Phone className="h-4 w-4 text-blue-600" />
              <span>3. Official Communications & Contacts</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Official Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Phone</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-slate-600 font-mono text-xs font-bold">
                    {activeCallingCode}
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. 21 34981122"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Alternate Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate / Emergency Phone</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-slate-600 font-mono text-xs font-bold">
                    {activeCallingCode}
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. 21 34981123"
                    value={formData.altPhone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, altPhone: e.target.value }))}
                    className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Official Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="e.g. zone.central@greenwood.edu.pk"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Website / Portal</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. https://greenwood.edu.pk/zones/central"
                    value={formData.website}
                    onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: Leadership & HR Links */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <User className="h-4 w-4 text-indigo-600" />
              <span>4. Leadership & HR Links</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Zone Manager (HR Lookup) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Zone Manager / Coordinator <span className="text-slate-400 font-normal">(HR Employee)</span>
                </label>
                <select
                  value={formData.managerEmployeeId}
                  onChange={(e) => {
                    const empId = e.target.value;
                    const emp = employees.find((item) => item.id === empId);
                    setFormData((prev) => ({
                      ...prev,
                      managerEmployeeId: empId,
                      managerName: emp ? `${emp.fullName}${emp.designation ? ` (${emp.designation})` : ''}` : prev.managerName,
                    }));
                  }}
                  className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">-- Select Active Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeNo}){emp.designation ? ` - ${emp.designation}` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or enter title/name manually"
                  value={formData.managerName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, managerName: e.target.value }))}
                  className="w-full mt-1.5 py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Administrative Contact Person */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrative Contact Person <span className="text-slate-400 font-normal">(HR Employee)</span>
                </label>
                <select
                  value={formData.adminContactEmployeeId}
                  onChange={(e) => {
                    const empId = e.target.value;
                    const emp = employees.find((item) => item.id === empId);
                    setFormData((prev) => ({
                      ...prev,
                      adminContactEmployeeId: empId,
                      adminContact: emp ? `${emp.fullName}${emp.designation ? ` (${emp.designation})` : ''}` : prev.adminContact,
                    }));
                  }}
                  className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">-- Select Active Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeNo}){emp.designation ? ` - ${emp.designation}` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or enter contact person title/name manually"
                  value={formData.adminContact}
                  onChange={(e) => setFormData((prev) => ({ ...prev, adminContact: e.target.value }))}
                  className="w-full mt-1.5 py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: Operational Scope & Coverage */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Compass className="h-4 w-4 text-amber-600" />
              <span>5. Operational Scope & Coverage</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Coverage Areas / Districts (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Gulshan-e-Iqbal, Gulberg, Federal B Area, Liaquatabad"
                value={formData.coveredDistricts}
                onChange={(e) => setFormData((prev) => ({ ...prev, coveredDistricts: e.target.value }))}
                className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Optional free-text coverage description of urban sectors, districts, or territories managed.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Coverage & Operational Notes
              </label>
              <textarea
                rows={2}
                placeholder="Detailed summary of branches, academic programs, or operational scope coordinated under this zone..."
                value={formData.coverageNotes}
                onChange={(e) => setFormData((prev) => ({ ...prev, coverageNotes: e.target.value }))}
                className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          {/* SECTION 6: Status & Internal Remarks */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <FileText className="h-4 w-4 text-slate-600" />
              <span>6. Operational Status & Remarks</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
                  className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-semibold"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internal Remarks / Administrative Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional internal notes or audit reference..."
                  value={formData.remarks}
                  onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                  className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand-600 hover:bg-brand-700 text-white min-w-[120px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </div>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Zone'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DETAIL SLIDE-OVER DRAWER */}
      {isDetailOpen && selectedZone && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDetailOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col">
              {/* Drawer Header */}
              <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-400/30">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold">{selectedZone.name}</h2>
                      {selectedZone.status === 'ACTIVE' && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded text-[10px] font-bold">
                          ACTIVE
                        </span>
                      )}
                      {selectedZone.status === 'INACTIVE' && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded text-[10px] font-bold">
                          INACTIVE
                        </span>
                      )}
                      {selectedZone.status === 'ARCHIVED' && (
                        <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-[10px] font-bold">
                          ARCHIVED
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-purple-300 mt-0.5">
                      Code: {selectedZone.code}
                      {selectedZone.shortName ? ` | Short: ${selectedZone.shortName}` : ''}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200 bg-slate-50 px-6">
                <button
                  onClick={() => setDetailTab('overview')}
                  className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                    detailTab === 'overview'
                      ? 'border-brand-600 text-brand-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Overview & Hierarchy
                </button>
                <button
                  onClick={() => setDetailTab('audit')}
                  className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
                    detailTab === 'audit'
                      ? 'border-brand-600 text-brand-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <History className="h-3.5 w-3.5" />
                  Audit Trail & History
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {detailTab === 'overview' ? (
                  <>
                    {/* Organization Hierarchy Chain Card */}
                    <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-xl border border-slate-200/80 p-4 space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-indigo-600" />
                        Organizational Hierarchy Path
                      </div>

                      <div className="flex flex-col gap-2 text-xs">
                        {/* Root: Organization */}
                        <div className="flex items-center gap-2 text-slate-600">
                          <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                            ROOT
                          </div>
                          <span className="font-semibold text-slate-800">Organization</span>
                          <span className="text-slate-400 text-[10px]">(System Root)</span>
                        </div>

                        <div className="ml-3 pl-3 border-l-2 border-indigo-200 space-y-2">
                          {/* Head Office */}
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-indigo-600" />
                            <span className="font-semibold text-slate-900">
                              {selectedZone.headOffice?.name || 'Primary Head Office'}
                            </span>
                            <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 text-[10px] font-mono rounded font-bold">
                              {selectedZone.headOffice?.code || 'HO'}
                            </span>
                          </div>

                          {/* Region (if applicable) or Direct Flag */}
                          <div className="ml-3 pl-3 border-l-2 border-indigo-200 space-y-2">
                            {selectedZone.region ? (
                              <div className="flex items-center gap-2">
                                <Compass className="h-4 w-4 text-blue-600" />
                                <span className="font-semibold text-slate-800">
                                  {selectedZone.region.name}
                                </span>
                                <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 text-[10px] font-mono rounded font-bold">
                                  {selectedZone.region.code}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-amber-700 font-medium text-[11px]">
                                <Sparkles className="h-3.5 w-3.5" />
                                Direct Head Office Attachment (No Regional Layer)
                              </div>
                            )}

                            {/* Zone Node (Current) */}
                            <div className="ml-3 pl-3 border-l-2 border-purple-300">
                              <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Layers className="h-4 w-4 text-purple-700" />
                                  <span className="font-bold text-purple-900">{selectedZone.name}</span>
                                </div>
                                <span className="font-mono text-xs font-bold text-purple-700">
                                  {selectedZone.code}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Location & Address Card */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-emerald-600" />
                        Location & Contact Information
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block">Address Line 1</span>
                          <span className="font-medium text-slate-800">{selectedZone.addressLine1 || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Address Line 2</span>
                          <span className="font-medium text-slate-800">{selectedZone.addressLine2 || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">City, State</span>
                          <span className="font-medium text-slate-800">
                            {selectedZone.city || 'Karachi'}{selectedZone.state ? `, ${selectedZone.state}` : ''}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Country & Postal Code</span>
                          <span className="font-medium text-slate-800">
                            {selectedZone.country || 'Pakistan'} {selectedZone.postalCode ? `(${selectedZone.postalCode})` : ''}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Official Phone</span>
                          <span className="font-medium text-slate-800">{selectedZone.phone || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Alternate Phone</span>
                          <span className="font-medium text-slate-800">{selectedZone.altPhone || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Official Email</span>
                          <span className="font-medium text-slate-800">{selectedZone.email || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Website</span>
                          {selectedZone.website ? (
                            <a
                              href={selectedZone.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-600 hover:underline flex items-center gap-1 font-medium"
                            >
                              Visit Portal <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="font-medium text-slate-800">—</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Leadership & Personnel */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <User className="h-4 w-4 text-indigo-600" />
                        Leadership & HR Personnel
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
                          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block mb-0.5">
                            Zone Manager / Coordinator
                          </span>
                          <p className="font-bold text-slate-900 text-sm">
                            {selectedZone.managerName || 'No Manager Assigned'}
                          </p>
                          {selectedZone.manager && (
                            <p className="text-slate-500 mt-0.5 text-[11px]">
                              HR Employee #{selectedZone.manager.employeeNo} • {selectedZone.manager.designation?.name || 'Staff'}
                            </p>
                          )}
                        </div>

                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
                          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block mb-0.5">
                            Administrative Contact Person
                          </span>
                          <p className="font-bold text-slate-900 text-sm">
                            {selectedZone.adminContact || 'No Contact Assigned'}
                          </p>
                          {selectedZone.adminContactPerson && (
                            <p className="text-slate-500 mt-0.5 text-[11px]">
                              HR Employee #{selectedZone.adminContactPerson.employeeNo} • {selectedZone.adminContactPerson.designation?.name || 'Staff'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Coverage & Districts */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Compass className="h-4 w-4 text-amber-600" />
                        Coverage Areas & Districts
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-slate-400 block">Coverage Areas / Districts:</span>
                          <span className="font-medium text-slate-800">
                            {selectedZone.coveredDistricts || 'None specified'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Operational Notes:</span>
                          <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 mt-1">
                            {selectedZone.coverageNotes || 'No operational notes provided.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* System Timestamps & Metadata */}
                    <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-4 space-y-2 text-xs text-slate-500">
                      <div className="flex justify-between">
                        <span>Created At:</span>
                        <span className="font-medium text-slate-700">
                          {new Date(selectedZone.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Updated:</span>
                        <span className="font-medium text-slate-700">
                          {new Date(selectedZone.updatedAt).toLocaleString()}
                        </span>
                      </div>
                      {selectedZone.remarks && (
                        <div className="pt-2 border-t border-slate-200">
                          <span className="font-semibold text-slate-700">Internal Remarks: </span>
                          <span>{selectedZone.remarks}</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Audit Trail Tab */
                  <div className="space-y-4">
                    {isLoadingAudit ? (
                      <div className="py-8 text-center text-slate-400">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-brand-600 mb-2" />
                        <p className="text-xs font-medium">Loading audit history...</p>
                      </div>
                    ) : auditLogs.length === 0 ? (
                      <div className="py-8 text-center text-slate-400">
                        <History className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-semibold text-slate-600">No Audit Records</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Audit entries will be recorded on changes to this Zone.
                        </p>
                      </div>
                    ) : (
                      <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
                        {auditLogs.map((log) => (
                          <div key={log.id} className="relative group">
                            <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-brand-600 border-2 border-white shadow-sm" />
                            <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-3.5 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 bg-brand-50 text-brand-700 font-bold text-[10px] rounded uppercase">
                                  {log.action}
                                </span>
                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(log.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-xs font-medium text-slate-800">
                                {log.changeSummary || 'Zone modified'}
                              </p>
                              {log.userId && (
                                <p className="text-[10px] text-slate-400 font-mono">
                                  User: {log.userId}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDetailOpen(false)}
                >
                  Close
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleOpenEdit(selectedZone);
                    }}
                    className="bg-brand-600 hover:bg-brand-700 text-white"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                    Edit Zone
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATUS TOGGLE / ARCHIVE CONFIRMATION MODAL */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => {
          if (!isStatusSubmitting) setIsStatusModalOpen(false);
        }}
        title={
          targetNewStatus === 'ARCHIVED'
            ? 'Archive Zone / Area'
            : targetNewStatus === 'ACTIVE'
            ? 'Activate Zone'
            : 'Deactivate Zone'
        }
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                targetNewStatus === 'ARCHIVED'
                  ? 'bg-red-50 text-red-600'
                  : targetNewStatus === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-amber-50 text-amber-600'
              }`}
            >
              {targetNewStatus === 'ARCHIVED' ? (
                <Archive className="h-6 w-6" />
              ) : targetNewStatus === 'ACTIVE' ? (
                <Unlock className="h-6 w-6" />
              ) : (
                <Lock className="h-6 w-6" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Are you sure you want to change status to{' '}
                <span className="uppercase font-bold">{targetNewStatus}</span> for:
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {targetZone?.name} ({targetZone?.code})
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {targetNewStatus === 'ARCHIVED'
                  ? 'Archived zones will no longer accept new branch attachments and will be hidden from default operational workflows.'
                  : targetNewStatus === 'INACTIVE'
                  ? 'Inactive zones will temporarily suspend operational cluster assignment.'
                  : 'Active zones are fully enabled for branch attachment and academic management.'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Change Note <span className="text-slate-400 font-normal">(Recorded in Audit Trail)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Operational cluster restructuring, seasonal reassignment..."
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStatusModalOpen(false)}
              disabled={isStatusSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmStatusChange}
              disabled={isStatusSubmitting}
              className={`text-white min-w-[120px] ${
                targetNewStatus === 'ARCHIVED'
                  ? 'bg-red-600 hover:bg-red-700'
                  : targetNewStatus === 'ACTIVE'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isStatusSubmitting ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Updating...
                </div>
              ) : targetNewStatus === 'ARCHIVED' ? (
                'Archive Zone'
              ) : targetNewStatus === 'ACTIVE' ? (
                'Activate Zone'
              ) : (
                'Deactivate Zone'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
