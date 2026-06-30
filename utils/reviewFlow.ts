/** Pure business-logic helpers for the reviews + bookings flow (testable without DB). */

export const REVIEW_STATUS = {
  PENDING_OWNER: 'pending_owner',
  COMPROMISE_SENT: 'compromise_sent',
  COUNTER_SENT: 'counter_sent',
  PUBLISHED: 'published',
  WITHDRAWN: 'withdrawn',
} as const;

export type ReviewStatus = typeof REVIEW_STATUS[keyof typeof REVIEW_STATUS];
export type GuestResponseAction = 'accept' | 'reject' | 'counter';

const FIVE_YEARS_MS = 5 * 365.25 * 24 * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export interface BookingLike {
  unitId: string;
  userId?: string | null;
  checkOut: string;
  status: string;
}

export interface ReviewLike {
  status: ReviewStatus;
  isPublished: boolean;
  ownerResponseDeadline?: string | Date | null;
  compromiseDeadline?: string | Date | null;
}

export function isGuestRole(role: string): boolean {
  return role === 'client' || role === 'customer';
}

export function isOwnerRole(role: string): boolean {
  return ['zimmer_owner', 'complex_owner', 'manager', 'admin'].includes(role);
}

export function isRegisteredGuestRole(role: string): boolean {
  return isGuestRole(role);
}

/** Booking qualifies for review if linked to user, not cancelled, checkout in [5y ago, today]. */
export function isBookingEligibleForReview(
  booking: BookingLike,
  guestUserId: string,
  today: Date = new Date()
): boolean {
  if (booking.status === 'cancelled') return false;
  if (booking.userId?.toString() !== guestUserId.toString()) return false;

  const fiveYearsAgo = new Date(today.getTime() - FIVE_YEARS_MS).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  return booking.checkOut >= fiveYearsAgo && booking.checkOut <= todayStr;
}

export function getEligibleUnitIdsFromBookings(
  bookings: BookingLike[],
  guestUserId: string,
  today: Date = new Date()
): string[] {
  const ids = bookings
    .filter(b => isBookingEligibleForReview(b, guestUserId, today))
    .map(b => b.unitId);
  return [...new Set(ids)];
}

export function canOwnerSendCompromise(status: ReviewStatus): boolean {
  return status === REVIEW_STATUS.PENDING_OWNER || status === REVIEW_STATUS.COUNTER_SENT;
}

export function canGuestRespondToCompromise(status: ReviewStatus): boolean {
  return status === REVIEW_STATUS.COMPROMISE_SENT;
}

export function applyGuestCompromiseResponse(
  action: GuestResponseAction,
  currentStatus: ReviewStatus
): { status: ReviewStatus; isPublished: boolean } {
  if (!canGuestRespondToCompromise(currentStatus)) {
    throw new Error('No pending compromise to respond to');
  }

  if (action === 'accept') {
    return { status: REVIEW_STATUS.WITHDRAWN, isPublished: false };
  }
  if (action === 'reject') {
    return { status: REVIEW_STATUS.PUBLISHED, isPublished: true };
  }
  return { status: REVIEW_STATUS.COUNTER_SENT, isPublished: false };
}

export function shouldAutoPublishPendingOwner(review: ReviewLike, now: Date = new Date()): boolean {
  if (review.status !== REVIEW_STATUS.PENDING_OWNER) return false;
  if (!review.ownerResponseDeadline) return false;
  return new Date(review.ownerResponseDeadline) < now;
}

export function shouldAutoPublishCompromise(review: ReviewLike, now: Date = new Date()): boolean {
  if (review.status !== REVIEW_STATUS.COMPROMISE_SENT) return false;
  if (!review.compromiseDeadline) return false;
  return new Date(review.compromiseDeadline) < now;
}

export function ownerResponseDeadlineFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + FORTY_EIGHT_HOURS_MS);
}

export function resolveBookingUserIdForCreator(
  bookingUserId: string | null | undefined,
  creatorRole: string,
  guestUserRole?: string | null
): string | null {
  if (isGuestRole(creatorRole)) {
    return 'CREATOR_ID'; // placeholder — caller replaces with actual creator id
  }
  if (!bookingUserId) return null;
  if (!guestUserRole || !isGuestRole(guestUserRole)) {
    throw new Error('Invalid guest user — select a registered client');
  }
  return bookingUserId;
}

export function filterPendingOwnerReviews<T extends { status: ReviewStatus }>(reviews: T[]): T[] {
  return reviews.filter(
    r => r.status === REVIEW_STATUS.PENDING_OWNER || r.status === REVIEW_STATUS.COUNTER_SENT
  );
}
