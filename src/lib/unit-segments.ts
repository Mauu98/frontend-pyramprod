/**
 * Unit segments: items are acquired and consumed one by one (1:1) and their weight cannot be
 * calculated by a dimensional method. Their classes are fixed to Kg./Und, coefficient 1,
 * factor 1, so the dim2 typed on the item is the unit weight.
 * Legacy Python digi_und = [4,5,7,8,9]; segment 0 added by stakeholder decision.
 * Keep in sync with the backend UnitSegmentPolicy.
 */
export const UNIT_SEGMENT_CODES: ReadonlySet<string> = new Set(['0', '4', '5', '7', '8', '9'])

export function isUnitSegment(segmentCode: string | null | undefined): boolean {
  return !!segmentCode && UNIT_SEGMENT_CODES.has(segmentCode)
}
