'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  School,
  Building2,
  Compass,
  Layers,
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
  Users,
  Calendar,
  Award,
  CreditCard,
  Building,
  GraduationCap,
  Upload,
  Trash2,
  Image as ImageIcon,
  Check,
  BookOpen,
  Briefcase,
  Stamp,
  PenTool,
  ArrowUpRight,
  Sliders,
  HelpCircle,
  Info,
  Network,
  GitBranch,
  Key,
  Shield,
  FileCheck,
  FileSignature,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export interface BranchItem {
  id: string;
  tenantId: string;
  headOfficeId: string | null;
  regionId: string | null;
  zoneId: string | null;
  name: string;
  code: string;
  shortName: string | null;
  schoolType: string;
  openingDate: string | null;
  registrationNo: string | null;
  boardAffiliation: string | null;
  countryId: string | null;
  stateId: string | null;
  cityId: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  country: string;
  postalCode: string | null;
  timezone: string;
  currency: string;
  phone: string | null;
  altPhone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  stampUrl: string | null;
  tagline: string | null;
  principalEmployeeId: string | null;
  adminContactEmployeeId: string | null;
  principalName: string | null;
  principalDesignation: string | null;
  adminContact: string | null;
  adminContactDesignation: string | null;
  genderModel: string;
  shiftModel: string;
  capacity: number | null;
  academicPrograms: any;
  offeredClassCategoryIds: any;
  offeredClassIds: any;
  academicScopeNotes: string | null;
  feeCollectionAccount: string | null;
  receiptPrefix: string | null;
  voucherPrefix: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  remarks: string | null;
  loginUsername?: string | null;
  loginStatus?: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  headOffice?: { id: string; name: string; code: string; city: string; status: string } | null;
  region?: { id: string; name: string; code: string; shortName: string | null; city: string; status: string; headOfficeId: string } | null;
  zone?: { id: string; name: string; code: string; shortName: string | null; city: string; status: string; headOfficeId: string; regionId: string | null } | null;
  countryRef?: { id: string; name: string; isoCode: string; phoneCallingCode: string; currencyCode: string } | null;
  stateRef?: { id: string; name: string; code: string; type: string } | null;
  cityRef?: { id: string; name: string; code: string } | null;
  principal?: {
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
  defaultTimezone?: string;
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
  independentCount: number;
  networkCount: number;
  directHoCount: number;
  noZoneCount: number;
  totalCapacity: number;
  citiesCount: number;
  availableCities: string[];
  availableSchoolTypes: string[];
  availableHeadOffices: { id: string; name: string; code: string; city: string; status: string }[];
  availableRegions: { id: string; name: string; code: string; shortName: string | null; city: string; status: string; headOfficeId: string }[];
  availableZones: { id: string; name: string; code: string; shortName: string | null; city: string; status: string; headOfficeId: string; regionId: string | null }[];
}

const COMMON_ACADEMIC_PROGRAMS = [
  'Playgroup / Early Childhood',
  'Primary (Grades 1-5)',
  'Middle School (Grades 6-8)',
  'Matriculation (SSC - Science/Arts)',
  'Intermediate (HSSC - Pre-Medical/Engg/ICS/FA)',
  'Cambridge International (O-Level)',
  'Cambridge International (A-Level)',
  'IB Primary Years Programme (PYP)',
  'IB Middle Years Programme (MYP)',
  'IB Diploma Programme (DP)',
  'Technical / Vocational Stream',
];

const COMMON_BOARD_AFFILIATIONS = [
  'Federal Board of Intermediate & Secondary Education (FBISE)',
  'Board of Intermediate & Secondary Education (BISE) Lahore',
  'Board of Intermediate & Secondary Education (BISE) Karachi',
  'Board of Intermediate & Secondary Education (BISE) Rawalpindi',
  'Board of Intermediate & Secondary Education (BISE) Peshawar',
  'Board of Intermediate & Secondary Education (BISE) Quetta',
  'Aga Khan University Examination Board (AKU-EB)',
  'Cambridge Assessment International Education (CAIE)',
  'Pearson Edexcel Qualifications',
  'Oxford AQA International Examinations',
  'Independent / Private School Authority',
];

const CAMPUS_TYPES = [
  'Main Campus',
  'Sub Campus',
  'City Campus',
  'Junior Campus (Primary)',
  'Senior Campus (Secondary & College)',
  'Boys Campus',
  'Girls Campus',
  'Montessori & Early Years Campus',
  'Day Boarding & Residential Campus',
  'Model Campus',
];

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
  assetType: 'logo' | 'signature' | 'stamp' | 'doc';
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
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toastError('Invalid File Format', 'Please select a PNG, JPG, JPEG image or PDF document.');
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
      formData.append('category', 'branch');
      formData.append('type', assetType);

      const res = await fetch('/api/admin/organization/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to upload file.');
      }

      const fileUrl = data.data.fileUrl || data.data.url;
      const fileName = data.data.fileName || file.name;
      setUploadedName(fileName);
      onUploadSuccess(fileUrl, fileName);
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
        accept="image/png,image/jpeg,image/jpg,application/pdf"
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
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Attached Asset</p>
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
              onClick={onRemove}
              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:border-rose-300"
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
          className="w-full border border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-lg p-3 bg-white dark:bg-slate-800/60 transition-colors flex flex-col items-center justify-center gap-1 group text-center"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {isUploading ? <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" /> : <Upload className="w-4 h-4" />}
          </div>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {isUploading ? 'Uploading...' : 'Click to Upload ' + label}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">PNG, JPG, or PDF (up to 2MB)</span>
        </button>
      )}
    </div>
  );
}

