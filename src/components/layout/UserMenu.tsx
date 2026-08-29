'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Shield, School, Settings } from 'lucide-react';
import { AuthenticatedUser, TenantContext } from '@/lib/types';

interface UserMenuProps {
  user: AuthenticatedUser;
  tenant: TenantContext;
  onLogout?: () => void;
}

export function UserMenu({ user, tenant, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user.username
    ? user.username
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <div className="relative" ref={menuRef}>
      {/* Clean Avatar Button (No external text block) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User Profile Menu"
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-semibold text-xs shadow-xs hover:ring-2 hover:ring-blue-400/50 transition-all cursor-pointer"
      >
        {initials}
      </button>

      {/* User Profile Dropdown */}
      {isOpen && (
        <div className="absolute end-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">{user.username}</p>
            {user.email && <p className="text-[11px] text-slate-500 truncate mt-0.5">{user.email}</p>}
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
              <School className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span className="font-medium truncate">{tenant.schoolName}</span>
            </div>
          </div>

          {/* Role Badge */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 text-xs text-slate-600">
            <Shield className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-[11px]">Role: <strong className="text-slate-800 font-semibold">{user.roles.join(', ') || user.userType}</strong></span>
          </div>

          {/* Profile Actions */}
          <div className="py-1">
            <a
              href="#profile-settings"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
              }}
              className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
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
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-start cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
