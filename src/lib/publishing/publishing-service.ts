import { PublishingStatus, TargetAudience } from '../types';
import { ValidationError } from '../errors/app-error';

export interface PublishingTransitionInput {
  currentStatus: PublishingStatus;
  newStatus: PublishingStatus;
  targetAudience: TargetAudience;
  userId: string;
  reasonOrNotes?: string;
}

export const VALID_PUBLISHING_TRANSITIONS: Record<PublishingStatus, PublishingStatus[]> = {
  DRAFT: ['UNDER_REVIEW', 'ARCHIVED'],
  UNDER_REVIEW: ['DRAFT', 'APPROVED', 'ARCHIVED'],
  APPROVED: ['UNDER_REVIEW', 'PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['UNPUBLISHED', 'ARCHIVED'],
  UNPUBLISHED: ['UNDER_REVIEW', 'PUBLISHED', 'ARCHIVED'],
  ARCHIVED: [], // Terminal read-only state
};

export class PublishingEngine {
  /**
   * Validates if a publishing state transition is allowed.
   */
  public static validateTransition(current: PublishingStatus, target: PublishingStatus): void {
    const allowed = VALID_PUBLISHING_TRANSITIONS[current] || [];
    if (!allowed.includes(target)) {
      throw new ValidationError(
        `Invalid publishing transition: Cannot transition from [${current}] to [${target}]. Allowed: [${allowed.join(', ')}]`
      );
    }
  }

  /**
   * Evaluates if a record is visible on external portal for a specific user persona.
   */
  public static isVisibleToPortal(
    status: PublishingStatus,
    targetAudience: TargetAudience,
    userType: 'ADMIN' | 'TEACHER' | 'EMPLOYEE' | 'STUDENT' | 'PARENT'
  ): boolean {
    // School Admin can always see drafts/under-review records
    if (userType === 'ADMIN') return true;

    // External portals only see PUBLISHED status
    if (status !== 'PUBLISHED') return false;

    // Check audience scope
    if (targetAudience === 'ALL') return true;
    if (targetAudience === userType) return true;

    return false;
  }

  /**
   * Computes state change metadata for workflow record update.
   */
  public static computeStateUpdate(input: PublishingTransitionInput) {
    this.validateTransition(input.currentStatus, input.newStatus);

    const now = new Date();
    const update: {
      currentStatus: PublishingStatus;
      reviewedByUserId?: string;
      approvedByUserId?: string;
      publishedByUserId?: string;
      publishedAt?: Date | null;
      archivedAt?: Date | null;
      reasonOrNotes?: string;
    } = {
      currentStatus: input.newStatus,
      reasonOrNotes: input.reasonOrNotes,
    };

    if (input.newStatus === 'UNDER_REVIEW') {
      update.reviewedByUserId = input.userId;
    } else if (input.newStatus === 'APPROVED') {
      update.approvedByUserId = input.userId;
    } else if (input.newStatus === 'PUBLISHED') {
      update.publishedByUserId = input.userId;
      update.publishedAt = now;
    } else if (input.newStatus === 'UNPUBLISHED') {
      update.publishedAt = null;
    } else if (input.newStatus === 'ARCHIVED') {
      update.archivedAt = now;
    }

    return update;
  }
}
