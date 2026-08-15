export function isTrackingAllowed(
  doNotTrack: string | null | undefined,
  explicitOptIn = false,
): boolean {
  return explicitOptIn || doNotTrack !== '1'
}
