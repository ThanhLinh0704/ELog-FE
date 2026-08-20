/**
 * Triggers a browser download for a Blob already fetched from the backend.
 * Consolidates the create-link/click/revoke pattern previously copy-pasted
 * across ImportBatchDetailPage / ImportErrorsTable / ImportResultCard.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