export function BranchesView() {
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const searchParams = useSearchParams();

  // Primary Data State
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStructureMode, setSelectedStructureMode] = useState<'ALL' | 'INDEPENDENT' | 'NETWORK'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedHeadOffice, setSelectedHeadOffice] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedSchoolType, setSelectedSchoolType] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');

  // Modal & Selection States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View Details Modal
  const [viewingBranch, setViewingBranch] = useState<BranchItem | null>(null);

  // Reparent / Expand Hierarchy Modal
  const [reparentingBranch, setReparentingBranch] = useState<BranchItem | null>(null);
  const [reparentForm, setReparentForm] = useState({
    headOfficeId: '',
    regionId: '',
    zoneId: '',
    reason: '',
  });
  const [isReparenting, setIsReparenting] = useState(false);

  // Audit Logs Modal
  const [auditBranch, setAuditBranch] = useState<BranchItem | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Status Toggle Confirmation Modal
  const [statusActionBranch, setStatusActionBranch] = useState<{
    branch: BranchItem;
    targetStatus: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  } | null>(null);
  const [statusReason, setStatusReason] = useState('');

  // Reference Masters Data
  const [countries, setCountries] = useState<CountryRef[]>([]);
  const [states, setStates] = useState<StateRef[]>([]);
  const [cities, setCities] = useState<CityRef[]>([]);
  const [locationMode, setLocationMode] = useState<'master' | 'manual'>('master');

  // Form State
  const [formData, setFormData] = useState({
    structureType: 'NETWORK' as 'INDEPENDENT' | 'NETWORK',
    headOfficeId: '',
    regionId: '',
    zoneId: '',
    name: '',
    code: '',
    shortName: '',
    schoolType: 'Main Campus',
    customSchoolType: '',
    openingDate: '',
    registrationNo: '',
    boardAffiliation: 'Federal Board of Intermediate & Secondary Education (FBISE)',
    customBoardAffiliation: '',
    // Location
    countryId: '',
    stateId: '',
    cityId: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: 'Pakistan',
    postalCode: '',
    timezone: 'Asia/Karachi',
    currency: 'PKR',
    // Academic
    academicPrograms: [] as string[],
    genderModel: 'CO_ED',
    shiftModel: 'MORNING',
    capacity: '' as number | string,
    academicScopeNotes: '',
    feeCollectionAccount: '',
    receiptPrefix: 'REC',
    voucherPrefix: 'VCH',
    // Leadership & Contact
    principalName: '',
    principalDesignation: 'Campus Principal',
    adminContact: '',
    adminContactDesignation: 'Campus Administrator',
    phone: '',
    altPhone: '',
    email: '',
    website: '',
    tagline: '',
    // Documents
    logoUrl: null as string | null,
    signatureUrl: null as string | null,
    stampUrl: null as string | null,
    // Login Access
    loginUsername: '',
    loginPassword: '',
    confirmPassword: '',
    loginStatus: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
    remarks: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Load Reference Countries on Mount
  useEffect(() => {
    async function loadCountries() {
      try {
        const res = await fetch('/api/admin/reference/countries');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCountries(data.data);
        }
      } catch {
        // Non-blocking
      }
    }
    loadCountries();
  }, []);

  // Fetch branches and statistics
  const fetchBranches = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (selectedStructureMode !== 'ALL') params.set('structureMode', selectedStructureMode);
      if (selectedHeadOffice !== 'ALL') params.set('headOfficeId', selectedHeadOffice);
      if (selectedRegion !== 'ALL') params.set('regionId', selectedRegion);
      if (selectedZone !== 'ALL') params.set('zoneId', selectedZone);
      if (selectedSchoolType !== 'ALL') params.set('schoolType', selectedSchoolType);
      if (selectedCity !== 'ALL') params.set('city', selectedCity);

      const res = await fetch('/api/admin/organization/branches?' + params.toString());
      const data = await res.json();
      if (data.success) {
        setBranches(data.data.items || []);
        setStats(data.data.stats || null);
      } else {
        toastError('Failed to Load Branches', data.error?.message || 'Could not fetch branches.');
      }
    } catch (err: any) {
      toastError('Network Error', err.message || 'Could not connect to server.');
    } finally {
      setIsLoading(false);
    }
  }, [
    searchQuery,
    selectedStatus,
    selectedStructureMode,
    selectedHeadOffice,
    selectedRegion,
    selectedZone,
    selectedSchoolType,
    selectedCity,
    toastError,
  ]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Dynamic Regions filter for form based on selected Head Office
  const formAvailableRegions = useMemo(() => {
    if (!stats?.availableRegions || !formData.headOfficeId) return [];
    return stats.availableRegions.filter((r) => r.headOfficeId === formData.headOfficeId && r.status === 'ACTIVE');
  }, [stats?.availableRegions, formData.headOfficeId]);

  // Dynamic Zones filter for form based on selected Head Office and Region
  const formAvailableZones = useMemo(() => {
    if (!stats?.availableZones || !formData.headOfficeId) return [];
    return stats.availableZones.filter((z) => {
      if (z.headOfficeId !== formData.headOfficeId || z.status !== 'ACTIVE') return false;
      if (formData.regionId && z.regionId && z.regionId !== formData.regionId) return false;
      return true;
    });
  }, [stats?.availableZones, formData.headOfficeId, formData.regionId]);

  // Dynamic Regions for Reparent Modal
  const reparentAvailableRegions = useMemo(() => {
    if (!stats?.availableRegions || !reparentForm.headOfficeId) return [];
    return stats.availableRegions.filter((r) => r.headOfficeId === reparentForm.headOfficeId && r.status === 'ACTIVE');
  }, [stats?.availableRegions, reparentForm.headOfficeId]);

  // Dynamic Zones for Reparent Modal
  const reparentAvailableZones = useMemo(() => {
    if (!stats?.availableZones || !reparentForm.headOfficeId) return [];
    return stats.availableZones.filter((z) => {
      if (z.headOfficeId !== reparentForm.headOfficeId || z.status !== 'ACTIVE') return false;
      if (reparentForm.regionId && z.regionId && z.regionId !== reparentForm.regionId) return false;
      return true;
    });
  }, [stats?.availableZones, reparentForm.headOfficeId, reparentForm.regionId]);

  // Handle cascading country change
  const handleCountryChange = async (countryId: string) => {
    setFormData((prev) => ({ ...prev, countryId, stateId: '', cityId: '', state: '', city: '' }));
    setStates([]);
    setCities([]);

    if (!countryId) return;
    const selCountry = countries.find((c) => c.id === countryId);
    if (selCountry) {
      setFormData((prev) => ({ ...prev, country: selCountry.name, countryId }));
    }

    try {
      const res = await fetch(`/api/admin/reference/states?countryId=${countryId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setStates(data.data);
      }
    } catch {
      // Non-blocking
    }
  };

  // Handle cascading state change
  const handleStateChange = async (stateId: string) => {
    setFormData((prev) => ({ ...prev, stateId, cityId: '', city: '' }));
    setCities([]);

    if (!stateId) return;
    const selState = states.find((s) => s.id === stateId);
    if (selState) {
      setFormData((prev) => ({ ...prev, state: selState.name, stateId }));
    }

    try {
      const res = await fetch(`/api/admin/reference/cities?stateId=${stateId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCities(data.data);
      }
    } catch {
      // Non-blocking
    }
  };

  // Handle cascading city change
  const handleCityChange = (cityId: string) => {
    setFormData((prev) => ({ ...prev, cityId }));
    if (!cityId) return;
    const selCity = cities.find((c) => c.id === cityId);
    if (selCity) {
      setFormData((prev) => ({ ...prev, city: selCity.name, cityId }));
    }
  };

  // Open Add Form Modal
  const handleOpenCreateModal = async () => {
    setFormMode('create');
    setEditingBranch(null);
    setFormErrors({});
    setLocationMode('master');

    // Default primary HO if available
    const primaryHO = stats?.availableHeadOffices?.find((h) => h.status === 'ACTIVE') || stats?.availableHeadOffices?.[0];

    // Find PK in reference countries
    const pk = countries.find((c) => c.isoCode === 'PK');
    const pkId = pk ? pk.id : '';

    setFormData({
      structureType: primaryHO ? 'NETWORK' : 'INDEPENDENT',
      headOfficeId: primaryHO ? primaryHO.id : '',
      regionId: '',
      zoneId: '',
      name: '',
      code: '',
      shortName: '',
      schoolType: 'Main Campus',
      customSchoolType: '',
      openingDate: '',
      registrationNo: '',
      boardAffiliation: 'Federal Board of Intermediate & Secondary Education (FBISE)',
      customBoardAffiliation: '',
      countryId: pkId,
      stateId: '',
      cityId: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      country: 'Pakistan',
      postalCode: '',
      timezone: 'Asia/Karachi',
      currency: 'PKR',
      academicPrograms: ['Matriculation (SSC - Science/Arts)', 'Primary (Grades 1-5)', 'Middle School (Grades 6-8)'],
      genderModel: 'CO_ED',
      shiftModel: 'MORNING',
      capacity: 1000,
      academicScopeNotes: 'Full-spectrum academic institution covering primary, middle, and matriculation curriculum.',
      feeCollectionAccount: '',
      receiptPrefix: 'REC',
      voucherPrefix: 'VCH',
      principalName: '',
      principalDesignation: 'Campus Principal',
      adminContact: '',
      adminContactDesignation: 'Campus Administrator',
      phone: '',
      altPhone: '',
      email: '',
      website: '',
      tagline: 'Inspiring Character, Knowledge & Leadership',
      logoUrl: null,
      signatureUrl: null,
      stampUrl: null,
      loginUsername: '',
      loginPassword: '',
      confirmPassword: '',
      loginStatus: 'ACTIVE',
      status: 'ACTIVE',
      remarks: '',
    });

    if (pkId) {
      try {
        const stateRes = await fetch(`/api/admin/reference/states?countryId=${pkId}`);
        const stateData = await stateRes.json();
        if (stateData.success && Array.isArray(stateData.data)) {
          setStates(stateData.data);
          const sindh = stateData.data.find((s: StateRef) => s.code === 'SD' || s.name.toLowerCase().includes('sindh'));
          if (sindh) {
            setFormData((prev) => ({ ...prev, stateId: sindh.id, state: sindh.name }));
            const cityRes = await fetch(`/api/admin/reference/cities?stateId=${sindh.id}`);
            const cityData = await cityRes.json();
            if (cityData.success && Array.isArray(cityData.data)) {
              setCities(cityData.data);
              const khi = cityData.data.find((c: CityRef) => c.code === 'KHI' || c.name.toLowerCase().includes('karachi'));
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

    // Auto-generate code
    try {
      const codeRes = await fetch('/api/admin/organization/branches/generate-code?city=KHI');
      const codeData = await codeRes.json();
      if (codeData.success && codeData.data?.code) {
        setFormData((prev) => ({
          ...prev,
          code: codeData.data.code,
          loginUsername: codeData.data.code.toLowerCase().replace(/-/g, '_'),
        }));
      }
    } catch {
      // Non-blocking
    }

    setIsFormOpen(true);
  };

  // Open Edit Form Modal
  const handleOpenEditModal = async (branch: BranchItem) => {
    setFormMode('edit');
    setEditingBranch(branch);
    setFormErrors({});

    const hasRef = !!(branch.countryId || branch.stateId || branch.cityId);
    setLocationMode(hasRef ? 'master' : 'manual');

    const isCustomType = !CAMPUS_TYPES.includes(branch.schoolType);
    const isCustomBoard = branch.boardAffiliation && !COMMON_BOARD_AFFILIATIONS.includes(branch.boardAffiliation);

    setFormData({
      structureType: branch.headOfficeId ? 'NETWORK' : 'INDEPENDENT',
      headOfficeId: branch.headOfficeId || '',
      regionId: branch.regionId || '',
      zoneId: branch.zoneId || '',
      name: branch.name,
      code: branch.code,
      shortName: branch.shortName || '',
      schoolType: isCustomType ? 'Other' : branch.schoolType,
      customSchoolType: isCustomType ? branch.schoolType : '',
      openingDate: branch.openingDate ? branch.openingDate.split('T')[0] : '',
      registrationNo: branch.registrationNo || '',
      boardAffiliation: isCustomBoard ? 'Other' : (branch.boardAffiliation || 'Federal Board of Intermediate & Secondary Education (FBISE)'),
      customBoardAffiliation: isCustomBoard ? branch.boardAffiliation || '' : '',
      countryId: branch.countryId || '',
      stateId: branch.stateId || '',
      cityId: branch.cityId || '',
      addressLine1: branch.addressLine1 || '',
      addressLine2: branch.addressLine2 || '',
      city: branch.city || '',
      state: branch.state || '',
      country: branch.country || 'Pakistan',
      postalCode: branch.postalCode || '',
      timezone: branch.timezone || 'Asia/Karachi',
      currency: branch.currency || 'PKR',
      academicPrograms: Array.isArray(branch.academicPrograms) ? branch.academicPrograms : [],
      genderModel: branch.genderModel || 'CO_ED',
      shiftModel: branch.shiftModel || 'MORNING',
      capacity: branch.capacity !== null && branch.capacity !== undefined ? branch.capacity : '',
      academicScopeNotes: branch.academicScopeNotes || '',
      feeCollectionAccount: branch.feeCollectionAccount || '',
      receiptPrefix: branch.receiptPrefix || 'REC',
      voucherPrefix: branch.voucherPrefix || 'VCH',
      principalName: branch.principalName || '',
      principalDesignation: branch.principalDesignation || 'Campus Principal',
      adminContact: branch.adminContact || '',
      adminContactDesignation: branch.adminContactDesignation || 'Campus Administrator',
      phone: branch.phone || '',
      altPhone: branch.altPhone || '',
      email: branch.email || '',
      website: branch.website || '',
      tagline: branch.tagline || '',
      logoUrl: branch.logoUrl || null,
      signatureUrl: branch.signatureUrl || null,
      stampUrl: branch.stampUrl || null,
      loginUsername: branch.loginUsername || branch.code.toLowerCase().replace(/-/g, '_'),
      loginPassword: '',
      confirmPassword: '',
      loginStatus: branch.loginStatus || 'ACTIVE',
      status: branch.status || 'ACTIVE',
      remarks: branch.remarks || '',
    });

    // Load cascading states and cities for existing branch
    if (branch.countryId) {
      try {
        const stateRes = await fetch(`/api/admin/reference/states?countryId=${branch.countryId}`);
        const stateData = await stateRes.json();
        if (stateData.success && Array.isArray(stateData.data)) {
          setStates(stateData.data);
        }
      } catch {
        // Non-blocking
      }
    }

    if (branch.stateId) {
      try {
        const cityRes = await fetch(`/api/admin/reference/cities?stateId=${branch.stateId}`);
        const cityData = await cityRes.json();
        if (cityData.success && Array.isArray(cityData.data)) {
          setCities(cityData.data);
        }
      } catch {
        // Non-blocking
      }
    }

    setIsFormOpen(true);
  };

  // Toggle Academic Program pill selection
  const toggleAcademicProgram = (program: string) => {
    setFormData((prev) => {
      const current = prev.academicPrograms || [];
      if (current.includes(program)) {
        return { ...prev, academicPrograms: current.filter((p) => p !== program) };
      } else {
        return { ...prev, academicPrograms: [...current, program] };
      }
    });
  };

  // Validate Form Inputs
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (formData.structureType === 'NETWORK' && !formData.headOfficeId) {
      errors.headOfficeId = 'Please select a parent Head Office.';
    }

    if (!formData.name.trim()) {
      errors.name = 'Branch / Campus Name is required.';
    }

    if (!formData.code.trim()) {
      errors.code = 'Branch Code is required.';
    }

    if (!formData.addressLine1.trim()) {
      errors.addressLine1 = 'Address Line 1 is required.';
    }

    if (locationMode === 'master') {
      if (!formData.cityId && !formData.city) {
        errors.cityId = 'Please select a City from the reference list.';
      }
    } else {
      if (!formData.city.trim()) {
        errors.city = 'City is required.';
      }
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Official Contact Phone is required.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Official Email is required.';
    } else if (!/^[^s@]+@[^s@]+.[^s@]+$/.test(formData.email.trim())) {
      errors.email = 'Invalid official email address format.';
    }

    if (formData.loginPassword) {
      if (formData.loginPassword.length < 8) {
        errors.loginPassword = 'Password must be at least 8 characters long.';
      }
      if (formData.loginPassword !== formData.confirmPassword) {
        errors.confirmPassword = 'Password and Confirm Password do not match.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toastError('Validation Error', 'Please correct the highlighted fields before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const effectiveSchoolType = formData.schoolType === 'Other' ? formData.customSchoolType.trim() : formData.schoolType;
      const effectiveBoard = formData.boardAffiliation === 'Other' ? formData.customBoardAffiliation.trim() : formData.boardAffiliation;

      const payload = {
        headOfficeId: formData.structureType === 'NETWORK' ? formData.headOfficeId : null,
        regionId: formData.structureType === 'NETWORK' && formData.regionId ? formData.regionId : null,
        zoneId: formData.structureType === 'NETWORK' && formData.zoneId ? formData.zoneId : null,
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        shortName: formData.shortName ? formData.shortName.trim().toUpperCase() : null,
        schoolType: effectiveSchoolType || 'Branch Campus',
        openingDate: formData.openingDate || null,
        registrationNo: formData.registrationNo ? formData.registrationNo.trim() : null,
        boardAffiliation: effectiveBoard || null,
        countryId: locationMode === 'master' ? formData.countryId || null : null,
        stateId: locationMode === 'master' ? formData.stateId || null : null,
        cityId: locationMode === 'master' ? formData.cityId || null : null,
        addressLine1: formData.addressLine1.trim(),
        addressLine2: formData.addressLine2 ? formData.addressLine2.trim() : null,
        city: formData.city.trim(),
        state: formData.state ? formData.state.trim() : null,
        country: formData.country ? formData.country.trim() : 'Pakistan',
        postalCode: formData.postalCode ? formData.postalCode.trim() : null,
        timezone: formData.timezone || 'Asia/Karachi',
        currency: formData.currency || 'PKR',
        phone: formData.phone.trim(),
        altPhone: formData.altPhone ? formData.altPhone.trim() : null,
        email: formData.email.trim(),
        website: formData.website ? formData.website.trim() : null,
        tagline: formData.tagline ? formData.tagline.trim() : null,
        principalName: formData.principalName ? formData.principalName.trim() : null,
        principalDesignation: formData.principalDesignation ? formData.principalDesignation.trim() : 'Campus Principal',
        adminContact: formData.adminContact ? formData.adminContact.trim() : null,
        adminContactDesignation: formData.adminContactDesignation ? formData.adminContactDesignation.trim() : 'Campus Administrator',
        genderModel: formData.genderModel,
        shiftModel: formData.shiftModel,
        capacity: formData.capacity ? Number(formData.capacity) : null,
        academicPrograms: formData.academicPrograms,
        academicScopeNotes: formData.academicScopeNotes ? formData.academicScopeNotes.trim() : null,
        feeCollectionAccount: formData.feeCollectionAccount ? formData.feeCollectionAccount.trim() : null,
        receiptPrefix: formData.receiptPrefix ? formData.receiptPrefix.trim().toUpperCase() : 'REC',
        voucherPrefix: formData.voucherPrefix ? formData.voucherPrefix.trim().toUpperCase() : 'VCH',
        logoUrl: formData.logoUrl,
        signatureUrl: formData.signatureUrl,
        stampUrl: formData.stampUrl,
        loginUsername: formData.loginUsername ? formData.loginUsername.trim().toLowerCase() : undefined,
        loginPassword: formData.loginPassword ? formData.loginPassword.trim() : undefined,
        loginStatus: formData.loginStatus,
        status: formData.status,
        remarks: formData.remarks ? formData.remarks.trim() : null,
      };

      const url = formMode === 'create' ? '/api/admin/organization/branches' : `/api/admin/organization/branches/${editingBranch?.id}`;
      const method = formMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to save Branch details.');
      }

      toastSuccess(
        formMode === 'create' ? 'Branch Created' : 'Branch Updated',
        `Branch "${data.data.name}" [${data.data.code}] has been saved successfully.`
      );
      setIsFormOpen(false);
      fetchBranches();
    } catch (err: any) {
      toastError('Save Failed', err.message || 'Could not save Branch details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Reparent / Expand Hierarchy Modal
  const handleOpenReparentModal = (branch: BranchItem) => {
    setReparentingBranch(branch);
    setReparentForm({
      headOfficeId: branch.headOfficeId || (stats?.availableHeadOffices?.[0]?.id || ''),
      regionId: branch.regionId || '',
      zoneId: branch.zoneId || '',
      reason: '',
    });
  };

  // Submit Reparent / Expand Hierarchy
  const handleSubmitReparent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reparentingBranch) return;

    setIsReparenting(true);
    try {
      const res = await fetch(`/api/admin/organization/branches/${reparentingBranch.id}/reparent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headOfficeId: reparentForm.headOfficeId || null,
          regionId: reparentForm.regionId || null,
          zoneId: reparentForm.zoneId || null,
          reason: reparentForm.reason ? reparentForm.reason.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update hierarchy.');
      }

      toastSuccess('Hierarchy Updated', `Branch "${data.data.name}" organization structure has been reassigned successfully.`);
      setReparentingBranch(null);
      fetchBranches();
    } catch (err: any) {
      toastError('Reparent Failed', err.message || 'Could not update hierarchy.');
    } finally {
      setIsReparenting(false);
    }
  };

  // Fetch Audit Logs for a branch
  const handleOpenAuditModal = async (branch: BranchItem) => {
    setAuditBranch(branch);
    setIsLoadingAudit(true);
    try {
      const res = await fetch(`/api/admin/organization/branches/${branch.id}/audit`);
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.data || []);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // Handle Status Toggle Confirmation
  const handleConfirmStatusToggle = async () => {
    if (!statusActionBranch) return;
    try {
      const { branch, targetStatus } = statusActionBranch;
      const res = await fetch(`/api/admin/organization/branches/${branch.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          reason: statusReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update status.');
      }

      toastSuccess('Status Changed', `Branch status changed to ${targetStatus}.`);
      setStatusActionBranch(null);
      setStatusReason('');
      fetchBranches();
    } catch (err: any) {
      toastError('Status Change Failed', err.message || 'Could not change branch status.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Top Header & Breadcrumb */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              <Link href="/admin/settings" className="hover:text-indigo-600 transition-colors">
                Settings
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href="/admin/settings/organization-structure" className="hover:text-indigo-600 transition-colors">
                Organization Structure
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-800 dark:text-slate-200 font-semibold">Branches / Campuses</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <School className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Branch / Campus Management
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure independent schools, multi-campus networks, academic offerings, and campus credentials.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBranches}
              disabled={isLoading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleOpenCreateModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add New Campus / School
            </Button>
          </div>
        </div>

        {/* Top Summary Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-medium">Total Campuses</span>
                <School className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-medium">Independent</span>
                <School className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.independentCount}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-medium">In Network</span>
                <Network className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.networkCount}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-medium">Active</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-medium">Student Capacity</span>
                <Users className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.totalCapacity.toLocaleString()}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-medium">Cities Covered</span>
                <MapPin className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.citiesCount}</p>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="max-w-7xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search campus, code, city, board, principal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Structure Mode Filter */}
          <div>
            <select
              value={selectedStructureMode}
              onChange={(e) => setSelectedStructureMode(e.target.value as any)}
              className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Structures</option>
              <option value="INDEPENDENT">Independent Schools</option>
              <option value="NETWORK">Network Campuses</option>
            </select>
          </div>

          {/* Head Office Filter */}
          <div>
            <select
              value={selectedHeadOffice}
              onChange={(e) => {
                setSelectedHeadOffice(e.target.value);
                setSelectedRegion('ALL');
                setSelectedZone('ALL');
              }}
              className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Head Offices</option>
              {stats?.availableHeadOffices?.map((ho) => (
                <option key={ho.id} value={ho.id}>
                  {ho.name}
                </option>
              ))}
            </select>
          </div>

          {/* Campus Type Filter */}
          <div>
            <select
              value={selectedSchoolType}
              onChange={(e) => setSelectedSchoolType(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Campus Types</option>
              {stats?.availableSchoolTypes?.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
              <option value="ARCHIVED">Archived Only</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedStructureMode('ALL');
                setSelectedStatus('ALL');
                setSelectedHeadOffice('ALL');
                setSelectedRegion('ALL');
                setSelectedZone('ALL');
                setSelectedSchoolType('ALL');
                setSelectedCity('ALL');
              }}
              className="w-full text-xs h-9"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="max-w-7xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading campus records...</p>
          </div>
        ) : branches.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <School className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">No Campuses Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              No school campuses match your filter criteria. Create a new independent school or network campus to get started.
            </p>
            <Button size="sm" onClick={handleOpenCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Campus
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Campus / School</th>
                  <th className="py-3 px-3">Code & Affiliation</th>
                  <th className="py-3 px-3">Structure / Lineage</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Leadership & Contact</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {branches.map((branch) => {
                  const isIndependent = !branch.headOfficeId;
                  return (
                    <tr
                      key={branch.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Campus Name & Brand */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400 font-bold text-sm overflow-hidden">
                            {branch.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={branch.logoUrl} alt={branch.name} className="w-full h-full object-contain" />
                            ) : (
                              <School className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white truncate">
                                {branch.name}
                              </span>
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                                {branch.schoolType || 'Campus'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {branch.tagline || (branch.capacity ? `Capacity: ${branch.capacity.toLocaleString()} students` : 'Primary Academic Campus')}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Code & Affiliation */}
                      <td className="py-3.5 px-3">
                        <div className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                          {branch.code}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px] mt-0.5">
                          {branch.boardAffiliation || 'General Education'}
                        </div>
                      </td>

                      {/* Hierarchy Lineage */}
                      <td className="py-3.5 px-3">
                        {isIndependent ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/50 text-[11px] font-medium">
                            <School className="w-3.5 h-3.5 text-purple-500" />
                            Independent School
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50 text-[11px] font-medium">
                              <Building2 className="w-3.5 h-3.5 text-blue-500" />
                              {branch.headOffice?.name || 'Head Office'}
                            </div>
                            {(branch.region || branch.zone) && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                {branch.region && <span>Reg: {branch.region.name}</span>}
                                {branch.region && branch.zone && <span>•</span>}
                                {branch.zone && <span>Zone: {branch.zone.name}</span>}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{branch.city || 'Karachi'}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px] mt-0.5">
                          {branch.addressLine1}
                        </p>
                      </td>

                      {/* Leadership & Contact */}
                      <td className="py-3.5 px-3">
                        <div className="text-slate-800 dark:text-slate-200 font-medium truncate">
                          {branch.principalName || branch.adminContact || 'Campus Lead'}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {branch.phone && <span>{branch.phone}</span>}
                          {branch.email && <span className="truncate">• {branch.email}</span>}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            branch.status === 'ACTIVE'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                              : branch.status === 'INACTIVE'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              branch.status === 'ACTIVE'
                                ? 'bg-emerald-500'
                                : branch.status === 'INACTIVE'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          {branch.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="View Details"
                            onClick={() => setViewingBranch(branch)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title="Edit Campus Details"
                            onClick={() => handleOpenEditModal(branch)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            title={isIndependent ? 'Assign to Head Office' : 'Move in Hierarchy'}
                            onClick={() => handleOpenReparentModal(branch)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                          >
                            <Network className="w-4 h-4" />
                          </button>
                          <button
                            title="Audit Logs"
                            onClick={() => handleOpenAuditModal(branch)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            title={branch.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            onClick={() =>
                              setStatusActionBranch({
                                branch,
                                targetStatus: branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                              })
                            }
                            className={`p-1.5 rounded-lg transition-colors ${
                              branch.status === 'ACTIVE'
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 7-SECTION CREATE / EDIT FORM MODAL                                       */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={formMode === 'create' ? 'Add New Branch / School Campus' : `Edit Campus: ${editingBranch?.name || ''}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
          {/* SECTION 1: ORGANIZATION STRUCTURE */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                1
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Organization Structure</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Select whether this school operates as an independent institution or belongs under an organizational network.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Option A: Independent School */}
              <label
                className={`relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  formData.structureType === 'INDEPENDENT'
                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 ring-2 ring-purple-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="structureType"
                  value="INDEPENDENT"
                  checked={formData.structureType === 'INDEPENDENT'}
                  onChange={() =>
                    setFormData((prev) => ({
                      ...prev,
                      structureType: 'INDEPENDENT',
                      headOfficeId: '',
                      regionId: '',
                      zoneId: '',
                    }))
                  }
                  className="mt-1 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <School className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Independent / Single School
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Operates autonomously with zero dummy Head Office records. Can be upgraded into a network anytime.
                  </p>
                </div>
              </label>

              {/* Option B: Under Head Office Network */}
              <label
                className={`relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  formData.structureType === 'NETWORK'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="structureType"
                  value="NETWORK"
                  checked={formData.structureType === 'NETWORK'}
                  onChange={() => {
                    const defaultHO = stats?.availableHeadOffices?.find((h) => h.status === 'ACTIVE') || stats?.availableHeadOffices?.[0];
                    setFormData((prev) => ({
                      ...prev,
                      structureType: 'NETWORK',
                      headOfficeId: defaultHO ? defaultHO.id : '',
                    }));
                  }}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Under Head Office / Network
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Belongs to an educational network linked to a Parent Head Office, Region, and/or Zone.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* SECTION 2: PARENT & BASIC INFORMATION */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                2
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Parent & Basic Information</h3>
            </div>

            {/* Parent Hierarchy Dropdowns (Shown only if NETWORK mode) */}
            {formData.structureType === 'NETWORK' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-4 p-3.5 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Parent Head Office <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.headOfficeId}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        headOfficeId: e.target.value,
                        regionId: '',
                        zoneId: '',
                      }))
                    }
                    className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-slate-800 ${
                      formErrors.headOfficeId ? 'border-rose-500' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    <option value="">Select Parent Head Office...</option>
                    {stats?.availableHeadOffices?.map((ho) => (
                      <option key={ho.id} value={ho.id}>
                        {ho.name} ({ho.code})
                      </option>
                    ))}
                  </select>
                  {formErrors.headOfficeId && <p className="text-[11px] text-rose-500 mt-1">{formErrors.headOfficeId}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Parent Region <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={formData.regionId}
                    disabled={!formData.headOfficeId}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        regionId: e.target.value,
                        zoneId: '',
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 disabled:opacity-50"
                  >
                    <option value="">Direct Head Office (No Region)</option>
                    {formAvailableRegions.map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        {reg.name} ({reg.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Parent Zone / Area <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={formData.zoneId}
                    disabled={!formData.headOfficeId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, zoneId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 disabled:opacity-50"
                  >
                    <option value="">No Zone Assigned</option>
                    {formAvailableZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Basic Info Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Branch / School Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Greenwood High School (Main Campus)"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-slate-800 ${
                    formErrors.name ? 'border-rose-500' : 'border-slate-300 dark:border-slate-600'
                  }`}
                />
                {formErrors.name && <p className="text-[11px] text-rose-500 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Branch Code <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      const prefix = formData.city ? formData.city.slice(0, 3) : 'GEN';
                      try {
                        const codeRes = await fetch(`/api/admin/organization/branches/generate-code?city=${prefix}`);
                        const codeData = await codeRes.json();
                        if (codeData.success && codeData.data?.code) {
                          setFormData((prev) => ({
                            ...prev,
                            code: codeData.data.code,
                            loginUsername: prev.loginUsername || codeData.data.code.toLowerCase().replace(/-/g, '_'),
                          }));
                        }
                      } catch {
                        // Non-blocking
                      }
                    }}
                    className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-Gen
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. SCH-KHI-001"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase(),
                      loginUsername: prev.loginUsername || e.target.value.toLowerCase().replace(/-/g, '_'),
                    }))
                  }
                  className={`w-full px-3 py-2 text-xs font-mono rounded-lg border bg-white dark:bg-slate-800 ${
                    formErrors.code ? 'border-rose-500' : 'border-slate-300 dark:border-slate-600'
                  }`}
                />
                {formErrors.code && <p className="text-[11px] text-rose-500 mt-1">{formErrors.code}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Campus Classification / Type
                </label>
                <select
                  value={formData.schoolType}
                  onChange={(e) => setFormData((prev) => ({ ...prev, schoolType: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                >
                  {CAMPUS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="Other">Other (Custom Type)...</option>
                </select>
                {formData.schoolType === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter custom campus classification"
                    value={formData.customSchoolType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customSchoolType: e.target.value }))}
                    className="w-full mt-2 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Short Tag / Acronym
                </label>
                <input
                  type="text"
                  placeholder="e.g. GHS-MAIN"
                  value={formData.shortName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, shortName: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Govt / Registration No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. REG-EDU-2015/0984"
                  value={formData.registrationNo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, registrationNo: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Established / Opening Date
                </label>
                <input
                  type="date"
                  value={formData.openingDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, openingDate: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: LOCATION & ADDRESS */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Location & Address</h3>
              </div>

              {/* Mode Toggle: Master vs Manual */}
              <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setLocationMode('master')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    locationMode === 'master'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Reference Master
                </button>
                <button
                  type="button"
                  onClick={() => setLocationMode('manual')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    locationMode === 'manual'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Manual / Free Text
                </button>
              </div>
            </div>

            {locationMode === 'master' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.countryId}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  >
                    <option value="">Select Country...</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.isoCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    State / Province
                  </label>
                  <select
                    value={formData.stateId}
                    disabled={!formData.countryId}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 disabled:opacity-50"
                  >
                    <option value="">Select State / Province...</option>
                    {states.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.cityId}
                    disabled={!formData.stateId}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-slate-800 disabled:opacity-50 ${
                      formErrors.cityId ? 'border-rose-500' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    <option value="">Select City...</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.cityId && <p className="text-[11px] text-rose-500 mt-1">{formErrors.cityId}</p>}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                    className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-slate-800 ${
                      formErrors.city ? 'border-rose-500' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                  {formErrors.city && <p className="text-[11px] text-rose-500 mt-1">{formErrors.city}</p>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Address Line 1 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Plot / Street / Building details"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-slate-800 ${
                    formErrors.addressLine1 ? 'border-rose-500' : 'border-slate-300 dark:border-slate-600'
                  }`}
                />
                {formErrors.addressLine1 && <p className="text-[11px] text-rose-500 mt-1">{formErrors.addressLine1}</p>}
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Address Line 2 <span className="text-slate-400 font-normal">(Optional Area / Landmark)</span>
                </label>
                <input
                  type="text"
                  placeholder="Sector, Block, Landmark or Complex name"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData((prev) => ({ ...prev, addressLine2: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: SCHOOL / ACADEMIC INFORMATION */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                4
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">School / Academic Information</h3>
            </div>

            {/* Academic Programs Check Pills */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Academic Programs & Curriculum Levels Offered
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ACADEMIC_PROGRAMS.map((program) => {
                  const isSelected = formData.academicPrograms?.includes(program);
                  return (
                    <button
                      key={program}
                      type="button"
                      onClick={() => toggleAcademicProgram(program)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                      {program}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 mb-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Shift Model
                </label>
                <select
                  value={formData.shiftModel}
                  onChange={(e) => setFormData((prev) => ({ ...prev, shiftModel: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                >
                  <option value="MORNING">Morning Shift</option>
                  <option value="AFTERNOON">Afternoon Shift</option>
                  <option value="EVENING">Evening Shift</option>
                  <option value="MULTIPLE_SHIFTS">Dual / Multiple Shifts</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gender Model
                </label>
                <select
                  value={formData.genderModel}
                  onChange={(e) => setFormData((prev) => ({ ...prev, genderModel: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                >
                  <option value="CO_ED">Co-Education</option>
                  <option value="BOYS_ONLY">Boys Only</option>
                  <option value="GIRLS_ONLY">Girls Only</option>
                  <option value="SEPARATE_SECTIONS">Separate Sections</option>
                  <option value="SEPARATE_WINGS">Separate Campus Wings</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Student Capacity
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1200"
                  value={formData.capacity}
                  onChange={(e) => setFormData((prev) => ({ ...prev, capacity: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fee Receipt Prefix
                </label>
                <input
                  type="text"
                  placeholder="REC"
                  value={formData.receiptPrefix}
                  onChange={(e) => setFormData((prev) => ({ ...prev, receiptPrefix: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 text-xs uppercase rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="mb-3.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Board / Affiliation Authority
              </label>
              <select
                value={formData.boardAffiliation}
                onChange={(e) => setFormData((prev) => ({ ...prev, boardAffiliation: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                {COMMON_BOARD_AFFILIATIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                <option value="Other">Other Board (Custom)...</option>
              </select>
              {formData.boardAffiliation === 'Other' && (
                <input
                  type="text"
                  placeholder="Enter custom board or examination authority"
                  value={formData.customBoardAffiliation}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customBoardAffiliation: e.target.value }))}
                  className="w-full mt-2 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Academic Scope & Specialization Notes
              </label>
              <textarea
                rows={2}
                placeholder="Details of offered streams, facilities (labs, libraries, robotic centers)..."
                value={formData.academicScopeNotes}
                onChange={(e) => setFormData((prev) => ({ ...prev, academicScopeNotes: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          {/* SECTION 5: CONTACT & SCHOOL IDENTITY */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                5
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Contact & School Identity</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 mb-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Principal / Head of Campus
                </label>
                <input
                  type="text"
                  placeholder="e.g. Prof. S. M. Farooqui"
                  value={formData.principalName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, principalName: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Principal Designation / Title
                </label>
                <input
                  type="text"
                  placeholder="Campus Principal"
                  value={formData.principalDesignation}
                  onChange={(e) => setFormData((prev) => ({ ...prev, principalDesignation: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Administrator / Focal Person
                </label>
                <input
                  type="text"
                  placeholder="e.g. Zubair Qureshi"
                  value={formData.adminContact}
                  onChange={(e) => setFormData((prev) => ({ ...prev, adminContact: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Admin Designation / Title
                </label>
                <input
                  type="text"
                  placeholder="Campus Administrator"
                  value={formData.adminContactDesignation}
                  onChange={(e) => setFormData((prev) => ({ ...prev, adminContactDesignation: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 mb-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="+92 21 34980001"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-slate-800 ${
                    formErrors.phone ? 'border-rose-500' : 'border-slate-300 dark:border-slate-600'
                  }`}
                />
                {formErrors.phone && <p className="text-[11px] text-rose-500 mt-1">{formErrors.phone}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alternate Phone / Mobile
                </label>
                <input
                  type="text"
                  placeholder="+92 300 1234567"
                  value={formData.altPhone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, altPhone: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="campus.main@greenwood.edu.pk"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-slate-800 ${
                    formErrors.email ? 'border-rose-500' : 'border-slate-300 dark:border-slate-600'
                  }`}
                />
                {formErrors.email && <p className="text-[11px] text-rose-500 mt-1">{formErrors.email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Website / Campus Portal
                </label>
                <input
                  type="text"
                  placeholder="https://greenwood.edu.pk/campuses/main"
                  value={formData.website}
                  onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  School Motto / Tagline
                </label>
                <input
                  type="text"
                  placeholder="Inspiring Excellence, Character & Knowledge"
                  value={formData.tagline}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tagline: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          {/* SECTION 6: DOCUMENTS & BRANDING */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                6
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Documents & Branding</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3.5">
              Upload school logo, authorized head signature, and official seal for automated report cards and fee vouchers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FileUploadBox
                label="School Logo"
                assetType="logo"
                currentUrl={formData.logoUrl}
                icon={ImageIcon}
                onUploadSuccess={(url) => setFormData((prev) => ({ ...prev, logoUrl: url }))}
                onRemove={() => setFormData((prev) => ({ ...prev, logoUrl: null }))}
              />

              <FileUploadBox
                label="Principal Signature"
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

          {/* SECTION 7: LOGIN ACCESS */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                7
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Campus Administrator Login Access</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Login ID / Username <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.loginUsername}
                    onChange={(e) => setFormData((prev) => ({ ...prev, loginUsername: e.target.value.toLowerCase() }))}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {formMode === 'create' ? 'Account Password' : 'New Password (Optional)'}
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={formMode === 'edit' ? 'Leave blank to keep current' : 'Min 8 characters'}
                    value={formData.loginPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, loginPassword: e.target.value }))}
                    className={`w-full pl-9 pr-9 py-2 text-xs rounded-lg border bg-white dark:bg-slate-800 ${
                      formErrors.loginPassword ? 'border-rose-500' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {formErrors.loginPassword && <p className="text-[11px] text-rose-500 mt-1">{formErrors.loginPassword}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repeat password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border bg-white dark:bg-slate-800 ${
                      formErrors.confirmPassword ? 'border-rose-500' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                </div>
                {formErrors.confirmPassword && <p className="text-[11px] text-rose-500 mt-1">{formErrors.confirmPassword}</p>}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                </span>
              ) : formMode === 'create' ? (
                'Create Campus'
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* REPARENT / EXPAND HIERARCHY MODAL                                        */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!reparentingBranch}
        onClose={() => setReparentingBranch(null)}
        title="Assign or Re-assign School in Organization Hierarchy"
        maxWidth="lg"
      >
        {reparentingBranch && (
          <form onSubmit={handleSubmitReparent} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-300 mb-1">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Data Preservation & Hierarchy Integrity
              </div>
              <p className="text-[11px] text-purple-800 dark:text-purple-400">
                Updating the organization hierarchy will update the campus lineage in-place without changing its permanent ID
                or disrupting student enrollments, fee structures, exam records, or operational audit history.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Organization Structure
              </label>
              <select
                value={reparentForm.headOfficeId}
                onChange={(e) =>
                  setReparentForm((prev) => ({
                    ...prev,
                    headOfficeId: e.target.value,
                    regionId: '',
                    zoneId: '',
                  }))
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                <option value="">Independent / Single School (No Head Office)</option>
                {stats?.availableHeadOffices?.map((ho) => (
                  <option key={ho.id} value={ho.id}>
                    Under Head Office: {ho.name} ({ho.code})
                  </option>
                ))}
              </select>
            </div>

            {reparentForm.headOfficeId && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assign Parent Region <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={reparentForm.regionId}
                    onChange={(e) =>
                      setReparentForm((prev) => ({
                        ...prev,
                        regionId: e.target.value,
                        zoneId: '',
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  >
                    <option value="">Direct Head Office (No Region)</option>
                    {reparentAvailableRegions.map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        {reg.name} ({reg.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assign Parent Zone <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={reparentForm.zoneId}
                    onChange={(e) => setReparentForm((prev) => ({ ...prev, zoneId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  >
                    <option value="">No Zone Assigned</option>
                    {reparentAvailableZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.code})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Organizational Change <span className="text-slate-400 font-normal">(For Audit Trail)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. School integrated into Metropolitan Zone 1 as part of network expansion."
                value={reparentForm.reason}
                onChange={(e) => setReparentForm((prev) => ({ ...prev, reason: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setReparentingBranch(null)} disabled={isReparenting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isReparenting} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isReparenting ? 'Updating Hierarchy...' : 'Confirm Hierarchy Update'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* VIEW DETAILS MODAL                                                       */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!viewingBranch}
        onClose={() => setViewingBranch(null)}
        title={viewingBranch ? `Campus Details: ${viewingBranch.name}` : 'Campus Details'}
        maxWidth="xl"
      >
        {viewingBranch && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-xs">
            {/* Top Identity Card */}
            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="w-14 h-14 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-indigo-600 overflow-hidden flex-shrink-0">
                {viewingBranch.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={viewingBranch.logoUrl} alt={viewingBranch.name} className="w-full h-full object-contain" />
                ) : (
                  <School className="w-7 h-7" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {viewingBranch.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {viewingBranch.schoolType || 'Main Campus'}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-500 mt-0.5">Code: {viewingBranch.code}</p>
                {viewingBranch.tagline && (
                  <p className="text-xs italic text-slate-600 dark:text-slate-300 mt-1">&ldquo;{viewingBranch.tagline}&rdquo;</p>
                )}
              </div>
            </div>

            {/* Hierarchy Path Badge */}
            <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase text-indigo-600 dark:text-indigo-400">
                  Hierarchy Placement
                </span>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                  {viewingBranch.headOffice
                    ? `${viewingBranch.headOffice.name}${viewingBranch.region ? ` > ${viewingBranch.region.name}` : ''}${viewingBranch.zone ? ` > ${viewingBranch.zone.name}` : ''}`
                    : 'Independent / Single School (Autonomous)'}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  viewingBranch.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {viewingBranch.status}
              </span>
            </div>

            {/* Grid of Key Properties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Academic Model & Capacity</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewingBranch.boardAffiliation || 'General Curriculum'}
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  Capacity: {viewingBranch.capacity ? viewingBranch.capacity.toLocaleString() : 'Not specified'} students
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  Shift: {viewingBranch.shiftModel} • Gender: {viewingBranch.genderModel}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Address & Geolocation</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewingBranch.city}, {viewingBranch.state ? `${viewingBranch.state}, ` : ''}{viewingBranch.country}
                </p>
                <p className="text-slate-600 dark:text-slate-400">{viewingBranch.addressLine1}</p>
                {viewingBranch.addressLine2 && <p className="text-slate-500">{viewingBranch.addressLine2}</p>}
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Leadership & Staff</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Principal: {viewingBranch.principalName || 'Not designated'}
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  Admin: {viewingBranch.adminContact || 'Not designated'}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Communication & Credentials</span>
                <p className="text-slate-600 dark:text-slate-400 font-mono">Phone: {viewingBranch.phone || 'N/A'}</p>
                <p className="text-slate-600 dark:text-slate-400">Email: {viewingBranch.email || 'N/A'}</p>
                <p className="text-slate-600 dark:text-slate-400 font-mono">
                  Login ID: {viewingBranch.loginUsername || viewingBranch.code.toLowerCase().replace(/-/g, '_')}
                </p>
              </div>
            </div>

            {/* Document Assets Preview */}
            {(viewingBranch.signatureUrl || viewingBranch.stampUrl) && (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-2">
                  Branding & Digital Authorization Assets
                </span>
                <div className="flex items-center gap-4">
                  {viewingBranch.signatureUrl && (
                    <div className="text-center">
                      <div className="w-24 h-14 rounded-lg border bg-white dark:bg-slate-800 flex items-center justify-center p-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={viewingBranch.signatureUrl} alt="Signature" className="max-h-full object-contain" />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">Signature</span>
                    </div>
                  )}
                  {viewingBranch.stampUrl && (
                    <div className="text-center">
                      <div className="w-24 h-14 rounded-lg border bg-white dark:bg-slate-800 flex items-center justify-center p-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={viewingBranch.stampUrl} alt="Official Stamp" className="max-h-full object-contain" />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">Official Stamp</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* AUDIT LOGS MODAL                                                         */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!auditBranch}
        onClose={() => setAuditBranch(null)}
        title={auditBranch ? `Audit History: ${auditBranch.name}` : 'Audit Logs'}
        maxWidth="xl"
      >
        <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-1 text-xs">
          {isLoadingAudit ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
              <p className="text-slate-500">Loading audit history...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No audit logs recorded for this campus.</div>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-[11px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 font-medium">{log.changeSummary || 'Details updated.'}</p>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* STATUS TOGGLE CONFIRMATION MODAL                                         */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!statusActionBranch}
        onClose={() => setStatusActionBranch(null)}
        title="Confirm Status Change"
        maxWidth="md"
      >
        {statusActionBranch && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to change the status of campus{' '}
              <strong className="text-slate-900 dark:text-white">{statusActionBranch.branch.name}</strong> to{' '}
              <strong className="text-indigo-600 dark:text-indigo-400">{statusActionBranch.targetStatus}</strong>?
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for change <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Reason for administrative audit trail..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setStatusActionBranch(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleConfirmStatusToggle} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
