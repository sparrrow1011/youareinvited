/**
 * Extracts an invitation UUID from a raw QR code scan value.
 *
 * Handles three input formats:
 *   1. A bare UUID string
 *   2. A full invitation URL with `?invitation=<uuid>` query param
 *   3. A URL with `/invitation/<uuid>` in the path
 *
 * Returns the UUID string, or null if not found.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function extractInvitationId(value: string): string | null {
  const trimmed = value.trim();
  if (UUID_PATTERN.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);

    const invitationId = parsed.searchParams.get('invitation');
    if (invitationId && UUID_PATTERN.test(invitationId)) return invitationId;

    const pathMatch = parsed.pathname.match(/\/invitation\/([0-9a-f-]+)/i);
    if (pathMatch && UUID_PATTERN.test(pathMatch[1])) return pathMatch[1];
  } catch {
    // Not a URL — already handled above
  }

  return null;
}
