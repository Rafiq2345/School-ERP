import { describe, it, expect } from 'vitest';
import { PublishingEngine } from '../src/lib/publishing/publishing-service';
import { ValidationError } from '../src/lib/errors/app-error';

describe('Central Publishing Engine Foundation', () => {
  it('should validate allowed publishing state transitions', () => {
    // Valid transitions
    expect(() => PublishingEngine.validateTransition('DRAFT', 'UNDER_REVIEW')).not.toThrow();
    expect(() => PublishingEngine.validateTransition('UNDER_REVIEW', 'APPROVED')).not.toThrow();
    expect(() => PublishingEngine.validateTransition('APPROVED', 'PUBLISHED')).not.toThrow();
    expect(() => PublishingEngine.validateTransition('PUBLISHED', 'UNPUBLISHED')).not.toThrow();
    expect(() => PublishingEngine.validateTransition('UNPUBLISHED', 'UNDER_REVIEW')).not.toThrow();
    expect(() => PublishingEngine.validateTransition('PUBLISHED', 'ARCHIVED')).not.toThrow();

    // Invalid transitions
    expect(() => PublishingEngine.validateTransition('DRAFT', 'PUBLISHED')).toThrow(ValidationError);
    expect(() => PublishingEngine.validateTransition('ARCHIVED', 'DRAFT')).toThrow(ValidationError);
  });

  it('should compute appropriate timestamps and user audit attributes upon transition', () => {
    const updatePublished = PublishingEngine.computeStateUpdate({
      currentStatus: 'APPROVED',
      newStatus: 'PUBLISHED',
      targetAudience: 'STUDENT',
      userId: 'usr-admin',
      reasonOrNotes: 'Published for 1st Term',
    });

    expect(updatePublished.currentStatus).toBe('PUBLISHED');
    expect(updatePublished.publishedByUserId).toBe('usr-admin');
    expect(updatePublished.publishedAt).toBeInstanceOf(Date);
    expect(updatePublished.reasonOrNotes).toBe('Published for 1st Term');

    const updateUnpublished = PublishingEngine.computeStateUpdate({
      currentStatus: 'PUBLISHED',
      newStatus: 'UNPUBLISHED',
      targetAudience: 'STUDENT',
      userId: 'usr-admin',
      reasonOrNotes: 'Correction needed in marks',
    });

    expect(updateUnpublished.currentStatus).toBe('UNPUBLISHED');
    expect(updateUnpublished.publishedAt).toBeNull();
  });

  it('should gate portal visibility strictly according to published status and audience', () => {
    // Draft / Under-review are invisible to students and parents
    expect(PublishingEngine.isVisibleToPortal('DRAFT', 'ALL', 'STUDENT')).toBe(false);
    expect(PublishingEngine.isVisibleToPortal('UNDER_REVIEW', 'ALL', 'PARENT')).toBe(false);
    expect(PublishingEngine.isVisibleToPortal('APPROVED', 'ALL', 'TEACHER')).toBe(false);

    // Admin can always see drafts
    expect(PublishingEngine.isVisibleToPortal('DRAFT', 'ALL', 'ADMIN')).toBe(true);

    // Published + Audience matching
    expect(PublishingEngine.isVisibleToPortal('PUBLISHED', 'ALL', 'STUDENT')).toBe(true);
    expect(PublishingEngine.isVisibleToPortal('PUBLISHED', 'STUDENT', 'STUDENT')).toBe(true);
    expect(PublishingEngine.isVisibleToPortal('PUBLISHED', 'TEACHER', 'STUDENT')).toBe(false);
    expect(PublishingEngine.isVisibleToPortal('PUBLISHED', 'PARENT', 'PARENT')).toBe(true);
  });
});
