'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
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
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export interface HeadOfficeItem {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  shortName: string | null;
  registrationNo: string | null;
  countryId: string | null;
  stateId: string | null;
  cityId: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  country: string;
  postalCode: string | null;
  phone: string | null;
  altPhone: string | null;
  email: string | null;
  website: string | null;
  directorEmployeeId: string | null;
  adminContactEmployeeId: string | null;
  directorName: string | null;
  adminContact: string | null;
  timezone: string;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE';
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
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

interface TimezoneRef {
  id: string;
  identifier: string;
  label: string;
  utcOffset: string;
}

interface CurrencyRef {
  code: string;
  name: string;
  symbol: string;
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
  citiesCount: number;
  availableCities: string[];
}

export function HeadOfficesView() {
  const searchParams = useSearchParams();
  const { success, error } = useToast();

  const [items, setItems] = useState<HeadOfficeItem[]>([]);
  const [stats, setStats] = useState<StatsData>({
    total: 0,
    active: 0,
    inactive: 0,
    citiesCount: 0,
    availableCities: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Reference Masters State
  const [countries, setCountries] = useState<CountryRef[]>([]);
  const [states, setStates] = useState<StateRef[]>([]);
  const [cities, setCities] = useState<CityRef[]>([]);
  const [timezones, setTimezones] = useState<TimezoneRef[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRef[]>([]);
  const [employees, setEmployees] = useState<EmployeeLookupItem[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HeadOfficeItem | null>(null);
  const [isCodeLocked, setIsCodeLocked] = useState(true);
  const [activeCallingCode, setActiveCallingCode] = useState('+92');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    shortName: '',
    registrationNo: '',
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
    timezone: 'Asia/Karachi',
    currency: 'PKR',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    remarks: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal
  const [detailItem, setDetailItem] = useState<HeadOfficeItem | null>(null);
  const [detailTab, setDetailTab] = useState<'OVERVIEW' | 'AUDIT'>('OVERVIEW');
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Status Toggle Modal
  const [toggleItem, setToggleItem] = useState<HeadOfficeItem | null>(null);
  const [toggleReason, setToggleReason] = useState('');
  const [isToggling, setIsToggling] = useState(false);

  // 1. Fetch Global References
  const fetchGlobalReferences = useCallback(async () => {
    try {
      const [cRes, tzRes, curRes, empRes] = await Promise.all([
        fetch('/api/admin/reference/countries'),
        fetch('/api/admin/reference/timezones'),
        fetch('/api/admin/reference/currencies'),
        fetch('/api/admin/organization/employees/lookup'),
      ]);

      const [cJson, tzJson, curJson, empJson] = await Promise.all([
        cRes.json(),
        tzRes.json(),
        curRes.json(),
        empRes.json(),
      ]);

      if (cJson.success) setCountries(cJson.data || []);
      if (tzJson.success) setTimezones(tzJson.data || []);
      if (curJson.success) setCurrencies(curJson.data || []);
      if (empJson.success) setEmployees(empJson.data || []);
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    fetchGlobalReferences();
  }, [fetchGlobalReferences]);

  // 2. Fetch Head Offices List
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (cityFilter !== 'ALL') params.set('city', cityFilter);

      const res = await fetch(`/api/admin/organization/head-offices?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
        setStats(
          json.data.stats || {
            total: 0,
            active: 0,
            inactive: 0,
            citiesCount: 0,
            availableCities: [],
          }
        );
      } else {
        error('Failed to load Head Offices', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not reach server.');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, cityFilter, error]);

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
      currency: selectedCountry?.currencyCode || prev.currency,
      timezone: selectedCountry?.defaultTimezone || prev.timezone,
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
        const res = await fetch(`/api/admin/organization/head-offices/generate-code?cityCode=${cityCode}`);
        const json = await res.json();
        if (json.success && json.data?.code) {
          setFormData((prev) => ({
            ...prev,
            code: json.data.code,
            shortName: `${cityCode}-HO`,
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

    let generatedCode = 'HO-KHI-001';
    try {
      const res = await fetch('/api/admin/organization/head-offices/generate-code?cityCode=KHI');
      const json = await res.json();
      if (json.success && json.data?.code) {
        generatedCode = json.data.code;
      }
    } catch {
      // Non-blocking
    }

    setFormData({
      name: '',
      code: generatedCode,
      shortName: 'KHI-HO',
      registrationNo: '',
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
      timezone: pk?.defaultTimezone || 'Asia/Karachi',
      currency: pk?.currencyCode || 'PKR',
      status: 'ACTIVE',
      remarks: '',
    });
    setIsFormOpen(true);
  }, [countries]);

  // Auto-open modal if ?action=create
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      handleOpenCreate();
    }
  }, [searchParams, handleOpenCreate]);

  const handleOpenEdit = async (item: HeadOfficeItem) => {
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
      name: item.name,
      code: item.code,
      shortName: item.shortName || '',
      registrationNo: item.registrationNo || '',
      countryId: item.countryId || '',
      stateId: item.stateId || '',
      cityId: item.cityId || '',
      addressLine1: item.addressLine1,
      addressLine2: item.addressLine2 || '',
      city: item.city,
      state: item.state || '',
      country: item.country,
      postalCode: item.postalCode || '',
      phone: item.phone || '',
      altPhone: item.altPhone || '',
      email: item.email || '',
      website: item.website || '',
      directorEmployeeId: item.directorEmployeeId || '',
      adminContactEmployeeId: item.adminContactEmployeeId || '',
      directorName: item.directorName || '',
      adminContact: item.adminContact || '',
      timezone: item.timezone,
      currency: item.currency,
      status: item.status,
      remarks: item.remarks || '',
    });
    setIsFormOpen(true);
  };

  const handleOpenDetail = async (item: HeadOfficeItem) => {
    setDetailItem(item);
    setDetailTab('OVERVIEW');
    setAuditLogs([]);
    setIsLoadingAudit(true);
    try {
      const res = await fetch(`/api/admin/organization/head-offices/${item.id}/audit`);
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
    if (!formData.name.trim()) errors.name = 'Head Office Name is required.';
    if (!formData.code.trim()) errors.code = 'Head Office Code is required.';
    if (!formData.addressLine1.trim()) errors.addressLine1 = 'Primary address is required.';
    if (!formData.city.trim() && !formData.cityId) errors.city = 'City is required.';

    if (formData.email.trim()) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
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
        ? `/api/admin/organization/head-offices/${editingItem.id}`
        : '/api/admin/organization/head-offices';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (json.success) {
        success(
          editingItem ? 'Head Office Updated' : 'Head Office Created',
          `${formData.name} has been successfully ${editingItem ? 'updated' : 'created'}.`
        );
        setIsFormOpen(false);
        fetchData();
      } else {
        error('Action Failed', json.error?.message || 'Could not save Head Office.');
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
      const targetStatus = toggleItem.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const res = await fetch(`/api/admin/organization/head-offices/${toggleItem.id}/status`, {
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
          `Head Office ${targetStatus === 'ACTIVE' ? 'Activated' : 'Deactivated'}`,
          `${toggleItem.name} is now ${targetStatus.toLowerCase()}.`
        );
        setToggleItem(null);
        setToggleReason('');
        fetchData();
      } else {
        error('Status Change Failed', json.error?.message);
      }
    } catch {
      error('Network Error', 'Failed to change Head Office status.');
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
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Head Office Management
              </h1>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded">
                Tier 1 Secretariat
              </span>
            </div>
            <p className="text-3xs text-slate-500">
              Configure apex executive secretariat, central registry details, leadership, and geographic references.
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
            className="h-8 text-xs font-semibold px-3 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Head Office
          </Button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Total Head Offices</p>
            <h3 className="text-lg font-black text-slate-900 mt-0.5">{stats.total}</h3>
            <p className="text-3xs text-slate-500 font-medium">Apex Governing Entities</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Building className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-emerald-600 uppercase tracking-wider">Active Secretariats</p>
            <h3 className="text-lg font-black text-emerald-700 mt-0.5">{stats.active}</h3>
            <p className="text-3xs text-emerald-600 font-medium">Operational &amp; Governing</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Inactive / Suspended</p>
            <h3 className="text-lg font-black text-slate-700 mt-0.5">{stats.inactive}</h3>
            <p className="text-3xs text-slate-400 font-medium">Decommissioned</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-100">
            <Power className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-sky-600 uppercase tracking-wider">Cities Covered</p>
            <h3 className="text-lg font-black text-sky-700 mt-0.5">{stats.citiesCount}</h3>
            <p className="text-3xs text-sky-600 font-medium">Geographic Distribution</p>
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
              placeholder="Search by office name, code, city, director, contact..."
              className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
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
              {['ALL', 'ACTIVE', 'INACTIVE'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    statusFilter === st
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'ALL' ? 'All Status' : st}
                </button>
              ))}
            </div>

            {/* City Filter */}
            {stats.availableCities && stats.availableCities.length > 0 && (
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-2xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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

        {/* Head Offices Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-3xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3.5">Office Identity &amp; Code</th>
                <th className="py-2.5 px-3.5">Secretariat Location</th>
                <th className="py-2.5 px-3.5">Official Contact</th>
                <th className="py-2.5 px-3.5">Leadership</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <p className="text-3xs font-medium">Loading Head Offices...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <Building className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-700">No Head Offices found</p>
                    <p className="text-3xs text-slate-400 mt-0.5">
                      {search ? 'Try clearing your search query' : 'Create your primary head office secretariat'}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Identity */}
                    <td className="py-3 px-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-3xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-1 rounded">
                            {item.code}
                          </span>
                          {item.shortName && (
                            <span className="text-3xs text-slate-500 font-medium">
                              ({item.shortName})
                            </span>
                          )}
                          {item.registrationNo && (
                            <p className="text-[10px] text-slate-400 font-medium">
                              Reg: {item.registrationNo}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 font-bold text-slate-800 text-2xs flex-wrap">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{item.city}</span>
                          {item.state && <span className="text-slate-400">, {item.state}</span>}
                          <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 rounded">
                            {item.country}
                          </span>
                        </div>
                        <p className="text-3xs text-slate-500 truncate max-w-[200px]">
                          {item.addressLine1}
                        </p>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-3.5">
                      <div className="space-y-0.5 text-3xs text-slate-600">
                        {item.phone && (
                          <div className="flex items-center gap-1 font-mono">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            <span>{item.phone}</span>
                          </div>
                        )}
                        {item.email && (
                          <div className="flex items-center gap-1 truncate max-w-[180px]">
                            <Mail className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            <span className="truncate">{item.email}</span>
                          </div>
                        )}
                        {!item.phone && !item.email && (
                          <span className="text-slate-400 italic">No contact specified</span>
                        )}
                      </div>
                    </td>

                    {/* Leadership */}
                    <td className="py-3 px-3.5">
                      <div className="space-y-0.5">
                        {item.director ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-semibold text-slate-800 text-2xs">
                              <User className="w-3 h-3 text-indigo-600 shrink-0" />
                              <span>
                                {item.director.firstNameEn} {item.director.lastNameEn || ''}
                              </span>
                              <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-1 rounded">
                                {item.director.employeeNo}
                              </span>
                            </div>
                            {item.director.designation?.name && (
                              <p className="text-[10px] text-slate-500 font-medium">
                                {item.director.designation.name}
                              </p>
                            )}
                          </div>
                        ) : item.directorName ? (
                          <div className="flex items-center gap-1 font-semibold text-slate-800 text-2xs">
                            <User className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>{item.directorName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-3xs italic">Director not assigned</span>
                        )}

                        {item.adminContactPerson ? (
                          <p className="text-[10px] text-slate-500">
                            Desk: {item.adminContactPerson.firstNameEn} {item.adminContactPerson.lastNameEn || ''}
                          </p>
                        ) : item.adminContact ? (
                          <p className="text-[10px] text-slate-500">
                            Desk: {item.adminContact}
                          </p>
                        ) : null}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {item.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenDetail(item)}
                          className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="View Details & Audit Trail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1 rounded text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                          title="Edit Secretariat Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setToggleItem(item);
                            setToggleReason('');
                          }}
                          className={`p-1 rounded transition-colors ${
                            item.status === 'ACTIVE'
                              ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={item.status === 'ACTIVE' ? 'Deactivate Office' : 'Activate Office'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? `Edit Head Office — ${editingItem.name}` : 'Add New Head Office'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 1: Core Identity */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Core Office Identity
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Head Office Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Greenwood International — Central Secretariat"
                  className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                {formErrors.name && (
                  <p className="text-[10px] text-red-500 mt-0.5">{formErrors.name}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-3xs font-bold text-slate-700 uppercase">
                    Head Office Code <span className="text-red-500">*</span>
                  </label>
                  {!editingItem && (
                    <button
                      type="button"
                      onClick={() => setIsCodeLocked(!isCodeLocked)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      {isCodeLocked ? (
                        <>
                          <Lock className="w-2.5 h-2.5" /> Auto-Generated (Click to Override)
                        </>
                      ) : (
                        <>
                          <Unlock className="w-2.5 h-2.5" /> Custom Entry
                        </>
                      )}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.code}
                  readOnly={isCodeLocked && !editingItem}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. HO-KHI-001"
                  className={`w-full font-mono uppercase rounded-lg px-3 py-1.5 text-xs border transition-all ${
                    isCodeLocked && !editingItem
                      ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                      : 'bg-slate-50 hover:bg-slate-50/80 focus:bg-white border-slate-200 text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
                  }`}
                />
                {formErrors.code && (
                  <p className="text-[10px] text-red-500 mt-0.5">{formErrors.code}</p>
                )}
              </div>

              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Short Name / Abbreviation
                </label>
                <input
                  type="text"
                  value={formData.shortName}
                  onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
                  placeholder="e.g. KHI-HO"
                  className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono uppercase text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Registration / Ref Number
                </label>
                <input
                  type="text"
                  value={formData.registrationNo}
                  onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })}
                  placeholder="e.g. REG-HO-002"
                  className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Global Reference Location (Country -> State -> City Cascading Select) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <MapPin className="w-3.5 h-3.5 text-sky-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Secretariat Geographic Location (Cascading Reference)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Country Select */}
              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.countryId}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select Country...</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phoneCallingCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* State / Province Select */}
              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  State / Province / Region
                </label>
                <select
                  value={formData.stateId}
                  onChange={(e) => handleStateChange(e.target.value)}
                  disabled={!formData.countryId || states.length === 0}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {states.length === 0 ? 'No states configured' : 'Select State/Province...'}
                  </option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* City Select */}
              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.cityId}
                  onChange={(e) => handleCityChange(e.target.value)}
                  disabled={!formData.stateId || cities.length === 0}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {cities.length === 0 ? 'No cities configured' : 'Select City...'}
                  </option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name} ({city.code})
                    </option>
                  ))}
                </select>
                {formErrors.city && (
                  <p className="text-[10px] text-red-500 mt-0.5">{formErrors.city}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="e.g. Plot 42, Gulberg III, Main Boulevard"
                  className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                {formErrors.addressLine1 && (
                  <p className="text-[10px] text-red-500 mt-0.5">{formErrors.addressLine1}</p>
                )}
              </div>

              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Postal / ZIP Code
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="e.g. 54000"
                  className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Address Line 2 (Building / Wing / Floor)
                </label>
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="e.g. 2nd Floor, Corporate Secretariat Tower"
                  className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Official Communications */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Official Communications
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Official Phone
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-200/70 border border-r-0 border-slate-200 rounded-l-lg px-2 py-1.5 text-2xs font-mono font-bold text-slate-700 select-none">
                    {activeCallingCode}
                  </span>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 021 34567890"
                    className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-r-lg px-3 py-1.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Alternate Phone / Hotline
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-200/70 border border-r-0 border-slate-200 rounded-l-lg px-2 py-1.5 text-2xs font-mono font-bold text-slate-700 select-none">
                    {activeCallingCode}
                  </span>
                  <input
                    type="text"
                    value={formData.altPhone}
                    onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                    placeholder="e.g. 021 34567891"
                    className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-r-lg px-3 py-1.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. headoffice@greenwood.edu.pk"
                  className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                {formErrors.email && (
                  <p className="text-[10px] text-red-500 mt-0.5">{formErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Official Website Portal URL
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="e.g. https://greenwood.edu.pk"
                  className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Leadership & Key Personnel */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <User className="w-3.5 h-3.5 text-purple-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                4. Executive Leadership &amp; Contact Desk (HR Linked)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Director General / Head of Office (HR Employee)
                </label>
                <select
                  value={formData.directorEmployeeId}
                  onChange={(e) => {
                    const emp = employees.find((empItem) => empItem.id === e.target.value);
                    setFormData({
                      ...formData,
                      directorEmployeeId: e.target.value,
                      directorName: emp ? `${emp.fullName}${emp.designation ? ` (${emp.designation})` : ''}` : formData.directorName,
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select Active Employee from HR...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} [{emp.employeeNo}] — {emp.designation || 'Staff'} ({emp.department || 'General'})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={formData.directorName}
                  onChange={(e) => setFormData({ ...formData, directorName: e.target.value })}
                  placeholder="Or enter title/name manually if not in HR"
                  className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-2xs text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Administrative Contact Person (HR Employee)
                </label>
                <select
                  value={formData.adminContactEmployeeId}
                  onChange={(e) => {
                    const emp = employees.find((empItem) => empItem.id === e.target.value);
                    setFormData({
                      ...formData,
                      adminContactEmployeeId: e.target.value,
                      adminContact: emp ? `${emp.fullName}${emp.designation ? ` (${emp.designation})` : ''}` : formData.adminContact,
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select Active Employee from HR...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} [{emp.employeeNo}] — {emp.designation || 'Staff'} ({emp.department || 'General'})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={formData.adminContact}
                  onChange={(e) => setFormData({ ...formData, adminContact: e.target.value })}
                  placeholder="Or enter desk name manually if not in HR"
                  className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-2xs text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Regional Localization & Operational Status */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <Globe className="w-3.5 h-3.5 text-amber-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                5. Regional Localization &amp; Operation
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Timezone Standard
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                >
                  {timezones.map((tz) => (
                    <option key={tz.id} value={tz.identifier}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Operational Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                >
                  {currencies.map((cur) => (
                    <option key={cur.code} value={cur.code}>
                      {cur.code} ({cur.symbol}) — {cur.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Operational Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE (Operational)</option>
                  <option value="INACTIVE">INACTIVE (Decommissioned)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Administrative Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Additional governance or administrative notes..."
                  className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
              className="text-xs font-semibold text-slate-600 border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs px-4"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : editingItem ? (
                'Update Secretariat'
              ) : (
                'Save Head Office'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL / DRAWER */}
      {detailItem && (
        <Modal
          isOpen={Boolean(detailItem)}
          onClose={() => setDetailItem(null)}
          title={`Head Office Profile — ${detailItem.name}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Header Badge */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100/80 rounded-lg text-indigo-700">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{detailItem.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-3xs font-black text-indigo-700 bg-white border border-indigo-200 px-1 rounded">
                      {detailItem.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                        detailItem.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {detailItem.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-3xs font-semibold">
                <button
                  onClick={() => setDetailTab('OVERVIEW')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    detailTab === 'OVERVIEW'
                      ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setDetailTab('AUDIT')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                    detailTab === 'AUDIT'
                      ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <History className="w-3 h-3" />
                  Audit Trail ({auditLogs.length})
                </button>
              </div>
            </div>

            {detailTab === 'OVERVIEW' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Physical Location */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-3xs uppercase tracking-wider pb-1 border-b border-slate-100">
                    <MapPin className="w-3.5 h-3.5 text-sky-600" />
                    Geographic &amp; Address Details
                  </div>
                  <div className="space-y-1 text-slate-600 text-2xs">
                    <p>
                      <strong className="text-slate-800">Country:</strong> {detailItem.country}
                    </p>
                    <p>
                      <strong className="text-slate-800">State / Region:</strong>{' '}
                      {detailItem.state || 'N/A'}
                    </p>
                    <p>
                      <strong className="text-slate-800">City:</strong> {detailItem.city}
                    </p>
                    <p>
                      <strong className="text-slate-800">Postal Code:</strong>{' '}
                      {detailItem.postalCode || 'N/A'}
                    </p>
                    <p>
                      <strong className="text-slate-800">Address Line 1:</strong>{' '}
                      {detailItem.addressLine1}
                    </p>
                    {detailItem.addressLine2 && (
                      <p>
                        <strong className="text-slate-800">Address Line 2:</strong>{' '}
                        {detailItem.addressLine2}
                      </p>
                    )}
                  </div>
                </div>

                {/* Contact & Web */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-3xs uppercase tracking-wider pb-1 border-b border-slate-100">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    Communications &amp; Online
                  </div>
                  <div className="space-y-1 text-slate-600 text-2xs">
                    <p>
                      <strong className="text-slate-800">Phone:</strong>{' '}
                      {detailItem.phone || 'N/A'}
                    </p>
                    <p>
                      <strong className="text-slate-800">Alt Phone:</strong>{' '}
                      {detailItem.altPhone || 'N/A'}
                    </p>
                    <p>
                      <strong className="text-slate-800">Email:</strong>{' '}
                      {detailItem.email || 'N/A'}
                    </p>
                    <p>
                      <strong className="text-slate-800">Website:</strong>{' '}
                      {detailItem.website ? (
                        <a
                          href={detailItem.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                        >
                          {detailItem.website} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </p>
                  </div>
                </div>

                {/* Leadership */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-3xs uppercase tracking-wider pb-1 border-b border-slate-100">
                    <User className="w-3.5 h-3.5 text-purple-600" />
                    Leadership Desk
                  </div>
                  <div className="space-y-1 text-slate-600 text-2xs">
                    <div>
                      <strong className="text-slate-800">Director General:</strong>{' '}
                      {detailItem.director ? (
                        <span className="font-semibold text-slate-900">
                          {detailItem.director.firstNameEn} {detailItem.director.lastNameEn || ''} [
                          {detailItem.director.employeeNo}] (
                          {detailItem.director.designation?.name || 'Director'})
                        </span>
                      ) : (
                        detailItem.directorName || 'Not Assigned'
                      )}
                    </div>
                    <div>
                      <strong className="text-slate-800">Admin Contact:</strong>{' '}
                      {detailItem.adminContactPerson ? (
                        <span className="font-semibold text-slate-900">
                          {detailItem.adminContactPerson.firstNameEn}{' '}
                          {detailItem.adminContactPerson.lastNameEn || ''} [
                          {detailItem.adminContactPerson.employeeNo}]
                        </span>
                      ) : (
                        detailItem.adminContact || 'Not Assigned'
                      )}
                    </div>
                  </div>
                </div>

                {/* Regional Defaults */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-3xs uppercase tracking-wider pb-1 border-b border-slate-100">
                    <Globe className="w-3.5 h-3.5 text-amber-600" />
                    Localization Standards
                  </div>
                  <div className="space-y-1 text-slate-600 text-2xs">
                    <p>
                      <strong className="text-slate-800">Timezone:</strong>{' '}
                      {detailItem.timezone}
                    </p>
                    <p>
                      <strong className="text-slate-800">Currency:</strong>{' '}
                      {detailItem.currency}
                    </p>
                    <p>
                      <strong className="text-slate-800">Remarks:</strong>{' '}
                      {detailItem.remarks || 'None'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {isLoadingAudit ? (
                  <div className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <p className="text-3xs">Loading audit history...</p>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <Clock className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                    <p className="text-2xs font-semibold">No audit records found</p>
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 text-2xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded text-[10px]">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium">{log.changeSummary || 'No summary'}</p>
                      <p className="text-[10px] text-slate-400">User: {log.userId || 'System'}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* TOGGLE STATUS CONFIRMATION MODAL */}
      {toggleItem && (
        <Modal
          isOpen={Boolean(toggleItem)}
          onClose={() => setToggleItem(null)}
          title={
            toggleItem.status === 'ACTIVE'
              ? 'Deactivate Head Office'
              : 'Activate Head Office'
          }
          maxWidth="md"
        >
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200/70 text-amber-800 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {toggleItem.status === 'ACTIVE'
                    ? `Deactivate "${toggleItem.name}"?`
                    : `Activate "${toggleItem.name}"?`}
                </p>
                <p className="text-2xs text-amber-700 mt-0.5">
                  {toggleItem.status === 'ACTIVE'
                    ? 'Deactivating this secretariat will flag it as inactive. Subordinate entities should be reviewed.'
                    : 'Activating this secretariat will mark it operational in the organization hierarchy.'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                Reason / Remarks (Optional)
              </label>
              <textarea
                rows={2}
                value={toggleReason}
                onChange={(e) => setToggleReason(e.target.value)}
                placeholder="e.g. Consolidation with regional secretariat, renovation..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setToggleItem(null)}
                disabled={isToggling}
                className="text-xs font-semibold text-slate-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleToggleStatus}
                disabled={isToggling}
                className={`text-xs font-semibold text-white shadow-xs ${
                  toggleItem.status === 'ACTIVE'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isToggling ? 'Processing...' : toggleItem.status === 'ACTIVE' ? 'Deactivate Office' : 'Activate Office'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
