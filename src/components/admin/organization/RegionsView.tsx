'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Compass,
  Building2,
  Building,
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
  Layers,
  Map,
  Archive,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export interface RegionItem {
  id: string;
  tenantId: string;
  headOfficeId: string;
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
  directorEmployeeId: string | null;
  adminContactEmployeeId: string | null;
  directorName: string | null;
  adminContact: string | null;
  coverageNotes: string | null;
  coveredDistricts: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  headOffice?: { id: string; name: string; code: string; city: string; status: string } | null;
  countryRef?: { id: string; name: string; isoCode: string; phoneCallingCode: string; currencyCode: string } | null;
  stateRef?: { id: string; name: string; code: string; type: string } | null;
  cityRef?: { id: string; name: string; code: string } | null;
  director?: {
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
  headOfficesCount: number;
  citiesCount: number;
  availableCities: string[];
  availableHeadOffices: { id: string; name: string; code: string; city: string; status: string }[];
}

export function RegionsView() {
  const searchParams = useSearchParams();
  const { success, error } = useToast();

  const [items, setItems] = useState<RegionItem[]>([]);
  const [stats, setStats] = useState<StatsData>({
    total: 0,
    active: 0,
    inactive: 0,
    archived: 0,
    headOfficesCount: 0,
    citiesCount: 0,
    availableCities: [],
    availableHeadOffices: [],
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
  const [cityFilter, setCityFilter] = useState('ALL');

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RegionItem | null>(null);
  const [isCodeLocked, setIsCodeLocked] = useState(true);
  const [activeCallingCode, setActiveCallingCode] = useState('+92');

  const [formData, setFormData] = useState({
    headOfficeId: '',
    name: '',
    code: '',
    shortName: '',
    countryId: '',
    stateId: '',
    cityId: '',
    addressLine1: '',
    addressLine2: '',
    city: 'Karachi',
    state: 'Sindh',
    country: 'Pakistan',
    postalCode: '',
    phone: '',
    altPhone: '',
    email: '',
    website: '',
    directorEmployeeId: '',
    adminContactEmployeeId: '',
    directorName: '',
    adminContact: '',
    coverageNotes: '',
    coveredDistricts: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
    remarks: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal
  const [detailItem, setDetailItem] = useState<RegionItem | null>(null);
  const [detailTab, setDetailTab] = useState<'OVERVIEW' | 'AUDIT'>('OVERVIEW');
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Status Toggle Modal
  const [toggleItem, setToggleItem] = useState<RegionItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [toggleReason, setToggleReason] = useState('');
  const [isToggling, setIsToggling] = useState(false);

  // 1. Fetch Global References
  const fetchGlobalReferences = useCallback(async () => {
    try {
      const [cRes, empRes] = await Promise.all([
        fetch('/api/admin/reference/countries'),
        fetch('/api/admin/organization/employees/lookup'),
      ]);

      const [cJson, empJson] = await Promise.all([cRes.json(), empRes.json()]);

      if (cJson.success) setCountries(cJson.data || []);
      if (empJson.success) setEmployees(empJson.data || []);
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    fetchGlobalReferences();
  }, [fetchGlobalReferences]);

  // 2. Fetch Regions List
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (headOfficeFilter !== 'ALL') params.set('headOfficeId', headOfficeFilter);
      if (cityFilter !== 'ALL') params.set('city', cityFilter);

      const res = await fetch(`/api/admin/organization/regions?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
        setStats(
          json.data.stats || {
            total: 0,
            active: 0,
            inactive: 0,
            archived: 0,
            headOfficesCount: 0,
            citiesCount: 0,
            availableCities: [],
            availableHeadOffices: [],
          }
        );
      } else {
        error('Failed to load Regions', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not reach server.');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, headOfficeFilter, cityFilter, error]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch States when Country changes in form
  const handleCountryChange = async (countryId: string) => {
    const selectedCountry = countries.find((c) => c.id === countryId);
    setActiveCallingCode(selectedCountry?.phoneCallingCode || '+92');

    setFormData((prev) => ({
      ...prev,
      countryId,
      country: selectedCountry?.name || prev.country,
      stateId: '',
      state: '',
      cityId: '',
    }));
    setStates([]);
    setCities([]);

    if (countryId) {
      try {
        const res = await fetch(`/api/admin/reference/states?countryId=${countryId}`);
        const json = await res.json();
        if (json.success) setStates(json.data || []);
      } catch {
        // Non-blocking
      }
    }
  };

  // Fetch Cities when State changes in form
  const handleStateChange = async (stateId: string) => {
    const selectedState = states.find((s) => s.id === stateId);
    setFormData((prev) => ({
      ...prev,
      stateId,
      state: selectedState?.name || '',
      cityId: '',
    }));
    setCities([]);

    if (stateId) {
      try {
        const res = await fetch(`/api/admin/reference/cities?stateId=${stateId}`);
        const json = await res.json();
        if (json.success) setCities(json.data || []);
      } catch {
        // Non-blocking
      }
    }
  };

  // Auto generate code when City changes if code is locked
  const handleCityChange = async (cityId: string) => {
    const selectedCity = cities.find((c) => c.id === cityId);
    const cityName = selectedCity?.name || '';
    const cityCode = selectedCity?.code || cityName.slice(0, 3).toUpperCase();

    setFormData((prev) => ({
      ...prev,
      cityId,
      city: cityName || prev.city,
    }));

    if (isCodeLocked && !editingItem) {
      try {
        const res = await fetch(`/api/admin/organization/regions/generate-code?city=${cityCode}`);
        const json = await res.json();
        if (json.success && json.data?.code) {
          setFormData((prev) => ({
            ...prev,
            code: json.data.code,
            shortName: `${cityCode}-REG`,
          }));
        }
      } catch {
        // Non-blocking
      }
    }
  };

  const handleOpenCreate = useCallback(async () => {
    setEditingItem(null);
    setIsCodeLocked(true);
    setFormErrors({});

    const defaultHeadOffice = stats.availableHeadOffices.find((ho) => ho.status === 'ACTIVE') || stats.availableHeadOffices[0];
    const headOfficeId = defaultHeadOffice?.id || '';

    // Default to Pakistan if available
    const pk = countries.find((c) => c.isoCode === 'PK') || countries[0];
    const countryId = pk?.id || '';
    setActiveCallingCode(pk?.phoneCallingCode || '+92');

    let defaultStates: StateRef[] = [];
    if (countryId) {
      try {
        const res = await fetch(`/api/admin/reference/states?countryId=${countryId}`);
        const json = await res.json();
        if (json.success) defaultStates = json.data || [];
      } catch {
        // Non-blocking
      }
    }
    setStates(defaultStates);

    const sd = defaultStates.find((s) => s.code === 'SD') || defaultStates[0];
    const stateId = sd?.id || '';

    let defaultCities: CityRef[] = [];
    if (stateId) {
      try {
        const res = await fetch(`/api/admin/reference/cities?stateId=${stateId}`);
        const json = await res.json();
        if (json.success) defaultCities = json.data || [];
      } catch {
        // Non-blocking
      }
    }
    setCities(defaultCities);

    const khi = defaultCities.find((c) => c.code === 'KHI') || defaultCities[0];
    const cityId = khi?.id || '';

    let generatedCode = 'REG-KHI-001';
    try {
      const res = await fetch('/api/admin/organization/regions/generate-code?city=KHI');
      const json = await res.json();
      if (json.success && json.data?.code) {
        generatedCode = json.data.code;
      }
    } catch {
      // Non-blocking
    }

    setFormData({
      headOfficeId,
      name: '',
      code: generatedCode,
      shortName: 'KHI-REG',
      countryId,
      stateId,
      cityId,
      addressLine1: '',
      addressLine2: '',
      city: khi?.name || 'Karachi',
      state: sd?.name || 'Sindh',
      country: pk?.name || 'Pakistan',
      postalCode: '',
      phone: '',
      altPhone: '',
      email: '',
      website: '',
      directorEmployeeId: '',
      adminContactEmployeeId: '',
      directorName: '',
      adminContact: '',
      coverageNotes: '',
      coveredDistricts: '',
      status: 'ACTIVE',
      remarks: '',
    });
    setIsFormOpen(true);
  }, [countries, stats.availableHeadOffices]);

  // Auto-open modal if ?action=create
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      handleOpenCreate();
    }
  }, [searchParams, handleOpenCreate]);

  const handleOpenEdit = async (item: RegionItem) => {
    setEditingItem(item);
    setIsCodeLocked(false);
    setFormErrors({});

    let currentStates: StateRef[] = [];
    if (item.countryId) {
      try {
        const res = await fetch(`/api/admin/reference/states?countryId=${item.countryId}`);
        const json = await res.json();
        if (json.success) currentStates = json.data || [];
      } catch {
        // Non-blocking
      }
    }
    setStates(currentStates);

    let currentCities: CityRef[] = [];
    if (item.stateId) {
      try {
        const res = await fetch(`/api/admin/reference/cities?stateId=${item.stateId}`);
        const json = await res.json();
        if (json.success) currentCities = json.data || [];
      } catch {
        // Non-blocking
      }
    }
    setCities(currentCities);

    const activeC = countries.find((c) => c.id === item.countryId);
    setActiveCallingCode(activeC?.phoneCallingCode || item.countryRef?.phoneCallingCode || '+92');

    setFormData({
      headOfficeId: item.headOfficeId,
      name: item.name,
      code: item.code,
      shortName: item.shortName || '',
      countryId: item.countryId || '',
      stateId: item.stateId || '',
      cityId: item.cityId || '',
      addressLine1: item.addressLine1 || '',
      addressLine2: item.addressLine2 || '',
      city: item.city || '',
      state: item.state || '',
      country: item.country || 'Pakistan',
      postalCode: item.postalCode || '',
      phone: item.phone || '',
      altPhone: item.altPhone || '',
      email: item.email || '',
      website: item.website || '',
      directorEmployeeId: item.directorEmployeeId || '',
      adminContactEmployeeId: item.adminContactEmployeeId || '',
      directorName: item.directorName || '',
      adminContact: item.adminContact || '',
      coverageNotes: item.coverageNotes || '',
      coveredDistricts: item.coveredDistricts || '',
      status: item.status,
      remarks: item.remarks || '',
    });
    setIsFormOpen(true);
  };

  const handleOpenDetail = async (item: RegionItem) => {
    setDetailItem(item);
    setDetailTab('OVERVIEW');
    setAuditLogs([]);
    setIsLoadingAudit(true);
    try {
      const res = await fetch(`/api/admin/organization/regions/${item.id}/audit`);
      const json = await res.json();
      if (json.success) {
        setAuditLogs(json.data || []);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.headOfficeId) errors.headOfficeId = 'Parent Head Office selection is required.';
    if (!formData.name.trim()) errors.name = 'Region Name is required.';
    if (!formData.code.trim()) errors.code = 'Region Code is required.';

    if (formData.email.trim()) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Please enter a valid official email address.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const url = editingItem
        ? `/api/admin/organization/regions/${editingItem.id}`
        : '/api/admin/organization/regions';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (json.success) {
        success(
          editingItem ? 'Region Updated' : 'Region Created',
          `${formData.name} has been successfully ${editingItem ? 'updated' : 'created'}.`
        );
        setIsFormOpen(false);
        fetchData();
      } else {
        error('Action Failed', json.error?.message || 'Could not save Region.');
      }
    } catch {
      error('Network Error', 'Failed to connect to the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!toggleItem) return;
    setIsToggling(true);
    try {
      const res = await fetch(`/api/admin/organization/regions/${toggleItem.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          reason: toggleReason.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        success(
          'Region Status Updated',
          `${toggleItem.name} is now ${targetStatus.toLowerCase()}.`
        );
        setToggleItem(null);
        setToggleReason('');
        fetchData();
      } else {
        error('Status Change Failed', json.error?.message);
      }
    } catch {
      error('Network Error', 'Failed to change Region status.');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/settings"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors"
            title="Return to Configuration Center"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Region Management
              </h1>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded">
                Tier 2 Optional Division
              </span>
            </div>
            <p className="text-3xs text-slate-500">
              Configure territorial operational jurisdictions, multi-district coverage, regional leadership, and branch oversight.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="h-8 text-xs font-semibold px-2.5 border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-8 text-xs font-semibold px-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Region
          </Button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Total Regions</p>
            <h3 className="text-lg font-black text-slate-900 mt-0.5">{stats.total}</h3>
            <p className="text-3xs text-slate-500 font-medium">Territorial Divisions</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <Compass className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-emerald-600 uppercase tracking-wider">Active Regions</p>
            <h3 className="text-lg font-black text-emerald-700 mt-0.5">{stats.active}</h3>
            <p className="text-3xs text-emerald-600 font-medium">Operational Hubs</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-indigo-600 uppercase tracking-wider">Head Offices Linked</p>
            <h3 className="text-lg font-black text-indigo-700 mt-0.5">{stats.headOfficesCount}</h3>
            <p className="text-3xs text-indigo-600 font-medium">Parent Secretariats</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-sky-600 uppercase tracking-wider">Cities Covered</p>
            <h3 className="text-lg font-black text-sky-700 mt-0.5">{stats.citiesCount}</h3>
            <p className="text-3xs text-sky-600 font-medium">Geographic Locations</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
            <MapPin className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Data Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-2.5 justify-between items-stretch md:items-center">
          <div className="flex-1 relative max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by region name, code, parent office, city, director, districts..."
              className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-3xs font-semibold text-slate-600">
              {['ALL', 'ACTIVE', 'INACTIVE', 'ARCHIVED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    statusFilter === st
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'ALL' ? 'All Status' : st}
                </button>
              ))}
            </div>

            {/* Parent Head Office Filter */}
            {stats.availableHeadOffices && stats.availableHeadOffices.length > 0 && (
              <select
                value={headOfficeFilter}
                onChange={(e) => setHeadOfficeFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-2xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">All Head Offices ({stats.availableHeadOffices.length})</option>
                {stats.availableHeadOffices.map((ho) => (
                  <option key={ho.id} value={ho.id}>
                    {ho.name} [{ho.code}]
                  </option>
                ))}
              </select>
            )}

            {/* City Filter */}
            {stats.availableCities && stats.availableCities.length > 0 && (
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-2xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">All Cities ({stats.availableCities.length})</option>
                {stats.availableCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Regions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-3xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3.5">Region Identity &amp; Code</th>
                <th className="py-2.5 px-3.5">Parent Head Office</th>
                <th className="py-2.5 px-3.5">Jurisdiction &amp; Districts</th>
                <th className="py-2.5 px-3.5">Regional Leadership</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading regional directory...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Compass className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No regions found</p>
                    <p className="text-3xs text-slate-400 mt-0.5">
                      {search || statusFilter !== 'ALL' || headOfficeFilter !== 'ALL' || cityFilter !== 'ALL'
                        ? 'Try clearing active filters.'
                        : 'Click "Add Region" to establish your first territorial division.'}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isActive = item.status === 'ACTIVE';
                  const isArchived = item.status === 'ARCHIVED';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Region Identity */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                                : isArchived
                                ? 'bg-amber-50 text-amber-700 border-amber-200/70'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            <Compass className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                {item.name}
                              </span>
                              {item.shortName && (
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                  {item.shortName}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-3xs font-medium text-slate-500">
                              <span className="font-mono text-emerald-800 bg-emerald-50/80 border border-emerald-200/60 px-1 rounded font-bold">
                                {item.code}
                              </span>
                              {item.city && <span>• {item.city}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Parent Head Office */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <div className="truncate max-w-[200px]">
                            <span className="font-semibold text-slate-800 block text-2xs truncate">
                              {item.headOffice?.name || 'N/A'}
                            </span>
                            {item.headOffice?.code && (
                              <span className="font-mono text-[9px] text-indigo-700 font-bold">
                                [{item.headOffice.code}]
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Jurisdiction & Districts */}
                      <td className="py-2.5 px-3.5">
                        <div className="space-y-1 max-w-[240px]">
                          {item.coveredDistricts ? (
                            <div className="flex flex-wrap gap-1">
                              {item.coveredDistricts
                                .split(',')
                                .map((d) => d.trim())
                                .filter(Boolean)
                                .slice(0, 3)
                                .map((dist, i) => (
                                  <span
                                    key={i}
                                    className="text-[9px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200 truncate max-w-[100px]"
                                    title={dist}
                                  >
                                    {dist}
                                  </span>
                                ))}
                              {item.coveredDistricts.split(',').length > 3 && (
                                <span className="text-[9px] font-bold text-slate-400">
                                  +{item.coveredDistricts.split(',').length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-3xs text-slate-400 italic">No specific districts listed</span>
                          )}
                          {item.coverageNotes && (
                            <p className="text-3xs text-slate-500 truncate" title={item.coverageNotes}>
                              {item.coverageNotes}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Regional Leadership */}
                      <td className="py-2.5 px-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-2xs text-slate-800 font-medium">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[160px]">
                              {item.directorName || (item.director ? `${item.director.firstNameEn} ${item.director.lastNameEn || ''}` : 'Unassigned')}
                            </span>
                            {item.director && (
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1 rounded border border-emerald-200/60 shrink-0">
                                HR: {item.director.employeeNo}
                              </span>
                            )}
                          </div>
                          {item.adminContact && (
                            <p className="text-3xs text-slate-500 truncate max-w-[160px]">
                              Admin: {item.adminContact}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-bold border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isArchived
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-emerald-500' : isArchived ? 'bg-amber-500' : 'bg-slate-400'
                            }`}
                          />
                          {item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenDetail(item)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="View Overview & Audit History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Edit Region Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setToggleItem(item);
                              setTargetStatus(item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
                              setToggleReason('');
                            }}
                            className={`p-1 rounded transition-colors ${
                              isActive
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={isActive ? 'Deactivate or Archive Region' : 'Activate Region'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
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

      {/* CREATE / EDIT REGION MODAL */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? `Edit Region: ${editingItem.name}` : 'Establish New Region'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Parent Hierarchy & Identification */}
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-2xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                1. Hierarchy Attachment &amp; Regional Identity
              </span>
              <span className="text-3xs font-semibold text-slate-500">Tier 2 Division</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Parent Head Office Selection */}
              <div className="sm:col-span-2">
                <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Parent Head Office <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.headOfficeId}
                  onChange={(e) => setFormData({ ...formData, headOfficeId: e.target.value })}
                  className={`w-full text-xs bg-white border rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    formErrors.headOfficeId ? 'border-rose-300' : 'border-slate-300'
                  }`}
                >
                  <option value="">-- Select Parent Executive Head Office --</option>
                  {stats.availableHeadOffices.map((ho) => (
                    <option key={ho.id} value={ho.id}>
                      {ho.name} [{ho.code}] — {ho.city} {ho.status !== 'ACTIVE' ? '(' + ho.status + ')' : ''}
                    </option>
                  ))}
                </select>
                {formErrors.headOfficeId && (
                  <p className="text-3xs text-rose-500 mt-0.5">{formErrors.headOfficeId}</p>
                )}
              </div>

              {/* Region Name */}
              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Region Official Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Southern Sindh & Karachi Region"
                  className={`w-full text-xs bg-white border rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    formErrors.name ? 'border-rose-300' : 'border-slate-300'
                  }`}
                />
                {formErrors.name && <p className="text-3xs text-rose-500 mt-0.5">{formErrors.name}</p>}
              </div>

              {/* Short Name */}
              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Short Acronym / Alias
                </label>
                <input
                  type="text"
                  value={formData.shortName}
                  onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
                  placeholder="e.g. SSK-REG"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* System Code Generator */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider">
                    Region Code <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCodeLocked(!isCodeLocked)}
                    className="text-3xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    {isCodeLocked ? (
                      <>
                        <Lock className="w-3 h-3" /> System Auto-Generated (Click to Override)
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3" /> Manual Override Mode (Click to Lock)
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.code}
                  readOnly={isCodeLocked && !editingItem}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. REG-KHI-001"
                  className={`w-full text-xs border rounded-lg p-2 font-mono uppercase font-bold focus:outline-none ${
                    isCodeLocked && !editingItem
                      ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-emerald-400 focus:ring-2 focus:ring-emerald-500/20'
                  } ${formErrors.code ? 'border-rose-300' : ''}`}
                />
                {formErrors.code && <p className="text-3xs text-rose-500 mt-0.5">{formErrors.code}</p>}
              </div>
            </div>
          </div>

          {/* Section 2: Global Location Reference Cascade */}
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-2xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                2. Geographic Location &amp; Regional Hub Address
              </span>
              <span className="text-3xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                Cascading Reference Masters
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Country */}
              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Country
                </label>
                <select
                  value={formData.countryId}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Province / State
                </label>
                <select
                  value={formData.stateId}
                  onChange={(e) => handleStateChange(e.target.value)}
                  disabled={!formData.countryId}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">-- Select Province/State --</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Principal City
                </label>
                <select
                  value={formData.cityId}
                  onChange={(e) => handleCityChange(e.target.value)}
                  disabled={!formData.stateId}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">-- Select City --</option>
                  {cities.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.name} ({ct.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Address Line 1 */}
              <div className="sm:col-span-2">
                <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Regional Office Address Line 1
                </label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="e.g. Regional Operations Hub, Suite 201, Main Shahrah-e-Faisal"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Postal Code */}
              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Postal / ZIP Code
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="e.g. 75400"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Jurisdiction & Coverage */}
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-2xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Map className="w-3.5 h-3.5 text-emerald-600" />
                3. Jurisdiction &amp; Territorial Coverage
              </span>
              <span className="text-3xs font-semibold text-slate-500">Multi-District Oversight</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Covered Districts / Zones (Comma-Separated)
                  Coverage Areas / Districts (Optional)
                </label>
                <input
                  type="text"
                  value={formData.coveredDistricts}
                  onChange={(e) => setFormData({ ...formData, coveredDistricts: e.target.value })}
                  placeholder="e.g. Karachi South, Karachi East, Karachi Central, Malir, Korangi, Thatta"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Jurisdictional Scope &amp; Operational Notes
                </label>
                <textarea
                  value={formData.coverageNotes}
                  onChange={(e) => setFormData({ ...formData, coverageNotes: e.target.value })}
                  rows={2}
                  placeholder="Describe operational purview, school clusters overseen, and administrative authority..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Leadership & Personnel */}
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-2xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                4. Regional Leadership &amp; Operational Contacts
              </span>
              <span className="text-3xs font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                HR Personnel Lookup
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Regional Director */}
              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Regional Director (HR Employee)
                </label>
                <select
                  value={formData.directorEmployeeId}
                  onChange={(e) => {
                    const emp = employees.find((em) => em.id === e.target.value);
                    setFormData({
                      ...formData,
                      directorEmployeeId: e.target.value,
                      directorName: emp ? (emp.fullName + ' (' + (emp.designation || 'Director') + ')') : formData.directorName,
                    });
                  }}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">-- Select Active Employee from HR --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      [{emp.employeeNo}] {emp.fullName} — {emp.designation || 'Staff'} ({emp.department || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Administrative Contact */}
              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Administrative Coordinator (HR Employee)
                </label>
                <select
                  value={formData.adminContactEmployeeId}
                  onChange={(e) => {
                    const emp = employees.find((em) => em.id === e.target.value);
                    setFormData({
                      ...formData,
                      adminContactEmployeeId: e.target.value,
                      adminContact: emp ? (emp.fullName + ' (' + (emp.designation || 'Coordinator') + ')') : formData.adminContact,
                    });
                  }}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">-- Select Active Employee from HR --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      [{emp.employeeNo}] {emp.fullName} — {emp.designation || 'Staff'} ({emp.department || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Official Phone */}
              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Official Contact Phone ({activeCallingCode})
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-2 text-2xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {activeCallingCode}
                  </span>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="21 34567800"
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg py-2 pl-14 pr-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Official Email */}
              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Official Regional Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="region.south@greenwood.edu.pk"
                  className={`w-full text-xs bg-white border rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    formErrors.email ? 'border-rose-300' : 'border-slate-300'
                  }`}
                />
                {formErrors.email && <p className="text-3xs text-rose-500 mt-0.5">{formErrors.email}</p>}
              </div>
            </div>
          </div>

          {/* Status & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Regional Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ACTIVE">ACTIVE (Operational)</option>
                <option value="INACTIVE">INACTIVE (Temporarily Suspended)</option>
                <option value="ARCHIVED">ARCHIVED (Decommissioned)</option>
              </select>
            </div>

            <div>
              <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Remarks / Governing Notes
              </label>
              <input
                type="text"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Optional administrative remarks..."
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFormOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs font-semibold px-4 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : editingItem ? (
                'Update Region'
              ) : (
                'Create Region'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DETAIL / AUDIT MODAL */}
      <Modal
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
        title={detailItem ? ('Region Overview: ' + detailItem.name) : ''}
        maxWidth="2xl"
      >
        {detailItem && (
          <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Tab selector */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setDetailTab('OVERVIEW')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  detailTab === 'OVERVIEW'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Overview &amp; Hierarchy
              </button>
              <button
                onClick={() => setDetailTab('AUDIT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  detailTab === 'AUDIT'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Audit Trail ({auditLogs.length})
              </button>
            </div>

            {detailTab === 'OVERVIEW' ? (
              <div className="space-y-3 text-xs">
                {/* Hierarchy Breadcrumb Banner */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Organizational Hierarchy Path
                  </span>
                  <div className="flex items-center gap-2 text-2xs font-semibold text-slate-700">
                    <span className="text-slate-500">Organization (Hidden Root)</span>
                    <span className="text-slate-400">&rarr;</span>
                    <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60 font-bold">
                      {detailItem.headOffice?.name || 'Head Office'} [{detailItem.headOffice?.code}]
                    </span>
                    <span className="text-slate-400">&rarr;</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 font-bold">
                      {detailItem.name} [{detailItem.code}]
                    </span>
                    <span className="text-slate-400">&rarr;</span>
                    <span className="text-slate-400 italic">Branches / Schools (Tier 3)</span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-3xs font-bold text-slate-400 uppercase block">Region Code</span>
                    <span className="font-mono font-bold text-emerald-800">{detailItem.code}</span>
                  </div>
                  <div>
                    <span className="text-3xs font-bold text-slate-400 uppercase block">Short Name / Alias</span>
                    <span className="font-semibold text-slate-700">{detailItem.shortName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-3xs font-bold text-slate-400 uppercase block">Location</span>
                    <span className="font-medium text-slate-700">
                      {detailItem.city}, {detailItem.state}, {detailItem.country}
                    </span>
                  </div>
                  <div>
                    <span className="text-3xs font-bold text-slate-400 uppercase block">Regional Address</span>
                    <span className="font-medium text-slate-700">{detailItem.addressLine1 || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-3xs font-bold text-slate-400 uppercase block">Official Phone</span>
                    <span className="font-medium text-slate-700">{detailItem.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-3xs font-bold text-slate-400 uppercase block">Official Email</span>
                    <span className="font-medium text-slate-700">{detailItem.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-3xs font-bold text-slate-400 uppercase block">Regional Director</span>
                    <span className="font-medium text-slate-700">{detailItem.directorName || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-3xs font-bold text-slate-400 uppercase block">Administrative Contact</span>
                    <span className="font-medium text-slate-700">{detailItem.adminContact || 'Unassigned'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-3xs font-bold text-slate-400 uppercase block">Covered Districts</span>
                    <span className="font-medium text-slate-800">{detailItem.coveredDistricts || 'All municipal districts'}</span>
                    <span className="text-3xs font-bold text-slate-400 uppercase block">Coverage Areas / Districts</span>
                    <span className="font-medium text-slate-800">{detailItem.coveredDistricts || 'All municipal districts / areas'}</span>
                  </div>
                  {detailItem.coverageNotes && (
                    <div className="col-span-2">
                      <span className="text-3xs font-bold text-slate-400 uppercase block">Coverage &amp; Purview Notes</span>
                      <span className="font-medium text-slate-700">{detailItem.coverageNotes}</span>
                    </div>
                  )}
                  {detailItem.remarks && (
                    <div className="col-span-2">
                      <span className="text-3xs font-bold text-slate-400 uppercase block">Administrative Remarks</span>
                      <span className="font-medium text-slate-700">{detailItem.remarks}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {isLoadingAudit ? (
                  <div className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading audit trail...
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <History className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                    No audit records logged yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-2xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase">
                          <th className="py-2 px-3">Timestamp</th>
                          <th className="py-2 px-3">Action</th>
                          <th className="py-2 px-3">Summary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 whitespace-nowrap text-slate-500">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                                {log.action}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-700">{log.changeSummary || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* STATUS TOGGLE / ARCHIVE MODAL */}
      <Modal
        isOpen={!!toggleItem}
        onClose={() => setToggleItem(null)}
        title={toggleItem ? ('Update Status: ' + toggleItem.name) : ''}
        maxWidth="md"
      >
        {toggleItem && (
          <div className="p-4 space-y-3 text-xs">
            <p className="text-slate-600">
              Select the desired operational status for Region{' '}
              <span className="font-bold text-slate-900">{toggleItem.name}</span> [
              <span className="font-mono text-emerald-700">{toggleItem.code}</span>]:
            </p>

            <div className="space-y-2">
              <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider">
                Target Status
              </label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as any)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ACTIVE">ACTIVE (Operational)</option>
                <option value="INACTIVE">INACTIVE (Temporarily Suspended)</option>
                <option value="ARCHIVED">ARCHIVED (Decommissioned)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-3xs font-bold text-slate-700 uppercase tracking-wider">
                Reason for Status Change (Optional)
              </label>
              <textarea
                value={toggleReason}
                onChange={(e) => setToggleReason(e.target.value)}
                rows={2}
                placeholder="Provide reason for activation, suspension, or archiving..."
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setToggleItem(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleToggleStatus}
                disabled={isToggling}
                className="text-xs font-semibold px-4 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isToggling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Updating...
                  </>
                ) : (
                  'Confirm Status Change'
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
