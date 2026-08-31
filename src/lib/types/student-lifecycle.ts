export type StudentLifecycleStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'WITHDRAWN'
  | 'TRANSFERRED'
  | 'GRADUATED'
  | 'SUSPENDED'
  | 'LEFT';

export interface StatusMetadata {
  key: StudentLifecycleStatus;
  label: string;
  badgeClass: string;
  description: string;
  isTerminal?: boolean;
  isMajorAction?: boolean;
  requiresSLC?: boolean;
}

export const STUDENT_LIFECYCLE_STATUSES: Record<StudentLifecycleStatus, StatusMetadata> = {
  ACTIVE: {
    key: 'ACTIVE',
    label: 'Active Student',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Enrolled in good standing, attending classes and regular activities.',
  },
  INACTIVE: {
    key: 'INACTIVE',
    label: 'Inactive / On Leave',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Temporary absence or approved long medical/travel leave.',
    isMajorAction: false,
  },
  WITHDRAWN: {
    key: 'WITHDRAWN',
    label: 'Withdrawn',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Officially withdrawn from school upon parent/guardian request.',
    isTerminal: true,
    isMajorAction: true,
    requiresSLC: true,
  },
  TRANSFERRED: {
    key: 'TRANSFERRED',
    label: 'Transferred Out',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Transferred to another school, board, or campus branch.',
    isTerminal: true,
    isMajorAction: true,
    requiresSLC: true,
  },
  GRADUATED: {
    key: 'GRADUATED',
    label: 'Graduated / Completed',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Successfully completed the terminal academic grade/program.',
    isTerminal: true,
    isMajorAction: true,
    requiresSLC: true,
  },
  SUSPENDED: {
    key: 'SUSPENDED',
    label: 'Suspended',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    description: 'Temporarily suspended due to disciplinary or administrative reasons.',
    isMajorAction: true,
  },
  LEFT: {
    key: 'LEFT',
    label: 'Left School',
    badgeClass: 'bg-slate-200 text-slate-700 border-slate-300',
    description: 'Struck off rolls due to prolonged absence or dropout.',
    isTerminal: true,
    isMajorAction: true,
  },
};

export const LIFECYCLE_PRESET_REASONS: Record<StudentLifecycleStatus, string[]> = {
  ACTIVE: [
    'Re-admitted after Withdrawal',
    'Returned from Approved Long Leave',
    'Disciplinary Suspension Lifted',
    'Fee Clearance & Reinstatement',
    'Administrative Status Correction',
  ],
  INACTIVE: [
    'Medical Emergency / Extended Illness',
    'Approved Long Family Travel / Hajj',
    'Temporary Leave of Absence',
    'Financial Hardship Extension',
  ],
  WITHDRAWN: [
    'Family Relocation / City Change',
    'Financial Constraints',
    'Guardian Preference / Distance',
    'Admission to Another Institution',
    'Personal / Family Reasons',
  ],
  TRANSFERRED: [
    'Transfer to Sister Campus Branch',
    'Parent Job Relocation',
    'Change of Education Board / Curriculum',
    'Migration Out of Country',
  ],
  GRADUATED: [
    'Completed Terminal Grade (Matric / O-Levels)',
    'Completed Final Primary Tier',
    'Successful Academic Program Completion',
  ],
  SUSPENDED: [
    'Disciplinary Infraction',
    'Prolonged Unexcused Absence',
    'Pending Administrative Review',
    'Parent Consultation Required',
  ],
  LEFT: [
    'Struck off Roll (Unexcused Absence > 30 Days)',
    'Dropped Out',
    'Unreachable Parent / Guardian',
  ],
};
