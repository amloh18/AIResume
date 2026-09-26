/**
 * Maps a failed CV save/update API response to a message the user can act on.
 *
 * `/api/cvs/[id]` returns a bare `CV not found` (404) whenever the document
 * doesn't match the *authenticated* identity of the request — in practice this
 * means the request stopped resolving as the signed-in user (e.g. it fell back
 * to the anonymous identity while the session cookie was missing/undecodable),
 * NOT that the CV was deleted. Showing that raw string in the editor's red
 * save banner, with the CV still sitting right there in the documents list,
 * reads like data loss and tells the user nothing actionable.
 *
 * Identity-class statuses (401/404) therefore get an explanation; every other
 * status keeps the server's own message so validation errors pass through
 * unchanged. Server-side console logging still keeps the raw error text.
 */
export function humanizeSaveApiError(status: number, rawError?: string | null): string {
  if (status === 401) {
    return 'Your session has expired — refresh the page and sign in again. Your work is still open in this tab.';
  }
  if (status === 404) {
    return 'This CV wasn’t found for your current session — you may have been signed out. Refresh the page, reopen your CV and save again; your changes are still in this tab.';
  }
  return rawError || 'Failed to save CV. Please try again.';
}
