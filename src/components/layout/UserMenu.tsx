'use client';

import React, { useState } from 'react';
import { User, LogOut, Shield, School, ChevronDown } from 'lucide-react';
import { AuthenticatedUser, TenantContext } from '@/lib/types';

interface UserMenuProps {
  user: AuthenticatedUser;
  tenant: TenantContext;
  onLogout?: () => void;
}

export function UserMenu({ user, tenant, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
          {user.username.slice(0, 2)}
        </div>
        <div className="hidden sm:flex flex-col text-start">
          <span className="text-xs font-semibold text-slate-800 leading-tight">{user.username}</span>
          <span className="text-[10px] text-slate-500 font-medium">{user.userType}</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute end-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
          {/* User Info Header */}
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">{user.username}</p>
            {user.email && <p className="text-xs text-slate-500 truncate">{user.email}</p>}
            <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
              <School className="w-3.5 h-3.5" />
              <span className="font-medium truncate">{tenant.schoolName} ({tenant.tenantCode})</span>
            </div>
          </div>

          {/* Role & Permissions Badge */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 text-xs text-slate-600">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span>Role: <strong className="text-slate-800">{user.roles.join(', ') || user.userType}</strong></span>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <a
              href="/profile"
              className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <User className="w-4 h-4 text-slate-400" />
              <span>Profile Settings</span>
            </a>
          </div>

          {/* Logout Action */}
          <div className="border-t border-slate-100 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onLogout) onLogout();
                else window.location.href = '/login';
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-start"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
