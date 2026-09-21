/**
 * Informational CRM note when Stripe explicitly auto-cancels for payment failure.
 * Does not change status, MRR, revenue, or cancellation date.
 */

export const PAYMENT_FAILED_CANCEL_MARKER_PREFIX = '[stripe-payment-failed:'

export function paymentFailedCancelMarker(subscriptionId: string): string {
  return `${PAYMENT_FAILED_CANCEL_MARKER_PREFIX}${subscriptionId}]`
}

export function isStripePaymentFailedCancellation(sub: {
  id?: string | null
  status?: string | null
  cancellation_details?: { reason?: string | null } | null
}): boolean {
  if (sub.status !== 'canceled') return false
  return sub.cancellation_details?.reason === 'payment_failed'
}

export function notesHavePaymentFailedCancel(
  notes: string | null | undefined,
  subscriptionId: string
): boolean {
  if (!notes || !subscriptionId) return false
  return notes.includes(paymentFailedCancelMarker(subscriptionId))
}

export function formatPaymentFailedCancelNote(
  subscriptionId: string,
  canceledAtUnix: number | null | undefined
): string {
  const marker = paymentFailedCancelMarker(subscriptionId)
  if (canceledAtUnix != null && Number.isFinite(canceledAtUnix) && canceledAtUnix > 0) {
    const day = new Date(canceledAtUnix * 1000).toISOString().slice(0, 10)
    return `Stripe auto-canceled subscription due to repeated payment failures on ${day}. ${marker}`
  }
  return `Stripe auto-canceled subscription due to repeated payment failures. ${marker}`
}

/** Returns the next Notes value, or null if this subscription was already recorded. */
export function appendPaymentFailedCancelNote(
  notes: string | null | undefined,
  subscriptionId: string,
  canceledAtUnix: number | null | undefined
): string | null {
  if (!subscriptionId) return null
  if (notesHavePaymentFailedCancel(notes, subscriptionId)) return null
  const line = formatPaymentFailedCancelNote(subscriptionId, canceledAtUnix)
  const current = (notes ?? '').trimEnd()
  return current ? `${current}\n${line}` : line
}
