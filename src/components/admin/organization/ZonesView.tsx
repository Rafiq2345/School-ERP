'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

export interface ZoneItem {
  id: string;
  tenantId: string;
  headOfficeId: string;
  regionId: string | null;
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
  managerEmployeeId?: string | null;
  adminContactEmployeeId?: string | null;
  managerName?: string | null;
  adminContact?: string | null;
  coverageNotes?: string | null;
  coveredDistricts?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  headOffice?: { id: string; name: string; code: string; city: string; status: string } | null;
  region?: { id: string; name: string; code: string; shortName: string | null; city: string; status: string; headOfficeId: string } | null;
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
  directHoCount: number;
  headOfficesCount: number;
  regionsCount: number;
  citiesCount: number;
  availableCities: string[];
  availableHeadOffices: { id: string; name: string; code: string; city: string; status: string }[];
  availableRegions: { id: string; name: string; code: string; shortName: string | null; city: string; status: string; headOfficeId: string }[];
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

    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toastError('File Too Large', 'Maximum file size allowed is 2 MB.');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'zone');
      formData.append('type', assetType);

      const res = await fetch('/api/admin/organization/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to upload file.');
      }

      setUploadedName(data.data.fileName || file.name);
      onUploadSuccess(data.data.fileUrl, data.data.fileName || file.name);
      toastSuccess('Upload Complete', label + ' uploaded successfully.');
    } catch (err: any) {
      toastError('Upload Failed', err.message || 'Could not upload file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 bg-slate-50/50 dark:bg-slate-800/30">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-indigo-500" />
          {label}
        </label>
        {currentUrl && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
            Attached
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleFileSelect}
        className="hidden"
      />

      {currentUrl ? (
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="w-12 h-12 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-600">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentUrl} alt={label} className="max-w-full max-h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
              {uploadedName || currentUrl.split('/').pop() || 'Current File'}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">PNG/JPG Image</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-7 text-[11px] px-2"
            >
              Replace
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={onRemove}
              className="h-7 text-[11px] px-2 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-lg p-3 text-center transition-colors flex flex-col items-center justify-center gap-1 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          {isUploading ? (
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <span className="text-xs font-medium">
            {isUploading ? 'Uploading...' : ('Upload ' + label + ' (PNG/JPG up to 2MB)')}
          </span>
        </button>
      )}
    </div>
  );
}

