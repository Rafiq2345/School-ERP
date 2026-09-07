'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Building2,
  Building,
  MapPin,
  Globe,
  Phone,
  Mail,
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
  ExternalLink,
  ShieldCheck,
  FileText,
  Lock,
  Unlock,
  Upload,
  Image as ImageIcon,
  FileSignature,
  Stamp,
  Trash2,
  Key,
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
  logoUrl: string | null;
  signatureUrl: string | null;
  stampUrl: string | null;
  loginUsername?: string | null;
  loginStatus?: 'ACTIVE' | 'INACTIVE';
  directorEmployeeId?: string | null;
  adminContactEmployeeId?: string | null;
  directorName?: string | null;
  adminContact?: string | null;
  timezone?: string;
  currency?: string;
  status: 'ACTIVE' | 'INACTIVE';
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  countryRef?: { id: string; name: string; isoCode: string; phoneCallingCode: string; currencyCode: string } | null;
  stateRef?: { id: string; name: string; code: string; type: string } | null;
  cityRef?: { id: string; name: string; code: string } | null;
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

// Reusable Document / Branding File Uploader Component
function FileUploadBox({
  label,
  assetType,
  currentUrl,
  icon: Icon,
  onUploadSuccess,
  onRemove,
}: {
  label: string;
  assetType: 'logo' | 'signature' | 'stamp';
  currentUrl: string | null;
  icon: React.ElementType;
  onUploadSuccess: (url: string, fileName: string) => void;
  onRemove: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { error: toastError, success: toastSuccess } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toastError('Invalid File Format', 'Please select a PNG, JPG, or JPEG image file.');
      return;
    }

    // Validate size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toastError('File Too Large', 'Maximum file size allowed is 2 MB.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', assetType);

      const res = await fetch('/api/admin/organization/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.data?.url) {
        setUploadedName(file.name);
        onUploadSuccess(json.data.url, file.name);
        toastSuccess('Upload Complete', `${label} uploaded successfully.`);
      } else {
        toastError('Upload Failed', json.error?.message || 'Failed to upload image.');
      }
    } catch {
      toastError('Upload Error', 'Could not reach the upload server.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-3xs font-bold text-slate-800 uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-[9px] font-semibold text-slate-400">PNG, JPG up to 2MB</span>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/png,image/jpeg,image/jpg"
        className="hidden"
      />

      {currentUrl ? (
        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 shadow-2xs gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentUrl}
              alt={label}
              className="w-10 h-10 object-contain rounded border border-slate-100 bg-slate-50 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-2xs font-bold text-slate-800 truncate">
                {uploadedName || currentUrl.split('/').pop() || `${label} File`}
              </p>
              <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                Ready &amp; Linked
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-2 py-1 text-3xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadedName(null);
                onRemove();
              }}
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Remove File"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full py-3 px-2 border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-lg flex flex-col items-center justify-center gap-1 transition-all text-slate-500 hover:text-indigo-600 cursor-pointer"
        >
          {isUploading ? (
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
          ) : (
            <Upload className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-2xs font-bold">{isUploading ? 'Uploading...' : `Choose ${label}`}</span>
        </button>
      )}
    </div>
  );
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

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HeadOfficeItem | null>(null);
  const [isCodeLocked, setIsCodeLocked] = useState(true);
  const [locationMode, setLocationMode] = useState<'MASTER' | 'MANUAL'>('MASTER');
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
    logoUrl: '' as string | null,
    signatureUrl: '' as string | null,
    stampUrl: '' as string | null,
    loginUsername: '',
    loginPassword: '',
    confirmPassword: '',
    loginStatus: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
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
      const cRes = await fetch('/api/admin/reference/countries');
      const cJson = await cRes.json();
      if (cJson.success) setCountries(cJson.data || []);
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

  // Fetch States when Country changes
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

  // Fetch Cities when State changes
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
    const cityName = selectedCity?.name || formData.city || 'Karachi';
    setFormData((prev) => ({
      ...prev,
      cityId,
      city: cityName,
    }));

    if (isCodeLocked && !editingItem) {
      try {
        const res = await fetch(`/api/admin/organization/head-offices/generate-code?city=${encodeURIComponent(cityName)}`);
        const json = await res.json();
        if (json.success && json.data?.code) {
          setFormData((prev) => ({
            ...prev,
            code: json.data.code,
            loginUsername: prev.loginUsername || json.data.code.toLowerCase().replace(/-/g, '_'),
          }));
        }
      } catch {
        // Non-blocking
      }
    }
  };

  // Open Create Modal
  const handleOpenCreate = useCallback(async () => {
    setEditingItem(null);
    setIsCodeLocked(true);
    setLocationMode('MASTER');
    setFormErrors({});

    // Look up default Pakistan ID if present
    const pkCountry = countries.find((c) => c.isoCode === 'PK');
    const defaultCountryId = pkCountry ? pkCountry.id : (countries[0]?.id || '');
    const defaultCallingCode = pkCountry?.phoneCallingCode || '+92';
    setActiveCallingCode(defaultCallingCode);

    let defaultCode = 'HO-KHI-001';
    try {
      const res = await fetch('/api/admin/organization/head-offices/generate-code?city=Karachi');
      const json = await res.json();
      if (json.success && json.data?.code) {
        defaultCode = json.data.code;
      }
    } catch {
      // Fallback
    }

    setFormData({
      name: '',
      code: defaultCode,
      shortName: '',
      registrationNo: '',
      countryId: defaultCountryId,
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
      logoUrl: null,
      signatureUrl: null,
      stampUrl: null,
      loginUsername: defaultCode.toLowerCase().replace(/-/g, '_'),
      loginPassword: '',
      confirmPassword: '',
      loginStatus: 'ACTIVE',
    });

    if (defaultCountryId) {
      try {
        const sRes = await fetch(`/api/admin/reference/states?countryId=${defaultCountryId}`);
        const sJson = await sRes.json();
        if (sJson.success && sJson.data) {
          setStates(sJson.data);
          const sindh = sJson.data.find((s: StateRef) => s.code === 'SD' || s.name.includes('Sindh'));
          if (sindh) {
            setFormData((prev) => ({ ...prev, stateId: sindh.id, state: sindh.name }));
            const cRes = await fetch(`/api/admin/reference/cities?stateId=${sindh.id}`);
            const cJson = await cRes.json();
            if (cJson.success && cJson.data) {
              setCities(cJson.data);
              const khi = cJson.data.find((c: CityRef) => c.code === 'KHI' || c.name.includes('Karachi'));
              if (khi) {
                setFormData((prev) => ({ ...prev, cityId: khi.id, city: khi.name }));
              }
            }
          }
        }
      } catch {
        // Non-blocking
      }
    }

    setIsFormOpen(true);
  }, [countries]);

  // Open Edit Modal
  const handleOpenEdit = async (item: HeadOfficeItem) => {
    setEditingItem(item);
    setIsCodeLocked(false);
    setFormErrors({});

    const hasRef = Boolean(item.countryId && item.cityId);
    setLocationMode(hasRef ? 'MASTER' : 'MANUAL');

    const countryObj = countries.find((c) => c.id === item.countryId);
    setActiveCallingCode(countryObj?.phoneCallingCode || item.countryRef?.phoneCallingCode || '+92');

    setFormData({
      name: item.name || '',
      code: item.code || '',
      shortName: item.shortName || '',
      registrationNo: item.registrationNo || '',
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
      logoUrl: item.logoUrl || null,
      signatureUrl: item.signatureUrl || null,
      stampUrl: item.stampUrl || null,
      loginUsername: item.loginUsername || item.code.toLowerCase().replace(/-/g, '_'),
      loginPassword: '',
      confirmPassword: '',
      loginStatus: item.loginStatus || item.status || 'ACTIVE',
    });

    if (item.countryId) {
      try {
        const sRes = await fetch(`/api/admin/reference/states?countryId=${item.countryId}`);
        const sJson = await sRes.json();
        if (sJson.success) setStates(sJson.data || []);
      } catch {
        // Non-blocking
      }
    }

    if (item.stateId) {
      try {
        const cRes = await fetch(`/api/admin/reference/cities?stateId=${item.stateId}`);
        const cJson = await cRes.json();
        if (cJson.success) setCities(cJson.data || []);
      } catch {
        // Non-blocking
      }
    }

    setIsFormOpen(true);
  };

  // Open Detail Modal
  const handleOpenDetail = async (item: HeadOfficeItem) => {
    setDetailItem(item);
    setDetailTab('OVERVIEW');
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

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Head Office Name is required.';
    if (!formData.code.trim()) errors.code = 'Head Office Code is required.';
    if (!formData.addressLine1.trim()) errors.addressLine1 = 'Primary Address is required.';
    if (!formData.city.trim()) errors.city = 'City Name is required.';
    if (!formData.phone.trim()) errors.phone = 'Official Phone is required.';
    if (!formData.email.trim()) errors.email = 'Official Email is required.';

    // Login validation
    if (!formData.loginUsername.trim()) {
      errors.loginUsername = 'Login ID / Username is required.';
    } else if (formData.loginUsername.trim().length < 3) {
      errors.loginUsername = 'Username must be at least 3 characters.';
    }

    if (!editingItem) {
      // Create mode requires password
      if (!formData.loginPassword) {
        errors.loginPassword = 'Password is required for new Head Office login account.';
      } else if (formData.loginPassword.length < 8) {
        errors.loginPassword = 'Password must be at least 8 characters long.';
      }
      if (formData.loginPassword !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.';
      }
    } else {
      // Edit mode: only validate password if entered
      if (formData.loginPassword) {
        if (formData.loginPassword.length < 8) {
          errors.loginPassword = 'Password must be at least 8 characters long.';
        }
        if (formData.loginPassword !== formData.confirmPassword) {
          errors.confirmPassword = 'Passwords do not match.';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      error('Validation Error', 'Please correct the highlighted fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        shortName: formData.shortName ? formData.shortName.trim().toUpperCase() : null,
        registrationNo: formData.registrationNo ? formData.registrationNo.trim() : null,
        countryId: locationMode === 'MASTER' ? formData.countryId || null : null,
        stateId: locationMode === 'MASTER' ? formData.stateId || null : null,
        cityId: locationMode === 'MASTER' ? formData.cityId || null : null,
        country: formData.country || 'Pakistan',
        state: formData.state || null,
        city: formData.city.trim(),
        addressLine1: formData.addressLine1.trim(),
        addressLine2: formData.addressLine2 ? formData.addressLine2.trim() : null,
        postalCode: formData.postalCode ? formData.postalCode.trim() : null,
        phone: formData.phone.trim(),
        altPhone: formData.altPhone ? formData.altPhone.trim() : null,
        email: formData.email.trim(),
        website: formData.website ? formData.website.trim() : null,
        logoUrl: formData.logoUrl || null,
        signatureUrl: formData.signatureUrl || null,
        stampUrl: formData.stampUrl || null,
        loginUsername: formData.loginUsername.trim().toLowerCase(),
        loginPassword: formData.loginPassword || undefined,
        loginStatus: formData.loginStatus,
        status: formData.loginStatus,
      };

      const url = editingItem
        ? `/api/admin/organization/head-offices/${editingItem.id}`
        : '/api/admin/organization/head-offices';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        success(
          editingItem ? 'Head Office Updated' : 'Head Office Created',
          `Head Office "${json.data.name}" [${json.data.code}] saved successfully.`
        );
        setIsFormOpen(false);
        fetchData();
      } else {
        error('Save Failed', json.error?.message || 'Could not save Head Office.');
      }
    } catch {
      error('Network Error', 'Failed to communicate with server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Safe Status Toggle
  const handleConfirmToggleStatus = async () => {
    if (!toggleItem) return;
    const targetStatus = toggleItem.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setIsToggling(true);
    try {
      const res = await fetch(`/api/admin/organization/head-offices/${toggleItem.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus, reason: toggleReason }),
      });
      const json = await res.json();
      if (json.success) {
        success(
          'Status Changed',
          `Head Office "${toggleItem.name}" is now ${targetStatus}.`
        );
        setToggleItem(null);
        fetchData();
      } else {
        error('Status Change Failed', json.error?.message);
      }
    } catch {
      error('Error', 'Could not toggle status.');
    } finally {
      setIsToggling(false);
    }
  };

  // URL action listener for ?action=new
  useEffect(() => {
    if (searchParams?.get('action') === 'new') {
      handleOpenCreate();
    }
  }, [searchParams, handleOpenCreate]);

  return (
    <div className="w-full space-y-3 pb-8">
      {/* 1. TOP HEADER & BREADCRUMB */}
      <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200/80 px-2.5 py-1 rounded-md transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Settings Hub</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 font-medium">Organization Hierarchy</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-bold">Head Offices</span>
          </div>

          <div className="flex items-center gap-2.5 pt-0.5">
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Head Office Management
            </h1>
            <span className="px-2 py-0.5 rounded text-3xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/70 hidden sm:inline-flex items-center gap-1">
              <Building2 className="w-3 h-3 text-indigo-600" />
              <span>Tier 1 Central Governance</span>
            </span>
          </div>

          <p className="text-xs text-slate-500 font-medium leading-normal">
            Configure central secretariat units, official contact details, branding documents, and administrator login access.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="h-8 text-3xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1 px-3 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Head Office</span>
          </Button>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Total Head Offices</p>
            <p className="text-base sm:text-lg font-black text-slate-900">{stats.total}</p>
          </div>
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Active Secretariats</p>
            <p className="text-base sm:text-lg font-black text-emerald-600">{stats.active}</p>
          </div>
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Inactive / Retired</p>
            <p className="text-base sm:text-lg font-black text-slate-500">{stats.inactive}</p>
          </div>
          <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
            <Power className="w-4 h-4" />
          </div>
        </div>

        <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Secretariat Cities</p>
            <p className="text-base sm:text-lg font-black text-sky-600">{stats.citiesCount}</p>
          </div>
          <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
            <MapPin className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. SEARCH & FILTER TOOLBAR */}
      <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs p-2.5 sm:p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Head Office by name, code, city, email..."
              className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-lg ps-8 pe-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          {stats.availableCities.length > 0 && (
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hidden sm:inline-block"
            >
              <option value="ALL">All Cities</option>
              {stats.availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 text-3xs font-semibold text-slate-500">
          <span>Showing {items.length} of {stats.total} Head Offices</span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="h-7 px-2 text-3xs font-semibold text-slate-600"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* 4. TABLE REGISTRY VIEW */}
      <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-3xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3.5">Head Office Identity</th>
                <th className="py-2.5 px-3.5">Secretariat Location</th>
                <th className="py-2.5 px-3.5">Official Contact</th>
                <th className="py-2.5 px-3.5">Login Access</th>
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
                      <div className="flex items-start gap-2.5">
                        {item.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.logoUrl}
                            alt={item.name}
                            className="w-8 h-8 rounded-lg object-contain bg-slate-50 border border-slate-200 shrink-0 mt-0.5"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Building2 className="w-4 h-4" />
                          </div>
                        )}
                        <div className="space-y-0.5 min-w-0">
                          <span className="font-bold text-slate-900 block truncate max-w-[200px]">{item.name}</span>
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
                              <span className="text-[10px] text-slate-400 font-medium">
                                Reg: {item.registrationNo}
                              </span>
                            )}
                          </div>
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

                    {/* Login Access */}
                    <td className="py-3 px-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 font-mono text-2xs font-bold text-slate-800">
                          <Key className="w-3 h-3 text-indigo-500" />
                          <span>{item.loginUsername || item.code.toLowerCase().replace(/-/g, '_')}</span>
                        </div>
                        <span className="text-[9px] font-medium text-slate-400">
                          Account: {item.loginStatus || item.status}
                        </span>
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
                          title="Edit Head Office Details"
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

      {/* 5. CREATE / EDIT MODAL (ORDERED: 1. Identity, 2. Location, 3. Contact, 4. Documents, 5. Login) */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? `Edit Head Office — ${editingItem.name}` : 'Add New Head Office'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* SECTION 1: HEAD OFFICE INFORMATION */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Head Office Information
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
                  placeholder="e.g. Al-Falah School System — Central Head Office"
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
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      {isCodeLocked ? (
                        <>
                          <Lock className="w-2.5 h-2.5" /> Auto-Generated
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
                  onChange={(e) => {
                    const nextCode = e.target.value.toUpperCase();
                    setFormData({
                      ...formData,
                      code: nextCode,
                      loginUsername: formData.loginUsername || nextCode.toLowerCase().replace(/-/g, '_'),
                    });
                  }}
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
                  Registration No. / Government Reg No.
                </label>
                <input
                  type="text"
                  value={formData.registrationNo}
                  onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })}
                  placeholder="e.g. REG-HO-2026-001"
                  className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: LOCATION & ADDRESS */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  2. Location &amp; Address
                </h3>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setLocationMode('MASTER')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    locationMode === 'MASTER'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Reference Master
                </button>
                <button
                  type="button"
                  onClick={() => setLocationMode('MANUAL')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    locationMode === 'MANUAL'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Manual / Free Text
                </button>
              </div>
            </div>

            {locationMode === 'MASTER' ? (
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
                    State / Province <span className="text-red-500">*</span>
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
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g. Pakistan"
                    className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                    State / Province <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g. Sindh"
                    className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                    City Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Karachi"
                    className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2">
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="e.g. Plot 14-C, Main Shahrah-e-Faisal, Block 6, PECHS"
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
                  placeholder="e.g. 75400"
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
                  placeholder="e.g. Executive Secretariat Wing, 4th Floor"
                  className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: CONTACT INFORMATION */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Contact Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Official Phone <span className="text-red-500">*</span>
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
                {formErrors.phone && (
                  <p className="text-[10px] text-red-500 mt-0.5">{formErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Alternate / Mobile Phone
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-200/70 border border-r-0 border-slate-200 rounded-l-lg px-2 py-1.5 text-2xs font-mono font-bold text-slate-700 select-none">
                    {activeCallingCode}
                  </span>
                  <input
                    type="text"
                    value={formData.altPhone}
                    onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                    placeholder="e.g. 0300 1234567"
                    className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-r-lg px-3 py-1.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Official Email <span className="text-red-500">*</span>
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
                  Official Website
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

          {/* SECTION 4: DOCUMENTS & BRANDING (OPTIONAL) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                4. Documents &amp; Branding (Optional)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FileUploadBox
                label="Head Office Logo"
                assetType="logo"
                currentUrl={formData.logoUrl}
                icon={ImageIcon}
                onUploadSuccess={(url) => setFormData((prev) => ({ ...prev, logoUrl: url }))}
                onRemove={() => setFormData((prev) => ({ ...prev, logoUrl: null }))}
              />

              <FileUploadBox
                label="Authorized Signature"
                assetType="signature"
                currentUrl={formData.signatureUrl}
                icon={FileSignature}
                onUploadSuccess={(url) => setFormData((prev) => ({ ...prev, signatureUrl: url }))}
                onRemove={() => setFormData((prev) => ({ ...prev, signatureUrl: null }))}
              />

              <FileUploadBox
                label="Official Stamp / Seal"
                assetType="stamp"
                currentUrl={formData.stampUrl}
                icon={Stamp}
                onUploadSuccess={(url) => setFormData((prev) => ({ ...prev, stampUrl: url }))}
                onRemove={() => setFormData((prev) => ({ ...prev, stampUrl: null }))}
              />
            </div>
          </div>

          {/* SECTION 5: LOGIN ACCESS */}
          <div className="space-y-2 pt-1 bg-indigo-50/30 p-3 rounded-xl border border-indigo-100">
            <div className="flex items-center justify-between pb-1 border-b border-indigo-100/70">
              <div className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  5. Login Access &amp; Credentials
                </h3>
              </div>
              <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded border border-indigo-200">
                ERP Access Account
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Login ID / Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.loginUsername}
                  onChange={(e) => setFormData({ ...formData, loginUsername: e.target.value.toLowerCase() })}
                  placeholder="e.g. ho_khi_admin"
                  className="w-full font-mono bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                {formErrors.loginUsername && (
                  <p className="text-[10px] text-red-500 mt-0.5">{formErrors.loginUsername}</p>
                )}
              </div>

              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Account Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.loginStatus}
                  onChange={(e) => setFormData({ ...formData, loginStatus: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="ACTIVE">ACTIVE (Can log in)</option>
                  <option value="INACTIVE">INACTIVE (Access disabled)</option>
                </select>
              </div>

              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  {editingItem ? 'New Password (Optional)' : 'Password *'}
                </label>
                <input
                  type="password"
                  value={formData.loginPassword}
                  onChange={(e) => setFormData({ ...formData, loginPassword: e.target.value })}
                  placeholder={editingItem ? '•••••••• (Leave blank to keep unchanged)' : 'Min. 8 characters'}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                {formErrors.loginPassword && (
                  <p className="text-[10px] text-red-500 mt-0.5">{formErrors.loginPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                  Confirm Password {(!editingItem || formData.loginPassword) && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder={editingItem ? 'Re-type new password' : 'Confirm password'}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                {formErrors.confirmPassword && (
                  <p className="text-[10px] text-red-500 mt-0.5">{formErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1 text-[10px] text-indigo-700">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>
                Passwords are cryptographically hashed using salted scrypt. Passwords are never stored or displayed in plaintext.
              </span>
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
              className="text-xs font-semibold text-slate-600 border-slate-200 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs px-4 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : editingItem ? (
                'Update Head Office'
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
                {detailItem.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detailItem.logoUrl}
                    alt={detailItem.name}
                    className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="p-2 bg-indigo-100/80 rounded-lg text-indigo-700">
                    <Building2 className="w-5 h-5" />
                  </div>
                )}
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
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    detailTab === 'OVERVIEW'
                      ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setDetailTab('AUDIT')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
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
                    <span>Location &amp; Address</span>
                  </div>
                  <div className="space-y-1 text-2xs">
                    <p className="text-slate-700 font-bold">{detailItem.addressLine1}</p>
                    {detailItem.addressLine2 && <p className="text-slate-500">{detailItem.addressLine2}</p>}
                    <p className="text-slate-600 font-medium">
                      {detailItem.city}, {detailItem.state || ''} {detailItem.postalCode || ''}
                    </p>
                    <p className="text-indigo-700 font-bold">{detailItem.country}</p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-3xs uppercase tracking-wider pb-1 border-b border-slate-100">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Official Contact</span>
                  </div>
                  <div className="space-y-1 text-2xs">
                    <div className="flex items-center gap-1 font-mono">
                      <span className="text-slate-400 font-medium">Phone:</span>
                      <span className="text-slate-800 font-bold">{detailItem.phone || 'N/A'}</span>
                    </div>
                    {detailItem.altPhone && (
                      <div className="flex items-center gap-1 font-mono">
                        <span className="text-slate-400 font-medium">Alt:</span>
                        <span className="text-slate-800">{detailItem.altPhone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-medium">Email:</span>
                      <span className="text-slate-800 font-bold">{detailItem.email || 'N/A'}</span>
                    </div>
                    {detailItem.website && (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-medium">Web:</span>
                        <a
                          href={detailItem.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>{detailItem.website}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Documents & Branding */}
                <div className="md:col-span-2 p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-3xs uppercase tracking-wider pb-1 border-b border-slate-100">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                    <span>Documents &amp; Branding Assets</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-1 text-center">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-slate-500 mb-1">Official Logo</span>
                      {detailItem.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={detailItem.logoUrl}
                          alt="Logo"
                          className="w-16 h-16 object-contain bg-white rounded border border-slate-100"
                        />
                      ) : (
                        <span className="text-3xs text-slate-400 italic py-5">Not uploaded</span>
                      )}
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-slate-500 mb-1">Authorized Signature</span>
                      {detailItem.signatureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={detailItem.signatureUrl}
                          alt="Signature"
                          className="w-16 h-16 object-contain bg-white rounded border border-slate-100"
                        />
                      ) : (
                        <span className="text-3xs text-slate-400 italic py-5">Not uploaded</span>
                      )}
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-slate-500 mb-1">Official Stamp</span>
                      {detailItem.stampUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={detailItem.stampUrl}
                          alt="Stamp"
                          className="w-16 h-16 object-contain bg-white rounded border border-slate-100"
                        />
                      ) : (
                        <span className="text-3xs text-slate-400 italic py-5">Not uploaded</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Login Access Info */}
                <div className="md:col-span-2 p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-900 text-3xs uppercase tracking-wider pb-1 border-b border-indigo-100">
                    <Key className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Administrator Login Account</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-2xs pt-1">
                    <div>
                      <span className="text-slate-500 font-medium">Login ID:</span>{' '}
                      <span className="font-mono font-bold text-slate-900">
                        {detailItem.loginUsername || detailItem.code.toLowerCase().replace(/-/g, '_')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Account Status:</span>{' '}
                      <span className="font-bold text-emerald-700">
                        {detailItem.loginStatus || detailItem.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Audit Trail List */
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {isLoadingAudit ? (
                  <div className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-indigo-500" />
                    <p className="text-3xs">Loading audit logs...</p>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <History className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">No audit events recorded</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 text-2xs">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="py-2 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-mono font-bold text-[9px] px-1.5 py-0.2 rounded ${
                              log.action === 'CREATE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : log.action === 'UPDATE'
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {log.action}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-800 font-medium">{log.changeSummary}</p>
                        {log.userId && (
                          <p className="text-[9px] text-slate-400">User: {log.userId}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 6. STATUS TOGGLE MODAL */}
      {toggleItem && (
        <Modal
          isOpen={Boolean(toggleItem)}
          onClose={() => setToggleItem(null)}
          title={toggleItem.status === 'ACTIVE' ? 'Deactivate Head Office' : 'Activate Head Office'}
          maxWidth="md"
        >
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-amber-900">
                  Are you sure you want to {toggleItem.status === 'ACTIVE' ? 'deactivate' : 'activate'} &ldquo;{toggleItem.name}&rdquo;?
                </p>
                <p className="text-3xs text-amber-700 leading-normal">
                  {toggleItem.status === 'ACTIVE'
                    ? 'Deactivating this secretariat will disable its administrative functions and associated login access.'
                    : 'Activating will restore operational status and re-enable login access.'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-3xs font-bold text-slate-700 uppercase mb-1">
                Reason for Status Change (Audit Record)
              </label>
              <textarea
                rows={2}
                value={toggleReason}
                onChange={(e) => setToggleReason(e.target.value)}
                placeholder="e.g. Scheduled executive relocation, administrative maintenance..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setToggleItem(null)}
                disabled={isToggling}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmToggleStatus}
                disabled={isToggling}
                className={`text-xs font-semibold text-white ${
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


