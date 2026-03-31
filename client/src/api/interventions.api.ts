import apiClient from './client';
import type {
  Intervention,
  InterventionStatus,
  InterventionStep,
  InterventionSignature,
  InterventionPart,
  TimelineEvent,
  InterventionPhoto,
  ApiResponse,
} from '@oblifield/shared';

export const interventionsApi = {
  async list(filters?: { status?: InterventionStatus; technicianId?: number; clientId?: number }): Promise<Intervention[]> {
    const res = await apiClient.get<ApiResponse<Intervention[]>>('/interventions', { params: filters });
    return res.data.data!;
  },

  async getById(id: number): Promise<Intervention> {
    const res = await apiClient.get<ApiResponse<Intervention>>(`/interventions/${id}`);
    return res.data.data!;
  },

  async create(data: Partial<Intervention>): Promise<Intervention> {
    const res = await apiClient.post<ApiResponse<Intervention>>('/interventions', data);
    return res.data.data!;
  },

  async update(id: number, data: Partial<Intervention>): Promise<Intervention> {
    const res = await apiClient.put<ApiResponse<Intervention>>(`/interventions/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/interventions/${id}`);
  },

  async assign(id: number, technicianId: number | null): Promise<Intervention> {
    const res = await apiClient.post<ApiResponse<Intervention>>(`/interventions/${id}/assign`, { technicianId });
    return res.data.data!;
  },

  async changeStatus(id: number, status: InterventionStatus): Promise<Intervention> {
    const res = await apiClient.post<ApiResponse<Intervention>>(`/interventions/${id}/status`, { status });
    return res.data.data!;
  },

  async getSummary(): Promise<Record<InterventionStatus, number>> {
    const res = await apiClient.get<ApiResponse<Record<InterventionStatus, number>>>('/interventions/summary');
    return res.data.data!;
  },

  async getSchedule(date?: string): Promise<Intervention[]> {
    const res = await apiClient.get<ApiResponse<Intervention[]>>('/interventions/schedule', { params: { date } });
    return res.data.data!;
  },

  async getTimeline(id: number, limit?: number, offset?: number): Promise<TimelineEvent[]> {
    const res = await apiClient.get<ApiResponse<TimelineEvent[]>>(`/interventions/${id}/timeline`, {
      params: { limit, offset },
    });
    return res.data.data!;
  },

  async addTimelineEvent(
    id: number,
    data: { type: string; message?: string; latitude?: number; longitude?: number; accuracy?: number },
  ): Promise<TimelineEvent> {
    const res = await apiClient.post<ApiResponse<TimelineEvent>>(`/interventions/${id}/timeline`, data);
    return res.data.data!;
  },

  async checkIn(id: number, gps?: { latitude: number; longitude: number; accuracy?: number }): Promise<Intervention> {
    const res = await apiClient.post<ApiResponse<Intervention>>(`/interventions/${id}/check-in`, gps);
    return res.data.data!;
  },

  async checkOut(
    id: number,
    data: { latitude?: number; longitude?: number; accuracy?: number; status?: 'done' | 'issue' },
  ): Promise<Intervention> {
    const res = await apiClient.post<ApiResponse<Intervention>>(`/interventions/${id}/check-out`, data);
    return res.data.data!;
  },

  async getPhotos(id: number): Promise<InterventionPhoto[]> {
    const res = await apiClient.get<ApiResponse<InterventionPhoto[]>>(`/interventions/${id}/photos`);
    return res.data.data!;
  },

  async uploadPhoto(id: number, file: File): Promise<InterventionPhoto> {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await apiClient.post<ApiResponse<InterventionPhoto>>(`/interventions/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data!;
  },

  async getScheduleRange(from: string, to: string): Promise<Intervention[]> {
    const res = await apiClient.get<ApiResponse<Intervention[]>>('/interventions/schedule-range', { params: { from, to } });
    return res.data.data!;
  },

  async getSteps(interventionId: number): Promise<InterventionStep[]> {
    const res = await apiClient.get<ApiResponse<InterventionStep[]>>(`/interventions/${interventionId}/steps`);
    return res.data.data!;
  },

  async instantiateSteps(interventionId: number, templateId: number): Promise<InterventionStep[]> {
    const res = await apiClient.post<ApiResponse<InterventionStep[]>>(`/interventions/${interventionId}/steps/instantiate`, { templateId });
    return res.data.data!;
  },

  async validateStepTechnician(interventionId: number, stepId: number, technicianId: number): Promise<InterventionStep> {
    const res = await apiClient.post<ApiResponse<InterventionStep>>(`/interventions/${interventionId}/steps/${stepId}/validate-technician`, { technicianId });
    return res.data.data!;
  },

  async unvalidateStepTechnician(interventionId: number, stepId: number): Promise<InterventionStep> {
    const res = await apiClient.delete<ApiResponse<InterventionStep>>(`/interventions/${interventionId}/steps/${stepId}/validate-technician`);
    return res.data.data!;
  },

  async validateStepSupervisor(interventionId: number, stepId: number): Promise<InterventionStep> {
    const res = await apiClient.post<ApiResponse<InterventionStep>>(`/interventions/${interventionId}/steps/${stepId}/validate-supervisor`);
    return res.data.data!;
  },

  async unvalidateStepSupervisor(interventionId: number, stepId: number): Promise<InterventionStep> {
    const res = await apiClient.delete<ApiResponse<InterventionStep>>(`/interventions/${interventionId}/steps/${stepId}/validate-supervisor`);
    return res.data.data!;
  },

  // Signatures
  async getSignatures(interventionId: number): Promise<InterventionSignature[]> {
    const res = await apiClient.get<ApiResponse<InterventionSignature[]>>(`/interventions/${interventionId}/signatures`);
    return res.data.data!;
  },

  async saveSignature(interventionId: number, data: { type: 'technician' | 'supervisor' | 'client'; signatureData: string; signerName: string }): Promise<InterventionSignature> {
    const res = await apiClient.post<ApiResponse<InterventionSignature>>(`/interventions/${interventionId}/signatures`, data);
    return res.data.data!;
  },

  async deleteSignature(interventionId: number, sigId: number): Promise<void> {
    await apiClient.delete(`/interventions/${interventionId}/signatures/${sigId}`);
  },

  // Parts / Materials
  async getParts(interventionId: number): Promise<InterventionPart[]> {
    const res = await apiClient.get<ApiResponse<InterventionPart[]>>(`/interventions/${interventionId}/parts`);
    return res.data.data!;
  },

  async addPart(interventionId: number, data: { name: string; reference?: string; quantity?: number; unit?: string; unitPrice?: number; notes?: string }): Promise<InterventionPart> {
    const res = await apiClient.post<ApiResponse<InterventionPart>>(`/interventions/${interventionId}/parts`, data);
    return res.data.data!;
  },

  async updatePart(interventionId: number, partId: number, data: Partial<{ name: string; reference: string; quantity: number; unit: string; unitPrice: number; notes: string }>): Promise<InterventionPart> {
    const res = await apiClient.put<ApiResponse<InterventionPart>>(`/interventions/${interventionId}/parts/${partId}`, data);
    return res.data.data!;
  },

  async deletePart(interventionId: number, partId: number): Promise<void> {
    await apiClient.delete(`/interventions/${interventionId}/parts/${partId}`);
  },

  getReportPdfUrl(id: number, supervisor?: string): string {
    const params = supervisor ? `?supervisor=${encodeURIComponent(supervisor)}` : '';
    return `/api/interventions/${id}/report/pdf${params}`;
  },
};
