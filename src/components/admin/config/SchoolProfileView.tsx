'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Save, RefreshCw, Globe, MapPin, Phone, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';

interface SchoolProfileData {
  id: string;
  tenantId: string;
  nameEn: string;
  nameUr: string;
  code: string;
  registrationNo: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  addressEn: string | null;
  addressUr: string | null;
  currencySymbol: string;
  currencyCode: string;
  timezone: string;
  dateFormat: string;
  isActive: boolean;
}

export function SchoolProfileView() {
  const [data, setData] = useState<SchoolProfileData | null>(null);
  const [formData, setFormData] = useState<Partial<SchoolProfileData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { success, error } = useToast();

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/config/profile');
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setFormData(json.data);
      } else {
        error('Failed to load profile', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not reach server.');
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (field: keyof SchoolProfileData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.nameEn?.trim()) errs.nameEn = 'English institution name is required';
    if (!formData.nameUr?.trim()) errs.nameUr = 'Urdu institution name is required';
    if (!formData.code?.trim()) errs.code = 'School code is required';
    if (!formData.currencySymbol?.trim()) errs.currencySymbol = 'Currency symbol is required';
    if (!formData.currencyCode?.trim()) errs.currencyCode = 'Currency code is required';
    if (formData.contactEmail && !formData.contactEmail.includes('@')) {
      errs.contactEmail = 'Invalid email address';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/config/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameEn: formData.nameEn,
          nameUr: formData.nameUr,
          code: formData.code,
          registrationNo: formData.registrationNo || null,
          logoUrl: formData.logoUrl || null,
          contactEmail: formData.contactEmail || null,
          contactPhone: formData.contactPhone || null,
          addressEn: formData.addressEn || null,
          addressUr: formData.addressUr || null,
          currencySymbol: formData.currencySymbol,
          currencyCode: formData.currencyCode,
          timezone: formData.timezone,
          dateFormat: formData.dateFormat,
          isActive: formData.isActive !== undefined ? formData.isActive : true,
        }),
      });
      const json = await res.json();

      if (json.success) {
        setData(json.data);
        setFormData(json.data);
        success('Profile Saved', 'School Profile and institutional parameters updated successfully.');
      } else {
        error('Update Failed', json.error?.message || 'Could not save profile.');
      }
    } catch {
      error('Network Error', 'Failed to communicate with server.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs animate-pulse space-y-6">
        <div className="h-6 w-56 bg-slate-200 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-10 bg-slate-100 rounded-xl"></div>
          <div className="h-10 bg-slate-100 rounded-xl"></div>
          <div className="h-10 bg-slate-100 rounded-xl"></div>
          <div className="h-10 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Institutional Identity & School Profile</h1>
              {data && <StatusBadge status={formData.isActive !== undefined ? formData.isActive : data.isActive} />}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage bilingual school name, official registration, contact information, currency, and date localization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setFormData(data || {})}
            disabled={isSaving}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Reset Form
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={handleSubmit}
            isLoading={isSaving}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Official Institutional Names & Registration */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-400" />
              Institutional Identity (Bilingual Support)
            </h2>
            <span className="text-2xs text-slate-400 font-medium">PostgreSQL Tenant-Scoped</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="School Name (English)"
              value={formData.nameEn || ''}
              onChange={(e) => handleChange('nameEn', e.target.value)}
              error={errors.nameEn}
              placeholder="e.g. Greenwood International School"
            />

            <Input
              label="School Name (Urdu / اردو)"
              value={formData.nameUr || ''}
              onChange={(e) => handleChange('nameUr', e.target.value)}
              error={errors.nameUr}
              placeholder="مثال: گرین ووڈ انٹرنیشنل اسکول"
              dir="rtl"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="School Code"
              value={formData.code || ''}
              onChange={(e) => handleChange('code', e.target.value)}
              error={errors.code}
              placeholder="e.g. SCH-001"
            />

            <Input
              label="Registration / Affiliation No."
              value={formData.registrationNo || ''}
              onChange={(e) => handleChange('registrationNo', e.target.value)}
              optional
              placeholder="e.g. REG-2026-998"
            />

            <Input
              label="Logo Image URL"
              value={formData.logoUrl || ''}
              onChange={(e) => handleChange('logoUrl', e.target.value)}
              optional
              placeholder="https://..."
              rightIcon={
                formData.logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={formData.logoUrl}
                    alt="Logo Preview"
                    className="w-5 h-5 rounded object-cover"
                    onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                  />
                ) : (
                  <ImageIcon className="w-4 h-4 text-slate-300" />
                )
              }
            />
          </div>
        </div>

        {/* Section 2: Contact Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              Administrative Contact & Campus Location
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Official Contact Email"
              type="email"
              value={formData.contactEmail || ''}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
              error={errors.contactEmail}
              placeholder="admin@school.edu.pk"
            />

            <Input
              label="Official Contact Phone"
              value={formData.contactPhone || ''}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
              placeholder="+92-42-111-222-333"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Campus Address (English)"
              value={formData.addressEn || ''}
              onChange={(e) => handleChange('addressEn', e.target.value)}
              placeholder="Plot 42, Main Boulevard, Sector B"
            />

            <Input
              label="Campus Address (Urdu / اردو)"
              value={formData.addressUr || ''}
              onChange={(e) => handleChange('addressUr', e.target.value)}
              placeholder="پلاٹ 42، مین بلیوارڈ، سیکٹر بی"
              dir="rtl"
            />
          </div>
        </div>

        {/* Section 3: Localization & Currency Configuration */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              Regional Localization & Currency Parameters
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Select
              label="Currency Code"
              value={formData.currencyCode || 'PKR'}
              onChange={(e) => handleChange('currencyCode', e.target.value)}
              options={[
                { value: 'PKR', label: 'PKR (Pakistani Rupee)' },
                { value: 'USD', label: 'USD (US Dollar)' },
                { value: 'GBP', label: 'GBP (British Pound)' },
                { value: 'AED', label: 'AED (UAE Dirham)' },
                { value: 'SAR', label: 'SAR (Saudi Riyal)' },
              ]}
            />

            <Input
              label="Currency Symbol"
              value={formData.currencySymbol || 'Rs.'}
              onChange={(e) => handleChange('currencySymbol', e.target.value)}
              error={errors.currencySymbol}
              placeholder="Rs."
            />

            <Select
              label="Timezone"
              value={formData.timezone || 'Asia/Karachi'}
              onChange={(e) => handleChange('timezone', e.target.value)}
              options={[
                { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT +05:00)' },
                { value: 'Asia/Dubai', label: 'Asia/Dubai (GST +04:00)' },
                { value: 'Asia/Riyadh', label: 'Asia/Riyadh (AST +03:00)' },
                { value: 'Asia/London', label: 'Europe/London (GMT/BST)' },
                { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
              ]}
            />

            <Select
              label="Date Display Format"
              value={formData.dateFormat || 'DD/MM/YYYY'}
              onChange={(e) => handleChange('dateFormat', e.target.value)}
              options={[
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2026)' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-12-31)' },
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2026)' },
              ]}
            />
          </div>

          <div className="pt-2 flex items-center">
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive !== undefined ? formData.isActive : true}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span>Institution Active Status</span>
            </label>
          </div>
        </div>

        {/* Action Button Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-2xs text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Audit log recording enabled for profile changes</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setFormData(data || {})}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save School Profile
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
