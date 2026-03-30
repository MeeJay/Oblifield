import { create } from 'zustand';
import type { Client, ClientTreeNode } from '@oblifield/shared';
import { clientsApi } from '../api/clients.api';

// ── localStorage persistence for collapsed clients (per-user per-tenant) ──
const COLLAPSED_KEY = 'of-client-collapsed';

/** Returns a storage key scoped to the given user + tenant so each context has its own state. */
function collapsedKey(userId: number | null, tenantId: number | null): string {
  if (userId == null) return COLLAPSED_KEY;
  return `of-client-collapsed-u${userId}-t${tenantId ?? 0}`;
}

function loadCollapsedFromKey(key: string): Set<number> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return new Set(JSON.parse(raw) as number[]);
  } catch { /* ignore */ }
  return new Set();
}

/** Initial load uses the base key so existing data still works before first auth. */
function loadCollapsed(): Set<number> {
  return loadCollapsedFromKey(COLLAPSED_KEY);
}

/** Module-level: tracks which key the store is currently saving to. */
let _activeCollapsedKey = COLLAPSED_KEY;

function saveCollapsed(ids: Set<number>): void {
  localStorage.setItem(_activeCollapsedKey, JSON.stringify([...ids]));
}

interface ClientStore {
  clients: Map<number, Client>;
  tree: ClientTreeNode[];
  collapsedClientIds: Set<number>;
  isLoading: boolean;

  // Actions
  fetchClients: () => Promise<void>;
  fetchTree: () => Promise<void>;
  addClient: (c: Client) => void;
  updateClient: (id: number, data: Partial<Client>) => void;
  removeClient: (id: number) => void;

  // Collapse/expand actions
  toggleClientExpanded: (clientId: number) => void;
  expandClient: (clientId: number) => void;
  /** Re-loads collapsed state for the given user+tenant context (call on login / tenant switch). */
  reinitForTenant: (userId: number | null, tenantId: number | null) => void;

  // Getters
  getClient: (id: number) => Client | undefined;
  getClientList: () => Client[];
}

export const useClientStore = create<ClientStore>((set, get) => ({
  clients: new Map(),
  tree: [],
  collapsedClientIds: loadCollapsed(),
  isLoading: false,

  fetchClients: async () => {
    set({ isLoading: true });
    try {
      const list = await clientsApi.list();
      const clients = new Map<number, Client>();
      list.forEach((c) => clients.set(c.id, c));
      set({ clients, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchTree: async () => {
    try {
      const tree = await clientsApi.tree();
      set({ tree });
    } catch {
      // ignore
    }
  },

  addClient: (client) => {
    set((state) => {
      const clients = new Map(state.clients);
      clients.set(client.id, client);
      return { clients };
    });
  },

  updateClient: (id, data) => {
    set((state) => {
      const clients = new Map(state.clients);
      const existing = clients.get(id);
      if (existing) {
        clients.set(id, { ...existing, ...data });
      }
      return { clients };
    });
  },

  removeClient: (id) => {
    set((state) => {
      const clients = new Map(state.clients);
      clients.delete(id);
      return { clients };
    });
  },

  // ── Collapse/expand ──

  reinitForTenant: (userId, tenantId) => {
    _activeCollapsedKey = collapsedKey(userId, tenantId);
    set({ collapsedClientIds: loadCollapsedFromKey(_activeCollapsedKey) });
  },

  toggleClientExpanded: (clientId) => {
    const collapsed = new Set(get().collapsedClientIds);
    if (collapsed.has(clientId)) {
      collapsed.delete(clientId);
    } else {
      collapsed.add(clientId);
    }
    saveCollapsed(collapsed);
    set({ collapsedClientIds: collapsed });
  },

  expandClient: (clientId) => {
    const collapsed = new Set(get().collapsedClientIds);
    if (collapsed.has(clientId)) {
      collapsed.delete(clientId);
      saveCollapsed(collapsed);
      set({ collapsedClientIds: collapsed });
    }
  },

  // ── Getters ──

  getClient: (id) => get().clients.get(id),
  getClientList: () => Array.from(get().clients.values()),
}));