export function ZonesView() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get('search') || '';
  const initialHeadOffice = searchParams?.get('headOfficeId') || 'ALL';
  const initialRegion = searchParams?.get('regionId') || 'ALL';

  const { success: toastSuccess, error: toastError } = useToast();

  // State Management
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [headOfficeFilter, setHeadOfficeFilter] = useState(initialHeadOffice);
  const [regionFilter, setRegionFilter] = useState(initialRegion);
  const [cityFilter, setCityFilter] = useState('ALL');

  // Geographic Master Data (Shared Cascading Source)
  const [countries, setCountries] = useState<CountryRef[]>([]);
  const [states, setStates] = useState<StateRef[]>([]);
  const [cities, setCities] = useState<CityRef[]>([]);

  // Modals & Drawers
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneItem | null>(null);
  const [detailZone, setDetailZone] = useState<ZoneItem | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditZoneName, setAuditZoneName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    headOfficeId: '',
    regionId: '',
    name: '',
    code: '',
    codeManualOverride: false,
    registrationNo: '',
    locationMode: 'REFERENCE' as 'REFERENCE' | 'MANUAL',
    countryId: '',
    stateId: '',
    cityId: '',
    addressLine1: '',
    addressLine2: '',
    manualCountry: 'Pakistan',
    manualState: '',
    manualCity: '',
    country: 'Pakistan',
    state: 'Sindh',
    city: 'Karachi',
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
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
  });

  // Load Reference Masters from Shared Endpoint
  const loadReferenceMasters = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reference/countries');
      const data = await res.json();
      if (data.success && data.data) {
        setCountries(data.data);
      }
    } catch {
      // Non-blocking fallback
    }
  }, []);

  // Fetch Zones List
  const fetchZones = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (headOfficeFilter !== 'ALL') params.append('headOfficeId', headOfficeFilter);
      if (regionFilter !== 'ALL') params.append('regionId', regionFilter);
      if (cityFilter !== 'ALL') params.append('city', cityFilter);

      const res = await fetch('/api/admin/organization/zones?' + params.toString());
      const data = await res.json();
      if (data.success) {
        setZones(data.data.items || []);
        setStats(data.data.stats || null);
      } else {
        toastError('Failed to Load Zones', data.error?.message || 'Unexpected response');
      }
    } catch (err: any) {
      toastError('Network Error', err.message || 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, headOfficeFilter, regionFilter, cityFilter, toastError]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  useEffect(() => {
    loadReferenceMasters();
  }, [loadReferenceMasters]);

  // Dynamic Regions Filtered for Form based on selected Head Office
  const formAvailableRegions = useMemo(() => {
    if (!formData.headOfficeId || !stats?.availableRegions) return [];
    return stats.availableRegions.filter((r) => r.headOfficeId === formData.headOfficeId && r.status === 'ACTIVE');
  }, [formData.headOfficeId, stats?.availableRegions]);

  // Geographic Cascading Handlers
  const handleCountryChange = async (countryId: string) => {
    const selectedCountry = countries.find((c) => c.id === countryId);
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

  const handleCityChange = async (cityId: string) => {
    const selectedCity = cities.find((c) => c.id === cityId);
    const cityName = selectedCity?.name || formData.city || 'Karachi';
    setFormData((prev) => ({
      ...prev,
      cityId,
      city: cityName,
    }));

    if (!formData.codeManualOverride && !editingZone) {
      try {
        const res = await fetch(
          '/api/admin/organization/zones/generate-code?city=' + encodeURIComponent(cityName)
        );
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

  // Auto-suggest Zone Code from City or Name
  const generateSuggestedCode = useCallback(
    async (cityNameOrPrefix?: string) => {
      try {
        const res = await fetch(
          '/api/admin/organization/zones/generate-code?city=' + encodeURIComponent(cityNameOrPrefix || 'GEN')
        );
        const data = await res.json();
        if (data.success && data.data?.code) {
          return data.data.code;
        }
      } catch {
        // Fallback
      }
      return 'ZN-GEN-001';
    },
    []
  );

  // Open Add Zone Modal
  const handleOpenAddModal = async () => {
    setEditingZone(null);

    // Default to first active head office if available
    const defaultHO = stats?.availableHeadOffices?.find((h) => h.status === 'ACTIVE') || stats?.availableHeadOffices?.[0];

    // Ensure countries are loaded
    let activeCountries = countries;
    if (activeCountries.length === 0) {
      try {
        const cRes = await fetch('/api/admin/reference/countries');
        const cJson = await cRes.json();
        if (cJson.success && cJson.data) {
          activeCountries = cJson.data;
          setCountries(cJson.data);
        }
      } catch {
        // Non-blocking
      }
    }

    const defaultPk = activeCountries.find((c) => c.isoCode === 'PK') || activeCountries[0];
    const defaultCountryId = defaultPk ? defaultPk.id : '';

    const generated = await generateSuggestedCode('KHI');
    const defaultUsername = generated.toLowerCase().replace(/-/g, '_');

    setFormData({
      headOfficeId: defaultHO?.id || '',
      regionId: '',
      name: '',
      code: generated,
      codeManualOverride: false,
      registrationNo: '',
      locationMode: 'REFERENCE',
      countryId: defaultCountryId,
      stateId: '',
      cityId: '',
      addressLine1: '',
      addressLine2: '',
      manualCountry: 'Pakistan',
      manualState: '',
      manualCity: '',
      country: 'Pakistan',
      state: 'Sindh',
      city: 'Karachi',
      postalCode: '',
      phone: '',
      altPhone: '',
      email: '',
      website: '',
      logoUrl: null,
      signatureUrl: null,
      stampUrl: null,
      loginUsername: defaultUsername,
      loginPassword: '',
      confirmPassword: '',
      loginStatus: 'ACTIVE',
      status: 'ACTIVE',
    });

    // Cascading preload for default country (Pakistan -> Sindh -> Karachi)
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

    setIsFormModalOpen(true);
  };

  // Open Edit Zone Modal
  const handleOpenEditModal = async (zone: ZoneItem) => {
    setEditingZone(zone);

    const hasRefMaster = Boolean(zone.countryId || zone.stateId || zone.cityId);
    const defaultUsername = zone.loginUsername || zone.code.toLowerCase().replace(/-/g, '_');

    setFormData({
      headOfficeId: zone.headOfficeId,
      regionId: zone.regionId || '',
      name: zone.name,
      code: zone.code,
      codeManualOverride: true,
      registrationNo: zone.registrationNo || zone.shortName || '',
      locationMode: hasRefMaster ? 'REFERENCE' : 'MANUAL',
      countryId: zone.countryId || '',
      stateId: zone.stateId || '',
      cityId: zone.cityId || '',
      addressLine1: zone.addressLine1 || '',
      addressLine2: zone.addressLine2 || '',
      manualCountry: zone.country || 'Pakistan',
      manualState: zone.state || '',
      manualCity: zone.city || '',
      country: zone.country || 'Pakistan',
      state: zone.state || '',
      city: zone.city || '',
      postalCode: zone.postalCode || '',
      phone: zone.phone || '',
      altPhone: zone.altPhone || '',
      email: zone.email || '',
      website: zone.website || '',
      logoUrl: zone.logoUrl || null,
      signatureUrl: zone.signatureUrl || null,
      stampUrl: zone.stampUrl || null,
      loginUsername: defaultUsername,
      loginPassword: '',
      confirmPassword: '',
      loginStatus: zone.loginStatus || (zone.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'),
      status: zone.status,
    });

    // Load cascading states and cities for existing record
    if (zone.countryId) {
      try {
        const sRes = await fetch('/api/admin/reference/states?countryId=' + zone.countryId);
        const sJson = await sRes.json();
        if (sJson.success && sJson.data) {
          setStates(sJson.data);
          if (zone.stateId) {
            const cRes = await fetch('/api/admin/reference/cities?stateId=' + zone.stateId);
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

    setIsFormModalOpen(true);
  };

  // Submit Form (Create / Update)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validation
    if (!formData.headOfficeId) {
      toastError('Validation Error', 'Parent Head Office selection is mandatory.');
      return;
    }
    if (!formData.name.trim()) {
      toastError('Validation Error', 'Zone / Area Name is required.');
      return;
    }
    if (!formData.code.trim()) {
      toastError('Validation Error', 'Zone Code is required.');
      return;
    }
    if (!formData.phone.trim()) {
      toastError('Validation Error', 'Official Phone Number is required.');
      return;
    }
    if (!formData.email.trim()) {
      toastError('Validation Error', 'Official Email Address is required.');
      return;
    }
    if (!formData.addressLine1.trim()) {
      toastError('Validation Error', 'Address Line 1 is required.');
      return;
    }

    // Login credentials validation
    if (!editingZone && (!formData.loginPassword || formData.loginPassword.length < 8)) {
      toastError('Validation Error', 'Password must be at least 8 characters long for initial account creation.');
      return;
    }
    if (formData.loginPassword && formData.loginPassword !== formData.confirmPassword) {
      toastError('Validation Error', 'Password and Confirm Password do not match.');
      return;
    }

    try {
      setSubmitting(true);

      const payload: any = {
        headOfficeId: formData.headOfficeId,
        regionId: formData.regionId && formData.regionId !== 'NONE' ? formData.regionId : null,
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        registrationNo: formData.registrationNo.trim() || null,
        shortName: formData.registrationNo.trim() || null,
        addressLine1: formData.addressLine1.trim(),
        addressLine2: formData.addressLine2.trim() || null,
        postalCode: formData.postalCode.trim() || null,
        phone: formData.phone.trim(),
        altPhone: formData.altPhone.trim() || null,
        email: formData.email.trim(),
        website: formData.website.trim() || null,
        logoUrl: formData.logoUrl || null,
        signatureUrl: formData.signatureUrl || null,
        stampUrl: formData.stampUrl || null,
        loginUsername: formData.loginUsername.trim().toLowerCase(),
        loginStatus: formData.loginStatus,
        status: formData.status,
      };

      if (formData.loginPassword && formData.loginPassword.trim()) {
        payload.loginPassword = formData.loginPassword.trim();
      }

      if (formData.locationMode === 'REFERENCE') {
        payload.countryId = formData.countryId || null;
        payload.stateId = formData.stateId || null;
        payload.cityId = formData.cityId || null;
      } else {
        payload.countryId = null;
        payload.stateId = null;
        payload.cityId = null;
        payload.country = formData.manualCountry.trim() || 'Pakistan';
        payload.state = formData.manualState.trim() || null;
        payload.city = formData.manualCity.trim() || null;
      }

      const url = editingZone
        ? ('/api/admin/organization/zones/' + editingZone.id)
        : '/api/admin/organization/zones';
      const method = editingZone ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to save Zone.');
      }

      toastSuccess(
        editingZone ? 'Zone Updated' : 'Zone Created',
        'Zone "' + formData.name + '" has been successfully saved.'
      );

      setIsFormModalOpen(false);
      fetchZones();
    } catch (err: any) {
      toastError('Save Error', err.message || 'Could not save Zone.');
    } finally {
      setSubmitting(false);
    }
  };

  // Status Toggle (Activate / Inactivate)
  const handleToggleStatus = async (zone: ZoneItem) => {
    const nextStatus = zone.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = nextStatus === 'ACTIVE' ? 'activate' : 'deactivate';

    if (!confirm('Are you sure you want to ' + actionLabel + ' Zone "' + zone.name + '"?')) return;

    try {
      const res = await fetch('/api/admin/organization/zones/' + zone.id + '/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, reason: 'User requested ' + actionLabel }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || ('Failed to ' + actionLabel + ' Zone.'));
      }

      toastSuccess('Status Updated', 'Zone status set to ' + nextStatus + '.');
      fetchZones();
    } catch (err: any) {
      toastError('Status Update Failed', err.message || 'Could not update status.');
    }
  };

  // View Audit Logs
  const handleViewAudit = async (zone: ZoneItem) => {
    setAuditZoneName(zone.name);
    try {
      const res = await fetch('/api/admin/organization/zones/' + zone.id + '/audit');
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.data || []);
      } else {
        setAuditLogs([]);
      }
      setIsAuditModalOpen(true);
    } catch {
      toastError('Audit Log Error', 'Could not load audit history.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/settings"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Back to Settings"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-0.5">
                <Layers className="w-4 h-4" />
                <span>Organization Tier 3</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Zone / Area Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Manage zonal clusters, geographic educational districts, and sub-regional administrative units.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenAddModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-sm shadow-indigo-200 dark:shadow-none"
            >
              <Plus className="w-4 h-4" />
              <span>Add Zone</span>
            </Button>
          </div>
        </div>

        {/* Aggregate KPI Strip */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Total Zones</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{stats.total}</span>
            </div>
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100/80 dark:border-emerald-900/30">
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block">Active Zones</span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.active}</span>
            </div>
            <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100/80 dark:border-amber-900/30">
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 block">Direct Head Office</span>
              <span className="text-lg font-bold text-amber-700 dark:text-amber-300">{stats.directHoCount}</span>
            </div>
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100/80 dark:border-indigo-900/30">
              <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 block">Parent Head Offices</span>
              <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{stats.headOfficesCount}</span>
            </div>
            <div className="bg-purple-50/50 dark:bg-purple-950/20 p-3 rounded-xl border border-purple-100/80 dark:border-purple-900/30">
              <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 block">Parent Regions</span>
              <span className="text-lg font-bold text-purple-700 dark:text-purple-300">{stats.regionsCount}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Covered Cities</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{stats.citiesCount}</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search zones by name, code, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Head Office Filter */}
          <select
            value={headOfficeFilter}
            onChange={(e) => {
              setHeadOfficeFilter(e.target.value);
              setRegionFilter('ALL');
            }}
            className="text-xs font-medium py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Head Offices</option>
            {stats?.availableHeadOffices?.map((ho) => (
              <option key={ho.id} value={ho.id}>
                {ho.name} ({ho.code})
              </option>
            ))}
          </select>

          {/* Region Filter */}
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="text-xs font-medium py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Regions</option>
            <option value="NONE">Direct Head Office (No Region)</option>
            {stats?.availableRegions
              ?.filter((r) => headOfficeFilter === 'ALL' || r.headOfficeId === headOfficeFilter)
              .map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {reg.name} ({reg.code})
                </option>
              ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchZones}
            className="text-slate-600 dark:text-slate-300 h-9 px-3"
            title="Refresh List"
          >
            <RefreshCw className={'w-3.5 h-3.5 ' + (loading ? 'animate-spin' : '')} />
          </Button>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading Zones Registry...</p>
          </div>
        ) : zones.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-3 border border-indigo-100 dark:border-indigo-900/50">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No Zones Found</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              {searchQuery || statusFilter !== 'ALL' || headOfficeFilter !== 'ALL' || regionFilter !== 'ALL'
                ? 'No zones matched your filter criteria.'
                : 'Get started by creating your first organizational Zone or Area.'}
            </p>
            <Button onClick={handleOpenAddModal} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create Zone
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Zone / Area Name</th>
                  <th className="py-3.5 px-4">Parent Hierarchy</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Official Contact</th>
                  <th className="py-3.5 px-4 text-center">Login Access</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {zones.map((zone) => (
                  <tr
                    key={zone.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Name & Code */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs flex-shrink-0">
                          {zone.logoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={zone.logoUrl} alt={zone.name} className="w-7 h-7 object-contain rounded" />
                          ) : (
                            <Layers className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{zone.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-100 dark:border-indigo-900/50">
                              {zone.code}
                            </span>
                            {zone.registrationNo && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                Ref: {zone.registrationNo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Parent Hierarchy */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[160px]" title={zone.headOffice?.name || 'Head Office'}>
                            {zone.headOffice?.name || 'Head Office'}
                          </span>
                        </div>
                        <div>
                          {zone.region ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                              <Compass className="w-3 h-3" />
                              <span className="truncate max-w-[140px]">{zone.region.name}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              Direct Head Office
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-xs">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-200">
                            {zone.city || 'N/A'}{zone.state ? (', ' + zone.state) : ''}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                            {zone.addressLine1 || zone.country || 'Pakistan'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Official Contact */}
                    <td className="py-3.5 px-4 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{zone.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[150px]">{zone.email || 'N/A'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Login Access */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-mono text-[11px] font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <Key className="w-3 h-3 text-indigo-500" />
                          {zone.loginUsername || zone.code.toLowerCase().replace(/-/g, '_')}
                        </span>
                        <span
                          className={'text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded mt-0.5 ' + (
                            zone.loginStatus === 'ACTIVE'
                              ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300'
                          )}
                        >
                          {zone.loginStatus || 'ACTIVE'}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ' + (
                          zone.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                            : zone.status === 'INACTIVE'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
                        )}
                      >
                        <span
                          className={'w-1.5 h-1.5 rounded-full ' + (
                            zone.status === 'ACTIVE'
                              ? 'bg-emerald-500'
                              : zone.status === 'INACTIVE'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          )}
                        />
                        {zone.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailZone(zone)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditModal(zone)}
                          className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                          title="Edit Zone"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(zone)}
                          className={'h-8 w-8 p-0 ' + (
                            zone.status === 'ACTIVE'
                              ? 'text-amber-500 hover:text-amber-700'
                              : 'text-emerald-500 hover:text-emerald-700'
                          )}
                          title={zone.status === 'ACTIVE' ? 'Deactivate Zone' : 'Activate Zone'}
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewAudit(zone)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
                          title="Audit Trail"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL FORM (5 Approved Sections) */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => !submitting && setIsFormModalOpen(false)}
        title={editingZone ? ('Edit Zone: ' + editingZone.name) : 'Add New Zone / Area'}
        maxWidth="2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-1.5 -mr-1.5">
          {/* SECTION 1: PARENT & BASIC INFORMATION */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                1. Parent & Basic Information
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Parent Head Office (MANDATORY) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Parent Head Office <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.headOfficeId}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      headOfficeId: e.target.value,
                      regionId: '', // Reset region on head office change
                    }));
                  }}
                  required
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">Select Parent Head Office...</option>
                  {stats?.availableHeadOffices
                    ?.filter((ho) => ho.status === 'ACTIVE' || ho.id === formData.headOfficeId)
                    .map((ho) => (
                      <option key={ho.id} value={ho.id}>
                        {ho.name} ({ho.code})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  A Zone must always belong to a Parent Head Office.
                </p>
              </div>

              {/* Parent Region (OPTIONAL) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Parent Region <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  value={formData.regionId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, regionId: e.target.value }))}
                  disabled={!formData.headOfficeId}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
                >
                  <option value="">None — Direct Head Office Attachment</option>
                  {formAvailableRegions.map((reg) => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name} ({reg.code})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Leave empty if Zone reports directly to Head Office.
                </p>
              </div>

              {/* Zone / Area Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Zone / Area Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Karachi Central Academic Zone"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Zone Code with Lock/Unlock Override */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Zone Code <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="e.g. ZN-KHI-001"
                    value={formData.code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    disabled={!formData.codeManualOverride && Boolean(editingZone)}
                    required
                    className="w-full text-xs font-mono font-semibold uppercase py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, codeManualOverride: !prev.codeManualOverride }))
                    }
                    className="h-8 px-2.5 text-slate-600 dark:text-slate-300"
                    title={formData.codeManualOverride ? 'Lock Code Override' : 'Unlock Code Manual Override'}
                  >
                    {formData.codeManualOverride ? <Unlock className="w-3.5 h-3.5 text-amber-500" /> : <Lock className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Registration / Ref No. */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Registration / Reference No. <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ZN-REF-7788"
                  value={formData.registrationNo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, registrationNo: e.target.value }))}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: LOCATION & ADDRESS */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  2. Location & Address
                </h3>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center bg-slate-200/70 dark:bg-slate-700 p-0.5 rounded-lg text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, locationMode: 'REFERENCE' }))}
                  className={'px-2.5 py-1 rounded-md transition-colors ' + (
                    formData.locationMode === 'REFERENCE'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  )}
                >
                  Reference Master
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, locationMode: 'MANUAL' }))}
                  className={'px-2.5 py-1 rounded-md transition-colors ' + (
                    formData.locationMode === 'MANUAL'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  )}
                >
                  Manual / Free Text
                </button>
              </div>
            </div>

            {formData.locationMode === 'REFERENCE' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Country Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.countryId}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Select Country...</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.isoCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* State Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    State / Province
                  </label>
                  <select
                    value={formData.stateId}
                    onChange={(e) => handleStateChange(e.target.value)}
                    disabled={!formData.countryId || states.length === 0}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">{states.length === 0 ? 'No States Available' : 'Select State / Province...'}</option>
                    {states.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* City Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City
                  </label>
                  <select
                    value={formData.cityId}
                    onChange={(e) => handleCityChange(e.target.value)}
                    disabled={!formData.stateId || cities.length === 0}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">{cities.length === 0 ? 'No Cities Available' : 'Select City...'}</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Manual Country */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.manualCountry}
                    onChange={(e) => setFormData((prev) => ({ ...prev, manualCountry: e.target.value }))}
                    placeholder="e.g. Pakistan"
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Manual State */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    value={formData.manualState}
                    onChange={(e) => setFormData((prev) => ({ ...prev, manualState: e.target.value }))}
                    placeholder="e.g. Sindh"
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Manual City */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.manualCity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, manualCity: e.target.value }))}
                    placeholder="e.g. Karachi"
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Address Lines & Postal Code */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Address Line 1 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Zone 1 Administrative Office, Block 7, Gulshan-e-Iqbal"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  required
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Postal / ZIP Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. 75300"
                  value={formData.postalCode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, postalCode: e.target.value }))}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Address Line 2 <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Academic Operations Wing, 1st Floor"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData((prev) => ({ ...prev, addressLine2: e.target.value }))}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: CONTACT INFORMATION */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
              <Phone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                3. Contact Information
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. +92 21 34981122"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  required
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alternate / Mobile Phone <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. +92 300 1234567"
                  value={formData.altPhone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, altPhone: e.target.value }))}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. zone.central@greenwood.edu.pk"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Website <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://greenwood.edu.pk/zones/central"
                  value={formData.website}
                  onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: DOCUMENTS & BRANDING */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
              <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                4. Documents & Branding (Optional)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Zone Logo */}
              <FileUploadBox
                label="Zone Logo"
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
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  5. Login Access Account
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Authorized Zone Administrator Access
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Login ID / Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Login ID / Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. zn_khi_001"
                  value={formData.loginUsername}
                  onChange={(e) => setFormData((prev) => ({ ...prev, loginUsername: e.target.value.toLowerCase() }))}
                  required
                  className="w-full text-xs font-mono py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Account Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.loginStatus}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      loginStatus: e.target.value as 'ACTIVE' | 'INACTIVE',
                    }))
                  }
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="ACTIVE">Active (Can log into ERP)</option>
                  <option value="INACTIVE">Inactive (Suspended)</option>
                </select>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {editingZone ? 'Reset Password' : 'Password'}{' '}
                  {!editingZone && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="password"
                  placeholder={editingZone ? '•••••••• (leave blank to keep unchanged)' : 'Minimum 8 characters'}
                  value={formData.loginPassword}
                  onChange={(e) => setFormData((prev) => ({ ...prev, loginPassword: e.target.value }))}
                  required={!editingZone}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password{' '}
                  {(!editingZone || Boolean(formData.loginPassword)) && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  required={!editingZone || Boolean(formData.loginPassword)}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormModalOpen(false)}
              disabled={submitting}
              className="text-xs h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-5 flex items-center gap-1.5 shadow-sm"
            >
              {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingZone ? 'Update Zone' : 'Save Zone'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW DETAILS DRAWER */}
      {detailZone && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  {detailZone.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={detailZone.logoUrl} alt={detailZone.name} className="w-8 h-8 object-contain rounded" />
                  ) : (
                    <Layers className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{detailZone.name}</h2>
                  <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                    {detailZone.code}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDetailZone(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Parent Hierarchy Card */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Parent Hierarchy Assignment
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Parent Head Office</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                    {detailZone.headOffice?.name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Parent Region</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                    <Compass className="w-3.5 h-3.5 text-purple-500" />
                    {detailZone.region?.name || 'Direct Head Office Attachment'}
                  </span>
                </div>
              </div>
            </div>

            {/* Location & Address */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Location & Address
              </h4>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{detailZone.addressLine1 || 'N/A'}</p>
                {detailZone.addressLine2 && <p className="text-slate-600 dark:text-slate-300">{detailZone.addressLine2}</p>}
                <p className="text-slate-600 dark:text-slate-300">
                  {[detailZone.city, detailZone.state, detailZone.postalCode, detailZone.country].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>

            {/* Official Contact */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Official Contact
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Phone</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{detailZone.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Email</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{detailZone.email || 'N/A'}</span>
                </div>
                {detailZone.website && (
                  <div className="col-span-2">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Website</span>
                    <a
                      href={detailZone.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      {detailZone.website}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Documents & Branding Thumbnails */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Documents & Branding Assets
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {/* Logo */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] font-semibold text-slate-500 block mb-2">Zone Logo</span>
                  {detailZone.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={detailZone.logoUrl} alt="Logo" className="w-16 h-16 object-contain mx-auto rounded" />
                  ) : (
                    <div className="w-16 h-16 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center mx-auto text-slate-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Signature */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] font-semibold text-slate-500 block mb-2">Authorized Sig</span>
                  {detailZone.signatureUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={detailZone.signatureUrl} alt="Sig" className="w-16 h-16 object-contain mx-auto rounded" />
                  ) : (
                    <div className="w-16 h-16 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center mx-auto text-slate-400">
                      <FileSignature className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Stamp */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] font-semibold text-slate-500 block mb-2">Official Stamp</span>
                  {detailZone.stampUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={detailZone.stampUrl} alt="Stamp" className="w-16 h-16 object-contain mx-auto rounded" />
                  ) : (
                    <div className="w-16 h-16 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center mx-auto text-slate-400">
                      <Stamp className="w-6 h-6" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Login Access Info */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Login Access Account
              </h4>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Assigned Username</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {detailZone.loginUsername || detailZone.code.toLowerCase().replace(/-/g, '_')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Account Status</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {detailZone.loginStatus || 'ACTIVE'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDetailZone(null)}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const z = detailZone;
                  setDetailZone(null);
                  handleOpenEditModal(z);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Edit Zone
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOG MODAL */}
      <Modal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        title={'Audit Trail: ' + auditZoneName}
        maxWidth="lg"
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No audit records found for this Zone.</p>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[11px] uppercase tracking-wider">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300">{log.changeSummary || 'Details updated.'}</p>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
