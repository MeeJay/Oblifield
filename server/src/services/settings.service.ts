import { db } from '../db';
import type { SettingsScope, ResolvedSettings, SettingValue } from '@oblifield/shared';
import type { SettingsKey } from '@oblifield/shared';
import { SETTINGS_KEYS, HARDCODED_DEFAULTS, SETTINGS_DEFINITIONS } from '@oblifield/shared';

interface SettingsRow {
  id: number;
  scope: string;
  scope_id: number | null;
  key: string;
  value: unknown;
  created_at: Date;
  updated_at: Date;
}

export interface SettingOverride {
  key: SettingsKey;
  value: number;
}

export const settingsService = {
  // ── Raw CRUD ──

  async getByScope(scope: SettingsScope, scopeId: number | null): Promise<Record<string, number>> {
    const rows = await db<SettingsRow>('settings')
      .where({ scope, scope_id: scopeId })
      .select('key', 'value');

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.key] = row.value as number;
    }
    return result;
  },

  async set(scope: SettingsScope, scopeId: number | null, key: SettingsKey, value: number): Promise<void> {
    // Validate key
    const def = SETTINGS_DEFINITIONS.find((d) => d.key === key);
    if (!def) throw new Error(`Unknown setting key: ${key}`);
    if (value < def.min || value > def.max) {
      throw new Error(`Value for ${key} must be between ${def.min} and ${def.max}`);
    }

    await db('settings')
      .insert({
        scope,
        scope_id: scopeId,
        key,
        value: JSON.stringify(value),
        updated_at: new Date(),
      })
      .onConflict(['scope', 'scope_id', 'key'])
      .merge({ value: JSON.stringify(value), updated_at: new Date() });
  },

  async remove(scope: SettingsScope, scopeId: number | null, key: SettingsKey): Promise<boolean> {
    const count = await db('settings')
      .where({ scope, scope_id: scopeId, key })
      .del();
    return count > 0;
  },

  async setBulk(scope: SettingsScope, scopeId: number | null, overrides: SettingOverride[]): Promise<void> {
    for (const { key, value } of overrides) {
      await this.set(scope, scopeId, key, value);
    }
  },

  // ── Inheritance Resolution ──

  /**
   * Resolve all settings for a given scope, walking up the hierarchy:
   *   Hardcoded defaults → Global → Client ancestors (root→leaf) → Intervention
   *
   * Each resolved value tracks its source for UI display.
   */
  async resolveForMonitor(interventionId: number, clientId: number | null): Promise<ResolvedSettings> {
    // 1. Start with hardcoded defaults
    const resolved: ResolvedSettings = {} as ResolvedSettings;
    const allKeys = Object.values(SETTINGS_KEYS);

    for (const key of allKeys) {
      resolved[key] = {
        value: HARDCODED_DEFAULTS[key],
        source: 'default',
        sourceId: null,
        sourceName: 'Default',
      };
    }

    // 2. Apply global overrides
    const globalOverrides = await this.getByScope('global', null);
    for (const key of allKeys) {
      if (globalOverrides[key] !== undefined) {
        resolved[key] = {
          value: globalOverrides[key],
          source: 'global',
          sourceId: null,
          sourceName: 'Global',
        };
      }
    }

    // 3. Apply client chain (root → leaf) if intervention is linked to a client
    if (clientId !== null) {
      // Get ancestors ordered by depth DESC (root first → direct parent last)
      const ancestorRows = await db('client_closure')
        .join('clients', 'clients.id', 'client_closure.ancestor_id')
        .where('client_closure.descendant_id', clientId)
        .orderBy('client_closure.depth', 'desc')
        .select('clients.id', 'clients.name', 'client_closure.depth');

      for (const ancestor of ancestorRows) {
        const clientOverrides = await this.getByScope('client', ancestor.id);
        for (const key of allKeys) {
          if (clientOverrides[key] !== undefined) {
            resolved[key] = {
              value: clientOverrides[key],
              source: 'client',
              sourceId: ancestor.id,
              sourceName: ancestor.name,
            };
          }
        }
      }
    }

    // 4. Apply intervention-level overrides
    const interventionOverrides = await this.getByScope('intervention', interventionId);
    for (const key of allKeys) {
      if (interventionOverrides[key] !== undefined) {
        resolved[key] = {
          value: interventionOverrides[key],
          source: 'intervention',
          sourceId: interventionId,
          sourceName: 'This intervention',
        };
      }
    }

    return resolved;
  },

  /**
   * Resolve settings for a client level (for display in client settings UI).
   * Chain: Hardcoded → Global → Ancestor clients (root→parent)
   * Does NOT include the client's own overrides as resolved — returns them separately.
   */
  async resolveForGroup(clientId: number): Promise<{ resolved: ResolvedSettings; overrides: Record<string, number> }> {
    const allKeys = Object.values(SETTINGS_KEYS);

    // 1. Start with hardcoded defaults
    const resolved: ResolvedSettings = {} as ResolvedSettings;
    for (const key of allKeys) {
      resolved[key] = {
        value: HARDCODED_DEFAULTS[key],
        source: 'default',
        sourceId: null,
        sourceName: 'Default',
      };
    }

    // 2. Global
    const globalOverrides = await this.getByScope('global', null);
    for (const key of allKeys) {
      if (globalOverrides[key] !== undefined) {
        resolved[key] = {
          value: globalOverrides[key],
          source: 'global',
          sourceId: null,
          sourceName: 'Global',
        };
      }
    }

    // 3. Ancestors (root→parent, excluding self)
    const ancestorRows = await db('client_closure')
      .join('clients', 'clients.id', 'client_closure.ancestor_id')
      .where('client_closure.descendant_id', clientId)
      .where('client_closure.depth', '>', 0) // exclude self
      .orderBy('client_closure.depth', 'desc')
      .select('clients.id', 'clients.name', 'client_closure.depth');

    for (const ancestor of ancestorRows) {
      const clientOvr = await this.getByScope('client', ancestor.id);
      for (const key of allKeys) {
        if (clientOvr[key] !== undefined) {
          resolved[key] = {
            value: clientOvr[key],
            source: 'client',
            sourceId: ancestor.id,
            sourceName: ancestor.name,
          };
        }
      }
    }

    // 4. Get this client's own overrides (separate, not merged into resolved)
    const overrides = await this.getByScope('client', clientId);

    return { resolved, overrides };
  },

  /**
   * Resolve for global scope (just hardcoded defaults + global overrides)
   */
  async resolveGlobal(): Promise<{ resolved: ResolvedSettings; overrides: Record<string, number> }> {
    const allKeys = Object.values(SETTINGS_KEYS);
    const resolved: ResolvedSettings = {} as ResolvedSettings;

    for (const key of allKeys) {
      resolved[key] = {
        value: HARDCODED_DEFAULTS[key],
        source: 'default',
        sourceId: null,
        sourceName: 'Default',
      };
    }

    const overrides = await this.getByScope('global', null);

    return { resolved, overrides };
  },
};
