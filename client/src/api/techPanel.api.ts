import type { Intervention, InterventionStep, InterventionPhoto, InterventionSignature, TimelineEvent } from '@oblifield/shared';

const BASE = '/api/tech-panel';

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const date = sessionStorage.getItem('tech-panel-date');
  if (date) h['X-Tech-Date'] = date;
  return h;
}

function headersNoBody(): Record<string, string> {
  const h: Record<string, string> = {};
  const date = sessionStorage.getItem('tech-panel-date');
  if (date) h['X-Tech-Date'] = date;
  return h;
}

async function json<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!body.success) throw new Error(body.error || 'Request failed');
  return body.data as T;
}

export interface LookupResult {
  uid: string;
  title: string;
  status: string;
  clientName: string | null;
  siteName: string | null;
  logoUrl: string | null;
}

export interface TechPanelDetails {
  intervention: Intervention;
  steps: InterventionStep[];
  photos: InterventionPhoto[];
  signatures: InterventionSignature[];
  timeline: TimelineEvent[];
}

export const techPanelApi = {
  async lookup(uid: string, date: string): Promise<LookupResult> {
    const res = await fetch(`${BASE}/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: uid.toUpperCase(), date }),
    });
    return json<LookupResult>(res);
  },

  async getDetails(uid: string): Promise<TechPanelDetails> {
    const res = await fetch(`${BASE}/${uid}/details`, { headers: headersNoBody() });
    return json<TechPanelDetails>(res);
  },

  async checkIn(uid: string, gps?: { latitude: number; longitude: number; accuracy: number }): Promise<Intervention> {
    const res = await fetch(`${BASE}/${uid}/check-in`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(gps || {}),
    });
    return json<Intervention>(res);
  },

  async checkOut(uid: string, gps?: { latitude: number; longitude: number; accuracy: number }, status?: 'done' | 'issue'): Promise<Intervention> {
    const res = await fetch(`${BASE}/${uid}/check-out`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ ...(gps || {}), status }),
    });
    return json<Intervention>(res);
  },

  async saveObservations(uid: string, technicianObservations: string): Promise<Intervention> {
    const res = await fetch(`${BASE}/${uid}/observations`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ technicianObservations }),
    });
    return json<Intervention>(res);
  },

  async uploadPhoto(uid: string, file: File): Promise<InterventionPhoto> {
    const formData = new FormData();
    formData.append('photo', file);
    const h: Record<string, string> = {};
    const date = sessionStorage.getItem('tech-panel-date');
    if (date) h['X-Tech-Date'] = date;
    const res = await fetch(`${BASE}/${uid}/photos`, {
      method: 'POST',
      headers: h,
      body: formData,
    });
    return json<InterventionPhoto>(res);
  },

  getPhotoUrl(uid: string, filename: string): string {
    return `${BASE}/${uid}/photos/${filename}`;
  },

  async saveSignature(uid: string, data: { type: 'technician' | 'client'; signatureData: string; signerName: string }): Promise<InterventionSignature> {
    const res = await fetch(`${BASE}/${uid}/signatures`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    });
    return json<InterventionSignature>(res);
  },

  async getSteps(uid: string): Promise<InterventionStep[]> {
    const res = await fetch(`${BASE}/${uid}/steps`, { headers: headersNoBody() });
    return json<InterventionStep[]>(res);
  },

  async validateStep(uid: string, stepId: number): Promise<InterventionStep> {
    const res = await fetch(`${BASE}/${uid}/steps/${stepId}/validate`, {
      method: 'POST',
      headers: headers(),
      body: '{}',
    });
    return json<InterventionStep>(res);
  },

  async unvalidateStep(uid: string, stepId: number): Promise<InterventionStep> {
    const res = await fetch(`${BASE}/${uid}/steps/${stepId}/unvalidate`, {
      method: 'POST',
      headers: headers(),
      body: '{}',
    });
    return json<InterventionStep>(res);
  },
};
