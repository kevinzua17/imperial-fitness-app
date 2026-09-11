import { apiBlobRequest } from './api';

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadMyPlanPdfFromApi(): Promise<void> {
  const blob = await apiBlobRequest('/reports/my-plan.pdf');
  triggerDownload(blob, 'Imperial-Fitness-Mi-Plan.pdf');
}

export async function downloadClientPlanPdfFromApi(clientId: string, clientName?: string): Promise<void> {
  const blob = await apiBlobRequest(`/reports/clients/${encodeURIComponent(clientId)}/plan.pdf`);
  const safeName = (clientName || `Cliente-${clientId}`).replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, '-');
  triggerDownload(blob, `Imperial-Fitness-${safeName}.pdf`);
}
