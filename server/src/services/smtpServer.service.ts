import { db } from '../db';
import nodemailer from 'nodemailer';
import type { SmtpServer } from '@oblifield/shared';

interface SmtpServerRow {
  id: number;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from_address: string;
  auth_type: string;
  oauth_client_id: string | null;
  oauth_client_secret: string | null;
  oauth_tenant_id: string | null;
  oauth_refresh_token: string | null;
  tenant_id: number | null;
  created_at: Date;
  updated_at: Date;
}

function rowToServer(row: SmtpServerRow): SmtpServer {
  return {
    id: row.id,
    name: row.name,
    host: row.host,
    port: row.port,
    secure: row.secure,
    username: row.username,
    fromAddress: row.from_address,
    authType: (row.auth_type || 'basic') as 'basic' | 'oauth365',
    oauthClientId: row.oauth_client_id,
    oauthTenantId: row.oauth_tenant_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const smtpServerService = {
  async list(tenantId?: number): Promise<SmtpServer[]> {
    const query = db<SmtpServerRow>('smtp_servers').orderBy('name');
    if (tenantId !== undefined) {
      query.where({ tenant_id: tenantId });
    } else {
      query.whereNull('tenant_id');
    }
    const rows = await query;
    return rows.map(rowToServer);
  },

  async getById(id: number): Promise<SmtpServerRow | null> {
    const row = await db<SmtpServerRow>('smtp_servers').where({ id }).first();
    return row || null;
  },

  async create(data: {
    name: string;
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromAddress: string;
    tenantId?: number;
    authType?: string;
    oauthClientId?: string;
    oauthClientSecret?: string;
    oauthTenantId?: string;
    oauthRefreshToken?: string;
  }): Promise<SmtpServer> {
    const [row] = await db<SmtpServerRow>('smtp_servers')
      .insert({
        name: data.name,
        host: data.host,
        port: data.port,
        secure: data.secure,
        username: data.username,
        password: data.password,
        from_address: data.fromAddress,
        tenant_id: data.tenantId ?? null,
        auth_type: data.authType ?? 'basic',
        oauth_client_id: data.oauthClientId ?? null,
        oauth_client_secret: data.oauthClientSecret ?? null,
        oauth_tenant_id: data.oauthTenantId ?? null,
        oauth_refresh_token: data.oauthRefreshToken ?? null,
      })
      .returning('*');
    return rowToServer(row);
  },

  async update(id: number, data: Partial<{
    name: string;
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromAddress: string;
    authType: string;
    oauthClientId: string;
    oauthClientSecret: string;
    oauthTenantId: string;
    oauthRefreshToken: string;
  }>): Promise<SmtpServer | null> {
    const update: Record<string, unknown> = { updated_at: new Date() };
    if (data.name !== undefined) update.name = data.name;
    if (data.host !== undefined) update.host = data.host;
    if (data.port !== undefined) update.port = data.port;
    if (data.secure !== undefined) update.secure = data.secure;
    if (data.username !== undefined) update.username = data.username;
    if (data.password !== undefined) update.password = data.password;
    if (data.fromAddress !== undefined) update.from_address = data.fromAddress;
    if (data.authType !== undefined) update.auth_type = data.authType;
    if (data.oauthClientId !== undefined) update.oauth_client_id = data.oauthClientId;
    if (data.oauthClientSecret !== undefined) update.oauth_client_secret = data.oauthClientSecret;
    if (data.oauthTenantId !== undefined) update.oauth_tenant_id = data.oauthTenantId;
    if (data.oauthRefreshToken !== undefined) update.oauth_refresh_token = data.oauthRefreshToken;

    const [row] = await db<SmtpServerRow>('smtp_servers').where({ id }).update(update).returning('*');
    return row ? rowToServer(row) : null;
  },

  async delete(id: number): Promise<boolean> {
    const count = await db('smtp_servers').where({ id }).del();
    return count > 0;
  },

  async test(id: number): Promise<void> {
    const config = await this.getTransportConfig(id);
    if (!config) throw new Error('SMTP server not found');
    const transport = nodemailer.createTransport(config);
    await transport.verify();
  },

  /** Build a nodemailer transport config from a server row */
  async getTransportConfig(id: number): Promise<Record<string, any> | null> {
    const row = await this.getById(id);
    if (!row) return null;

    if (row.auth_type === 'oauth365') {
      return {
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        auth: {
          type: 'OAuth2',
          user: row.username,
          clientId: row.oauth_client_id,
          clientSecret: row.oauth_client_secret,
          refreshToken: row.oauth_refresh_token,
          accessUrl: `https://login.microsoftonline.com/${row.oauth_tenant_id}/oauth2/v2.0/token`,
        },
      };
    }

    return {
      host: row.host,
      port: row.port,
      secure: row.secure,
      auth: { user: row.username, pass: row.password },
    };
  },
};
