'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

export interface RegionItem {
  id: string;
  tenantId: string;
  headOfficeId: string;
  name: string;
  code: string;
  shortName: string | null;
  registrationNo?: string | null;
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
  logoUrl?: string | null;
  signatureUrl?: string | null;
  stampUrl?: string | null;
  loginUsername?: string | null;
  loginStatus?: 'ACTIVE' | 'INACTIVE';
  directorEmployeeId?: string | null;
  adminContactEmployeeId?: string | null;
  directorName?: string | null;
  adminContact?: string | null;
  coverageNotes?: string | null;
  coveredDistricts?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  headOffice?: { id: string; name: string; code: string; city: string; status: string } | null;
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
  archived: number;
  headOfficesCount: number;
  citiesCount: number;
  availableCities: string[];
  availableHeadOffices: { id: string; name: string; code: string; city: string; status: string }[];
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
        toastSuccess('Upload Complete', label + ' uploaded successfully.');
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
        accept="image/png, image/jpeg, image/jpg"
        className="hidden"
      />

      {currentUrl ? (
        <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Thumbnail Preview */}
            <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentUrl}
                alt={label}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {uploadedName || currentUrl.split('/').pop() || 'Uploaded file'}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>Uploaded</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={isUploading}
              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
              title="Remove file"
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
          className="w-full py-3 px-3 border border-dashed border-slate-300 hover:border-indigo-400 rounded-lg bg-white/60 hover:bg-indigo-50/40 text-center transition-all flex flex-col items-center justify-center gap-1 text-slate-600"
        >
          {isUploading ? (
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
          ) : (
            <Upload className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-2xs font-semibold text-slate-700">
            {isUploading ? 'Uploading file...' : 'Choose ' + label}
          </span>
          <span className="text-[10px] text-slate-400">Click to browse local files</span>
        </button>
      )}
    </div>
  );
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
  const [headOfficesList, setHeadOfficesList] = useState<{ id: string; name: string; code: string; city: string; status: string }[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [headOfficeFilter, setHeadOfficeFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RegionItem | null>(null);
  const [isCodeLocked, setIsCodeLocked] = useState(true);
  const [locationMode, setLocationMode] = useState<'MASTER' | 'MANUAL'>('MASTER');
  const [activeCallingCode, setActiveCallingCode] = useState('+92');

  const [formData, setFormData] = useState({
    headOfficeId: '',
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
    logoUrl: null as string | null,
    signatureUrl: null as string | null,
    stampUrl: null as string | null,
    loginUsername: '',
    loginPassword: '',
    confirmPassword: '',
    loginStatus: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

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
      const [cRes, hoRes] = await Promise.all([
        fetch('/api/admin/reference/countries'),
        fetch('/api/admin/organization/head-offices'),
      ]);

      const [cJson, hoJson] = await Promise.all([cRes.json(), hoRes.json()]);

      if (cJson.success && cJson.data) setCountries(cJson.data);
      if (hoJson.success && hoJson.data?.items) {
        setHeadOfficesList(
          hoJson.data.items.map((ho: any) => ({
            id: ho.id,
            name: ho.name,
            code: ho.code,
            city: ho.city,
            status: ho.status,
          }))
        );
      }
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
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (headOfficeFilter !== 'ALL') params.set('headOfficeId', headOfficeFilter);
      if (cityFilter !== 'ALL') params.set('city', cityFilter);

      const res = await fetch('/api/admin/organization/regions?' + params.toString());
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
        setStats(json.data.stats || {
          total: 0,
          active: 0,
          inactive: 0,
          archived: 0,
          headOfficesCount: 0,
          citiesCount: 0,
          availableCities: [],
          availableHeadOffices: [],
        });
        if (json.data.stats?.availableHeadOffices?.length > 0) {
          setHeadOfficesList(json.data.stats.availableHeadOffices);
        }
      } else {
        error('Failed to load regions', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not fetch regions.');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, headOfficeFilter, cityFilter, error]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Country Selection & load States
  const handleCountryChange = async (countryId: string) => {
    const selectedCountry = countries.find((c) => c.id === countryId);
    setActiveCallingCode(selectedCountry?.phoneCallingCode || '+92');

    setFormData((prev) => ({
      ...prev,
      countryId,
      country: selectedCountry?.name || 'Pakistan',
      stateId: '',
      state: '',
      cityId: '',
      city: '',
    }));
    setStates([]);
    setCities([]);

    if (countryId) {
      try {
        const res = await fetch('/api/admin/reference/states?countryId=' + countryId);
        const json = await res.json();
        if (json.success && json.data) {
          setStates(json.data);
        }
      } catch {
        // Non-blocking
      }
    }
  };

  // Handle State Selection & load Cities
  const handleStateChange = async (stateId: string) => {
    const selectedState = states.find((s) => s.id === stateId);
    setFormData((prev) => ({
      ...prev,
      stateId,
      state: selectedState?.name || '',
      cityId: '',
      city: '',
    }));
    setCities([]);

    if (stateId) {
      try {
        const res = await fetch('/api/admin/reference/cities?stateId=' + stateId);
        const json = await res.json();
        if (json.success && json.data) {
          setCities(json.data);
        }
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
        const res = await fetch('/api/admin/organization/regions/generate-code?city=' + encodeURIComponent(cityName));
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

    // Look up default active Head Office
    const activeHO = headOfficesList.find((h) => h.status === 'ACTIVE') || headOfficesList[0];
    const defaultHOId = activeHO ? activeHO.id : '';

    // Look up default Pakistan ID if present
    const pkCountry = countries.find((c) => c.isoCode === 'PK');
    const defaultCountryId = pkCountry ? pkCountry.id : (countries[0]?.id || '');
    const defaultCallingCode = pkCountry?.phoneCallingCode || '+92';
    setActiveCallingCode(defaultCallingCode);

    let defaultCode = 'REG-KHI-001';
    try {
      const res = await fetch('/api/admin/organization/regions/generate-code?city=Karachi');
      const json = await res.json();
      if (json.success && json.data?.code) {
        defaultCode = json.data.code;
      }
    } catch {
      // Fallback
    }

    setFormData({
      headOfficeId: defaultHOId,
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
        const sRes = await fetch('/api/admin/reference/states?countryId=' + defaultCountryId);
        const sJson = await sRes.json();
        if (sJson.success && sJson.data) {
          setStates(sJson.data);
          const sindh = sJson.data.find((s: StateRef) => s.code === 'SD' || s.name.includes('Sindh'));
          if (sindh) {
            setFormData((prev) => ({ ...prev, stateId: sindh.id, state: sindh.name }));
            const cRes = await fetch('/api/admin/reference/cities?stateId=' + sindh.id);
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
  }, [countries, headOfficesList]);

  // Open Edit Modal
  const handleOpenEdit = async (item: RegionItem) => {
    setEditingItem(item);
    setIsCodeLocked(false);
    setFormErrors({});

    const hasRef = Boolean(item.countryId && item.cityId);
    setLocationMode(hasRef ? 'MASTER' : 'MANUAL');

    const countryObj = countries.find((c) => c.id === item.countryId);
    setActiveCallingCode(countryObj?.phoneCallingCode || item.countryRef?.phoneCallingCode || '+92');

    setFormData({
      headOfficeId: item.headOfficeId || '',
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
      loginStatus: (item.loginStatus as 'ACTIVE' | 'INACTIVE') || (item.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'),
    });

    if (item.countryId) {
      try {
        const sRes = await fetch('/api/admin/reference/states?countryId=' + item.countryId);
        const sJson = await sRes.json();
        if (sJson.success && sJson.data) {
          setStates(sJson.data);
          if (item.stateId) {
            const cRes = await fetch('/api/admin/reference/cities?stateId=' + item.stateId);
            const cJson = await cRes.json();
            if (cJson.success && cJson.data) {
              setCities(cJson.data);
            }
          }
        }
      } catch {
        // Non-blocking
      }
    }

    setIsFormOpen(true);
  };

  // Close Modal
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    setFormErrors({});
  };

  // Form Client-side Validation
  const validateForm = () => {
    const errs: Record<string, string> = {};

    // 1. Mandatory Parent Head Office
    if (!formData.headOfficeId || !formData.headOfficeId.trim()) {
      errs.headOfficeId = 'Parent Head Office is required. A Region must belong to a Head Office.';
    }

    // 2. Mandatory Basic info
    if (!formData.name.trim()) errs.name = 'Region Name is required.';
    if (!formData.code.trim()) errs.code = 'Region Code is required.';

    // 3. Mandatory Location info
    if (!formData.addressLine1.trim()) errs.addressLine1 = 'Address Line 1 is required.';
    if (!formData.city?.trim()) errs.city = 'City is required.';

    // 4. Mandatory Contact info
    if (!formData.phone?.trim()) {
      errs.phone = 'Official Phone is required.';
    }
    if (!formData.email?.trim()) {
      errs.email = 'Official Email is required.';
    } else if (!/^[^s@]+@[^s@]+.[^s@]+$/.test(formData.email.trim())) {
      errs.email = 'Invalid email format (e.g. region@school.edu.pk).';
    }

    // 5. Login Access validation
    if (!formData.loginUsername || formData.loginUsername.trim().length < 3) {
      errs.loginUsername = 'Login ID / Username must be at least 3 characters.';
    }

    if (!editingItem) {
      // Create mode requires initial password
      if (!formData.loginPassword || formData.loginPassword.length < 8) {
        errs.loginPassword = 'Password must be at least 8 characters long.';
      }
      if (formData.loginPassword !== formData.confirmPassword) {
        errs.confirmPassword = 'Passwords do not match.';
      }
    } else {
      // Edit mode: password optional, but if entered, must be valid and match confirmPassword
      if (formData.loginPassword && formData.loginPassword.length < 8) {
        errs.loginPassword = 'New password must be at least 8 characters long.';
      }
      if (formData.loginPassword && formData.loginPassword !== formData.confirmPassword) {
        errs.confirmPassword = 'Passwords do not match.';
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save (Create / Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const url = editingItem
        ? '/api/admin/organization/regions/' + editingItem.id
        : '/api/admin/organization/regions';
      const method = editingItem ? 'PUT' : 'POST';

      const payload: any = {
        headOfficeId: formData.headOfficeId.trim(),
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        shortName: formData.shortName.trim() ? formData.shortName.trim().toUpperCase() : null,
        registrationNo: formData.registrationNo.trim() || null,
        addressLine1: formData.addressLine1.trim(),
        addressLine2: formData.addressLine2.trim() || null,
        postalCode: formData.postalCode.trim() || null,
        phone: formData.phone.trim() || null,
        altPhone: formData.altPhone.trim() || null,
        email: formData.email.trim() || null,
        website: formData.website.trim() || null,
        logoUrl: formData.logoUrl || null,
        signatureUrl: formData.signatureUrl || null,
        stampUrl: formData.stampUrl || null,
        loginUsername: formData.loginUsername.trim().toLowerCase(),
        loginStatus: formData.loginStatus,
        status: formData.loginStatus,
      };

      if (formData.loginPassword && formData.loginPassword.trim()) {
        payload.loginPassword = formData.loginPassword.trim();
      }

      if (locationMode === 'MASTER') {
        payload.countryId = formData.countryId || null;
        payload.stateId = formData.stateId || null;
        payload.cityId = formData.cityId || null;

        const selCountry = countries.find((c) => c.id === formData.countryId);
        const selState = states.find((s) => s.id === formData.stateId);
        const selCity = cities.find((c) => c.id === formData.cityId);

        payload.country = selCountry?.name || 'Pakistan';
        payload.state = selState?.name || null;
        payload.city = selCity?.name || formData.city;
      } else {
        payload.countryId = null;
        payload.stateId = null;
        payload.cityId = null;
        payload.country = formData.country || 'Pakistan';
        payload.state = formData.state || null;
        payload.city = formData.city;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        success(
          editingItem ? 'Region Updated' : 'Region Created',
          'Successfully saved ' + payload.name + ' (' + payload.code + ')'
        );
        handleCloseForm();
        fetchData();
      } else {
        error(
          editingItem ? 'Update Failed' : 'Creation Failed',
          json.error?.message || 'Could not save Region.'
        );
      }
    } catch {
      error('Error', 'An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  // Open Detail Drawer
  const handleOpenDetail = async (item: RegionItem) => {
    setDetailItem(item);
    setDetailTab('OVERVIEW');
    setIsLoadingAudit(true);
    try {
      const res = await fetch('/api/admin/organization/regions/' + item.id + '/audit');
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

  // Open Status Toggle Dialog
  const handleOpenToggle = (item: RegionItem, target: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED') => {
    setToggleItem(item);
    setTargetStatus(target);
    setToggleReason('');
  };

  // Confirm Status Change
  const handleConfirmToggle = async () => {
    if (!toggleItem) return;
    setIsToggling(true);
    try {
      const res = await fetch('/api/admin/organization/regions/' + toggleItem.id + '/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus, reason: toggleReason }),
      });
      const json = await res.json();
      if (json.success) {
        success(
          'Status Changed',
          'Region "' + toggleItem.name + '" is now ' + targetStatus + '.'
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
              <span>Settings</span>
            </Link>
            <span className="text-slate-300 font-bold">/</span>
            <span className="font-semibold text-slate-500">Organization Hierarchy</span>
            <span className="text-slate-300 font-bold">/</span>
            <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-3xs">
              Regions & Regional Hubs
            </span>
          </div>
          <div className="flex items-center gap-2.5 pt-0.5">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-xs">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                Region Management
              </h1>
              <p className="text-2xs text-slate-500 font-medium">
                Configure intermediate regional governance hubs linked under Parent Head Offices
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="h-8.5 px-3 text-xs font-semibold gap-1.5 border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={'w-3.5 h-3.5 ' + (isLoading ? 'animate-spin text-indigo-600' : 'text-slate-500')} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="h-8.5 px-3.5 text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Region</span>
          </Button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-3xs font-bold uppercase tracking-wider">Total Regions</span>
            <Compass className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-lg font-bold text-slate-900 mt-1">{stats.total}</p>
          <p className="text-3xs text-slate-400 font-medium">All regional registries</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-3xs font-bold uppercase tracking-wider">Active</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-emerald-700 mt-1">{stats.active}</p>
          <p className="text-3xs text-slate-400 font-medium">Operational divisions</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-3xs font-bold uppercase tracking-wider">Inactive / Archived</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-lg font-bold text-amber-700 mt-1">{stats.inactive + stats.archived}</p>
          <p className="text-3xs text-slate-400 font-medium">Non-operational</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-3xs font-bold uppercase tracking-wider">Parent Head Offices</span>
            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <p className="text-lg font-bold text-indigo-700 mt-1">{stats.headOfficesCount}</p>
          <p className="text-3xs text-slate-400 font-medium">Governing Secretariats</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-sky-600">
            <span className="text-3xs font-bold uppercase tracking-wider">Cities Covered</span>
            <MapPin className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <p className="text-lg font-bold text-sky-700 mt-1">{stats.citiesCount}</p>
          <p className="text-3xs text-slate-400 font-medium">Geographic regions</p>
        </div>
      </div>

      {/* 3. FILTERS BAR */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Region Name, Code, City, Parent Head Office..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-indigo-500 focus:bg-white text-slate-800 placeholder:text-slate-400 font-medium transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          {/* Parent Head Office Filter */}
          <select
            value={headOfficeFilter}
            onChange={(e) => setHeadOfficeFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Head Offices</option>
            {headOfficesList.map((ho) => (
              <option key={ho.id} value={ho.id}>
                {ho.name} ({ho.code})
              </option>
            ))}
          </select>

          {/* City Filter */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Cities</option>
            {stats.availableCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {(search || statusFilter !== 'ALL' || headOfficeFilter !== 'ALL' || cityFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setHeadOfficeFilter('ALL');
                setCityFilter('ALL');
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Reset Filters"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. REGIONS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-3xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3.5">Region Name & Code</th>
                <th className="py-2.5 px-3.5">Parent Head Office</th>
                <th className="py-2.5 px-3.5">Location</th>
                <th className="py-2.5 px-3.5">Contact Details</th>
                <th className="py-2.5 px-3.5">Documents</th>
                <th className="py-2.5 px-3.5">Login Access</th>
                <th className="py-2.5 px-3.5 text-center">Status</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span className="font-semibold text-2xs">Loading regions registry...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Compass className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700 text-xs">No Regions Found</p>
                    <p className="text-2xs text-slate-400 mt-0.5">
                      {search || statusFilter !== 'ALL'
                        ? 'Try adjusting your search filters.'
                        : 'Create the first Region under an active Head Office.'}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* 1. Region Name & Code */}
                    <td className="py-2.5 px-3.5 align-top">
                      <div className="flex items-start gap-2">
                        {item.logoUrl ? (
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.logoUrl} alt={item.name} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                            <Compass className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 text-xs leading-snug">{item.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-3xs font-bold text-indigo-600 bg-indigo-50/80 px-1.5 py-0.5 rounded border border-indigo-100">
                              {item.code}
                            </span>
                            {item.registrationNo && (
                              <span className="text-[10px] text-slate-500 font-medium">
                                Ref: {item.registrationNo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Parent Head Office */}
                    <td className="py-2.5 px-3.5 align-top">
                      {item.headOffice ? (
                        <div className="space-y-0.5">
                          <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800">
                            <Building2 className="w-3 h-3 text-indigo-500" />
                            <span>{item.headOffice.name}</span>
                          </div>
                          <p className="text-3xs text-slate-400 font-mono">[{item.headOffice.code}]</p>
                        </div>
                      ) : (
                        <span className="text-3xs text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          Unassigned (Invalid)
                        </span>
                      )}
                    </td>

                    {/* 3. Location */}
                    <td className="py-2.5 px-3.5 align-top">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 font-semibold text-slate-800 text-2xs">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{item.city || 'Karachi'}{item.state ? ', ' + item.state : ''}</span>
                        </div>
                        <p className="text-3xs text-slate-500 truncate max-w-[160px]" title={item.addressLine1 || ''}>
                          {item.addressLine1 || 'No address specified'}
                        </p>
                      </div>
                    </td>

                    {/* 4. Contact Details */}
                    <td className="py-2.5 px-3.5 align-top">
                      <div className="space-y-0.5 text-2xs font-medium text-slate-700">
                        {item.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            <span>{item.phone}</span>
                          </div>
                        )}
                        {item.email && (
                          <div className="flex items-center gap-1 text-slate-500 truncate max-w-[150px]" title={item.email}>
                            <Mail className="w-2.5 h-2.5 text-slate-400" />
                            <span>{item.email}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 5. Documents / Branding */}
                    <td className="py-2.5 px-3.5 align-top">
                      <div className="flex items-center gap-1.5">
                        {item.logoUrl ? (
                          <span className="inline-flex items-center gap-1 text-3xs font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/80" title="Logo Attached">
                            <ImageIcon className="w-2.5 h-2.5" />
                            Logo
                          </span>
                        ) : null}
                        {item.signatureUrl ? (
                          <span className="inline-flex items-center gap-1 text-3xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80" title="Signature Attached">
                            <FileSignature className="w-2.5 h-2.5" />
                            Sig
                          </span>
                        ) : null}
                        {item.stampUrl ? (
                          <span className="inline-flex items-center gap-1 text-3xs font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/80" title="Stamp Attached">
                            <Stamp className="w-2.5 h-2.5" />
                            Seal
                          </span>
                        ) : null}
                        {!item.logoUrl && !item.signatureUrl && !item.stampUrl && (
                          <span className="text-3xs text-slate-400 italic">None</span>
                        )}
                      </div>
                    </td>

                    {/* 6. Login Access */}
                    <td className="py-2.5 px-3.5 align-top">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 font-mono text-3xs font-bold text-slate-700 bg-slate-100/90 px-1.5 py-0.5 rounded border border-slate-200 w-fit">
                          <Key className="w-2.5 h-2.5 text-slate-500" />
                          <span>{item.loginUsername || item.code.toLowerCase().replace(/-/g, '_')}</span>
                        </div>
                        <span className={'inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ' + (item.loginStatus === 'ACTIVE' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-600 bg-slate-100')}>
                          {item.loginStatus === 'ACTIVE' ? 'Active Account' : 'Inactive Account'}
                        </span>
                      </div>
                    </td>

                    {/* 7. Status */}
                    <td className="py-2.5 px-3.5 align-top text-center">
                      <span
                        className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-bold ' + (
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            : item.status === 'ARCHIVED'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                        )}
                      >
                        <span
                          className={'w-1.5 h-1.5 rounded-full ' + (
                            item.status === 'ACTIVE' ? 'bg-emerald-500' : item.status === 'ARCHIVED' ? 'bg-slate-400' : 'bg-rose-500'
                          )}
                        />
                        {item.status}
                      </span>
                    </td>

                    {/* 8. Actions */}
                    <td className="py-2.5 px-3.5 align-top text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenDetail(item)}
                          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="View Details & Audit Trail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="Edit Region"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenToggle(item, item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                          className={'p-1 rounded transition-colors ' + (
                            item.status === 'ACTIVE'
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          )}
                          title={item.status === 'ACTIVE' ? 'Deactivate Region' : 'Activate Region'}
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

      {/* 5. CREATE / EDIT MODAL */}
      <Modal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        title={editingItem ? 'Edit Region — ' + editingItem.name : 'Add New Region'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 max-h-[82vh] overflow-y-auto pr-1">
          {/* SECTION 1: PARENT & BASIC INFORMATION */}
          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/90 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. Parent & Basic Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Mandatory Parent Head Office */}
              <div className="sm:col-span-2">
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Parent Head Office <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.headOfficeId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, headOfficeId: e.target.value }))}
                  className={'w-full text-xs font-semibold bg-white border rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 ' + (
                    formErrors.headOfficeId ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-300'
                  )}
                >
                  <option value="">-- Select Parent Head Office --</option>
                  {headOfficesList.map((ho) => (
                    <option key={ho.id} value={ho.id}>
                      {ho.name} ({ho.code}) {ho.status !== 'ACTIVE' ? '[' + ho.status + ']' : ''}
                    </option>
                  ))}
                </select>
                {formErrors.headOfficeId ? (
                  <p className="text-3xs text-rose-500 font-semibold mt-1">{formErrors.headOfficeId}</p>
                ) : (
                  <p className="text-3xs text-slate-500 mt-1">
                    Every region is strictly subordinate to its parent governing Head Office.
                  </p>
                )}
              </div>

              {/* Region Name */}
              <div className="sm:col-span-2">
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Region Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Southern Sindh & Karachi Region"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className={'w-full text-xs font-semibold bg-white border rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 ' + (
                    formErrors.name ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-300'
                  )}
                />
                {formErrors.name && (
                  <p className="text-3xs text-rose-500 font-semibold mt-1">{formErrors.name}</p>
                )}
              </div>

              {/* Region Code with Lock/Unlock */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-2xs font-bold text-slate-700 uppercase tracking-wider">
                    Region Code <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCodeLocked(!isCodeLocked)}
                    className="text-3xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    {isCodeLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                    <span>{isCodeLocked ? 'Auto (Unlock)' : 'Manual Override'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. REG-KHI-001"
                  value={formData.code}
                  readOnly={isCodeLocked && !editingItem}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setFormData((prev) => ({
                      ...prev,
                      code: val,
                      loginUsername: prev.loginUsername || val.toLowerCase().replace(/-/g, '_'),
                    }));
                  }}
                  className={'w-full text-xs font-mono font-bold uppercase rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 ' + (
                    isCodeLocked && !editingItem ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed' : 'bg-white border-slate-300'
                  ) + ' ' + (formErrors.code ? 'border-rose-400 ring-1 ring-rose-300' : '')}
                />
                {formErrors.code && (
                  <p className="text-3xs text-rose-500 font-semibold mt-1">{formErrors.code}</p>
                )}
              </div>

              {/* Registration / Reference No. */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Registration / Ref No. <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. REG-REG-001"
                  value={formData.registrationNo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, registrationNo: e.target.value }))}
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: LOCATION & ADDRESS */}
          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  2. Location & Address
                </h3>
              </div>

              {/* Master vs Manual Mode Toggle */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setLocationMode('MASTER')}
                  className={'text-3xs font-bold px-2 py-1 rounded-md transition-all ' + (
                    locationMode === 'MASTER'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  )}
                >
                  Reference Master
                </button>
                <button
                  type="button"
                  onClick={() => setLocationMode('MANUAL')}
                  className={'text-3xs font-bold px-2 py-1 rounded-md transition-all ' + (
                    locationMode === 'MANUAL'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  )}
                >
                  Manual / Free Text
                </button>
              </div>
            </div>

            {locationMode === 'MASTER' ? (
              /* Reference Master Cascading Dropdowns */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.countryId}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500"
                  >
                    <option value="">Select Country...</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phoneCallingCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    State / Province
                  </label>
                  <select
                    value={formData.stateId}
                    onChange={(e) => handleStateChange(e.target.value)}
                    disabled={!formData.countryId || states.length === 0}
                    className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">Select State...</option>
                    {states.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.cityId}
                    onChange={(e) => handleCityChange(e.target.value)}
                    disabled={!formData.stateId || cities.length === 0}
                    className={'w-full text-xs font-medium bg-white border rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 ' + (
                      formErrors.city ? 'border-rose-400' : 'border-slate-300'
                    )}
                  >
                    <option value="">Select City...</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.city && (
                    <p className="text-3xs text-rose-500 font-semibold mt-1">{formErrors.city}</p>
                  )}
                </div>
              </div>
            ) : (
              /* Manual / Free Text Inputs */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pakistan"
                    value={formData.country}
                    onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                    className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sindh"
                    value={formData.state}
                    onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                    className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Karachi"
                    value={formData.city}
                    onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                    className={'w-full text-xs font-medium bg-white border rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 ' + (
                      formErrors.city ? 'border-rose-400' : 'border-slate-300'
                    )}
                  />
                  {formErrors.city && (
                    <p className="text-3xs text-rose-500 font-semibold mt-1">{formErrors.city}</p>
                  )}
                </div>
              </div>
            )}

            {/* Address Lines */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2">
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Address Line 1 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Regional Operations Hub, Suite 201, Main Shahrah-e-Faisal"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  className={'w-full text-xs font-medium bg-white border rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 ' + (
                    formErrors.addressLine1 ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-300'
                  )}
                />
                {formErrors.addressLine1 && (
                  <p className="text-3xs text-rose-500 font-semibold mt-1">{formErrors.addressLine1}</p>
                )}
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Postal / ZIP Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. 75400"
                  value={formData.postalCode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, postalCode: e.target.value }))}
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Address Line 2 <span className="text-slate-400 font-normal">(Optional Floor, Suite, Wing)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. South Wing, 2nd Floor"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData((prev) => ({ ...prev, addressLine2: e.target.value }))}
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: CONTACT INFORMATION */}
          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/90 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
              <Phone className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                3. Contact Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Official Phone */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Official Phone <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-indigo-700 bg-indigo-50/80 px-1.5 py-0.5 rounded border border-indigo-200/80">
                    {activeCallingCode}
                  </span>
                  <input
                    type="text"
                    placeholder="21 34567800"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    className={'w-full text-xs font-medium bg-white border rounded-lg pl-16 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 ' + (
                      formErrors.phone ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-300'
                    )}
                  />
                </div>
                {formErrors.phone && (
                  <p className="text-3xs text-rose-500 font-semibold mt-1">{formErrors.phone}</p>
                )}
              </div>

              {/* Alternate Phone */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Alternate / Mobile Phone <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {activeCallingCode}
                  </span>
                  <input
                    type="text"
                    placeholder="300 1234567"
                    value={formData.altPhone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, altPhone: e.target.value }))}
                    className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg pl-16 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Official Email */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Official Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. region.south@greenwood.edu.pk"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className={'w-full text-xs font-medium bg-white border rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 ' + (
                    formErrors.email ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-300'
                  )}
                />
                {formErrors.email && (
                  <p className="text-3xs text-rose-500 font-semibold mt-1">{formErrors.email}</p>
                )}
              </div>

              {/* Official Website */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Official Website <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://greenwood.edu.pk/regions/south"
                  value={formData.website}
                  onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: DOCUMENTS & BRANDING (OPTIONAL) */}
          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  4. Documents & Branding (Optional)
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">PNG, JPG up to 2MB</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Region Logo */}
              <FileUploadBox
                label="Region Logo"
                assetType="logo"
                currentUrl={formData.logoUrl}
                icon={ImageIcon}
                onUploadSuccess={(url) => setFormData((prev) => ({ ...prev, logoUrl: url }))}
                onRemove={() => setFormData((prev) => ({ ...prev, logoUrl: null }))}
              />

              {/* Authorized Signature */}
              <FileUploadBox
                label="Authorized Signature"
                assetType="signature"
                currentUrl={formData.signatureUrl}
                icon={FileSignature}
                onUploadSuccess={(url) => setFormData((prev) => ({ ...prev, signatureUrl: url }))}
                onRemove={() => setFormData((prev) => ({ ...prev, signatureUrl: null }))}
              />

              {/* Official Stamp / Seal */}
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
          <div className="p-3.5 bg-linear-to-br from-indigo-50/60 via-slate-50/70 to-indigo-50/40 rounded-xl border border-indigo-200/90 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-700" />
                <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  5. Login Access & Credentials
                </h3>
              </div>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full">
                {editingItem ? 'Edit Security' : 'Initial Setup'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Login ID / Username */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Login ID / Username <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
                  <input
                    type="text"
                    placeholder="e.g. reg_khi_001"
                    value={formData.loginUsername}
                    onChange={(e) => setFormData((prev) => ({ ...prev, loginUsername: e.target.value.toLowerCase() }))}
                    className={'w-full text-xs font-mono font-bold bg-white border rounded-lg pl-8.5 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 ' + (
                      formErrors.loginUsername ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-300'
                    )}
                  />
                </div>
                {formErrors.loginUsername && (
                  <p className="text-3xs text-rose-500 font-semibold mt-1">{formErrors.loginUsername}</p>
                )}
              </div>

              {/* Account Status */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Account Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.loginStatus}
                  onChange={(e) => setFormData((prev) => ({ ...prev, loginStatus: e.target.value as 'ACTIVE' | 'INACTIVE' }))}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500"
                >
                  <option value="ACTIVE">Active (Permits Region Access)</option>
                  <option value="INACTIVE">Inactive (Suspended Access)</option>
                </select>
              </div>

              {/* Password */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {editingItem ? 'New Password' : 'Password'} <span className={editingItem ? 'text-slate-400 font-normal' : 'text-rose-500'}>{editingItem ? '(Leave blank to keep current)' : '*'}</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
                  <input
                    type="password"
                    placeholder={editingItem ? '•••••••• Leave blank to keep unchanged' : 'Minimum 8 characters'}
                    value={formData.loginPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, loginPassword: e.target.value }))}
                    className={'w-full text-xs bg-white border rounded-lg pl-8.5 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 ' + (
                      formErrors.loginPassword ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-300'
                    )}
                  />
                </div>
                {formErrors.loginPassword && (
                  <p className="text-3xs text-rose-500 font-semibold mt-1">{formErrors.loginPassword}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password <span className={editingItem ? 'text-slate-400 font-normal' : 'text-rose-500'}>{editingItem ? '(If changing password)' : '*'}</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
                  <input
                    type="password"
                    placeholder={editingItem ? 'Confirm new password' : 'Repeat password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className={'w-full text-xs bg-white border rounded-lg pl-8.5 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 ' + (
                      formErrors.confirmPassword ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-300'
                    )}
                  />
                </div>
                {formErrors.confirmPassword && (
                  <p className="text-3xs text-rose-500 font-semibold mt-1">{formErrors.confirmPassword}</p>
                )}
              </div>
            </div>
          </div>

          {/* FORM ACTIONS */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCloseForm}
              disabled={isSaving}
              className="text-xs font-semibold px-4 border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="text-xs font-bold px-5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs gap-1.5"
            >
              {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingItem ? 'Update Region' : 'Save Region'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. DETAIL DRAWER MODAL */}
      <Modal
        isOpen={Boolean(detailItem)}
        onClose={() => setDetailItem(null)}
        title={detailItem ? detailItem.name : 'Region Profile'}
        maxWidth="lg"
      >
        {detailItem && (
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            {/* Drawer Tab Switch */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setDetailTab('OVERVIEW')}
                className={'text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ' + (
                  detailTab === 'OVERVIEW'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Overview & Branding</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('AUDIT')}
                className={'text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ' + (
                  detailTab === 'AUDIT'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <History className="w-3.5 h-3.5" />
                <span>Audit Trail</span>
              </button>
            </div>

            {detailTab === 'OVERVIEW' ? (
              <div className="space-y-3.5 text-xs">
                {/* Header Card with Logo Preview */}
                <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-start gap-3">
                  {detailItem.logoUrl ? (
                    <div className="w-14 h-14 rounded-xl bg-white border border-indigo-200 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={detailItem.logoUrl} alt={detailItem.name} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Compass className="w-7 h-7" />
                    </div>
                  )}
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{detailItem.name}</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-3xs font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                        {detailItem.code}
                      </span>
                      {detailItem.registrationNo && (
                        <span className="text-3xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          Ref: {detailItem.registrationNo}
                        </span>
                      )}
                      <span
                        className={'text-3xs font-bold px-2 py-0.5 rounded-full ' + (
                          detailItem.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        )}
                      >
                        {detailItem.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Parent Head Office Section */}
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-1.5">
                  <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider">
                    Parent Governing Head Office
                  </span>
                  {detailItem.headOffice ? (
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{detailItem.headOffice.name}</p>
                          <p className="text-3xs text-slate-500 font-mono">Code: {detailItem.headOffice.code} • City: {detailItem.headOffice.city}</p>
                        </div>
                      </div>
                      <span className="text-3xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {detailItem.headOffice.status}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-rose-600">No Parent Head Office assigned.</p>
                  )}
                </div>

                {/* Geographic Location & Address */}
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-2">
                  <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider">
                    Geographic Location & Address
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-2xs">
                    <div>
                      <span className="text-slate-400 block text-3xs font-semibold">City & State</span>
                      <span className="font-bold text-slate-800">
                        {detailItem.city || 'Karachi'}, {detailItem.state || 'Sindh'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-3xs font-semibold">Country</span>
                      <span className="font-bold text-slate-800">{detailItem.country || 'Pakistan'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-3xs font-semibold">Primary Address</span>
                      <span className="font-semibold text-slate-800">
                        {detailItem.addressLine1}
                        {detailItem.addressLine2 ? ', ' + detailItem.addressLine2 : ''}
                        {detailItem.postalCode ? ' - ' + detailItem.postalCode : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Official Contact */}
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-2">
                  <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider">
                    Official Contact Channels
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-2xs">
                    <div>
                      <span className="text-slate-400 block text-3xs font-semibold">Official Phone</span>
                      <span className="font-bold text-slate-800">{detailItem.phone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-3xs font-semibold">Alternate / Mobile Phone</span>
                      <span className="font-semibold text-slate-700">{detailItem.altPhone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-3xs font-semibold">Official Email</span>
                      <span className="font-bold text-indigo-600">{detailItem.email || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-3xs font-semibold">Official Website</span>
                      {detailItem.website ? (
                        <a
                          href={detailItem.website}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                        >
                          <span>{detailItem.website}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Documents & Signatures Preview */}
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-2">
                  <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider">
                    Document & Branding Assets
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-2 rounded-lg border border-slate-200 text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 block">Region Logo</span>
                      {detailItem.logoUrl ? (
                        <div className="w-16 h-16 mx-auto rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center p-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={detailItem.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <span className="text-3xs text-slate-400 italic block py-4">Not Uploaded</span>
                      )}
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200 text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 block">Authorized Signature</span>
                      {detailItem.signatureUrl ? (
                        <div className="w-16 h-16 mx-auto rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center p-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={detailItem.signatureUrl} alt="Signature" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <span className="text-3xs text-slate-400 italic block py-4">Not Uploaded</span>
                      )}
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200 text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 block">Official Stamp / Seal</span>
                      {detailItem.stampUrl ? (
                        <div className="w-16 h-16 mx-auto rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center p-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={detailItem.stampUrl} alt="Stamp" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <span className="text-3xs text-slate-400 italic block py-4">Not Uploaded</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Login Access Credentials */}
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2">
                  <span className="text-3xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Login Access Account</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-2xs">
                    <div>
                      <span className="text-slate-400 block text-3xs font-semibold">Login ID / Username</span>
                      <span className="font-mono font-bold text-slate-800">
                        {detailItem.loginUsername || detailItem.code.toLowerCase().replace(/-/g, '_')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-3xs font-semibold">Account Status</span>
                      <span className="font-bold text-emerald-700">
                        {detailItem.loginStatus || detailItem.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* AUDIT TAB */
              <div className="space-y-2 text-xs">
                {isLoadingAudit ? (
                  <div className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-indigo-500" />
                    <span>Loading audit records...</span>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 italic">No audit logs recorded yet.</p>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-2xs">
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {log.action}
                        </span>
                        <span className="text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800">{log.changeSummary || 'Action logged'}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 7. STATUS TOGGLE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(toggleItem)}
        onClose={() => setToggleItem(null)}
        title={targetStatus === 'ACTIVE' ? 'Activate Region' : 'Deactivate Region'}
        maxWidth="sm"
      >
        {toggleItem && (
          <div className="space-y-3.5 text-xs">
            <p className="text-slate-700">
              Are you sure you want to change the operational status of{' '}
              <span className="font-bold text-slate-900">{toggleItem.name}</span> to{' '}
              <span className={'font-bold ' + (targetStatus === 'ACTIVE' ? 'text-emerald-600' : 'text-rose-600')}>
                {targetStatus}
              </span>
              ?
            </p>

            <div>
              <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Reason for Status Change <span className="text-slate-400 font-normal">(Optional audit note)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Scheduled administrative reorganization..."
                value={toggleReason}
                onChange={(e) => setToggleReason(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setToggleItem(null)}
                disabled={isToggling}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmToggle}
                disabled={isToggling}
                className={'text-xs font-bold px-4 text-white ' + (
                  targetStatus === 'ACTIVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                )}
              >
                {isToggling ? 'Updating...' : 'Confirm'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
