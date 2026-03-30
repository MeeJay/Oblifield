import { create } from 'zustand';
import type { Intervention, InterventionStatus, TimelineEvent } from '@oblifield/shared';
import { interventionsApi } from '../api/interventions.api';

interface InterventionStore {
  interventions: Map<number, Intervention>;
  timeline: Map<number, TimelineEvent[]>;
  summary: Record<InterventionStatus, number>;
  isLoading: boolean;

  // Actions
  fetchInterventions: (filters?: { status?: InterventionStatus; technicianId?: number; clientId?: number }) => Promise<void>;
  fetchSummary: () => Promise<void>;
  addIntervention: (i: Intervention) => void;
  updateIntervention: (id: number, data: Partial<Intervention>) => void;
  removeIntervention: (id: number) => void;
  setTimeline: (interventionId: number, events: TimelineEvent[]) => void;
  addTimelineEvent: (interventionId: number, event: TimelineEvent) => void;

  // Getters
  getIntervention: (id: number) => Intervention | undefined;
  getInterventionList: () => Intervention[];
  getByStatus: (status: InterventionStatus) => Intervention[];
  getByTechnician: (techId: number) => Intervention[];
  getByClient: (clientId: number) => Intervention[];
}

export const useInterventionStore = create<InterventionStore>((set, get) => ({
  interventions: new Map(),
  timeline: new Map(),
  summary: {} as Record<InterventionStatus, number>,
  isLoading: false,

  fetchInterventions: async (filters) => {
    set({ isLoading: true });
    try {
      const list = await interventionsApi.list(filters);
      const interventions = new Map<number, Intervention>();
      list.forEach((i) => interventions.set(i.id, i));
      set({ interventions, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchSummary: async () => {
    try {
      const data = await interventionsApi.getSummary();
      set({ summary: data });
    } catch {
      // ignore
    }
  },

  addIntervention: (intervention) => {
    set((state) => {
      const interventions = new Map(state.interventions);
      interventions.set(intervention.id, intervention);
      return { interventions };
    });
  },

  updateIntervention: (id, data) => {
    set((state) => {
      const interventions = new Map(state.interventions);
      const existing = interventions.get(id);
      if (existing) {
        interventions.set(id, { ...existing, ...data });
      }
      return { interventions };
    });
  },

  removeIntervention: (id) => {
    set((state) => {
      const interventions = new Map(state.interventions);
      interventions.delete(id);
      const timeline = new Map(state.timeline);
      timeline.delete(id);
      return { interventions, timeline };
    });
  },

  setTimeline: (interventionId, events) => {
    set((state) => {
      const timeline = new Map(state.timeline);
      timeline.set(interventionId, events);
      return { timeline };
    });
  },

  addTimelineEvent: (interventionId, event) => {
    set((state) => {
      const timeline = new Map(state.timeline);
      const existing = timeline.get(interventionId) || [];
      timeline.set(interventionId, [...existing, event]);
      return { timeline };
    });
  },

  // Getters
  getIntervention: (id) => get().interventions.get(id),
  getInterventionList: () => Array.from(get().interventions.values()),
  getByStatus: (status) =>
    Array.from(get().interventions.values()).filter((i) => i.status === status),
  getByTechnician: (techId) =>
    Array.from(get().interventions.values()).filter((i) => i.assignedTechnicianId === techId),
  getByClient: (clientId) =>
    Array.from(get().interventions.values()).filter((i) => i.clientId === clientId),
}));
