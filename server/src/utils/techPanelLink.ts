import crypto from 'crypto';
import { appConfigService } from '../services/appConfig.service';

const LINK_SECRET = process.env.SESSION_SECRET || 'fallback-secret';
const LINK_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function signLink(uid: string, ts: number): string {
  return crypto.createHmac('sha256', LINK_SECRET).update(`${uid}:${ts}`).digest('hex').slice(0, 16);
}

export function verifyLink(uid: string, ts: number, sig: string): boolean {
  if (Date.now() - ts > LINK_EXPIRY_MS) return false;
  const expected = signLink(uid, ts);
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export async function generateTechPanelUrl(uid: string): Promise<string | null> {
  const techPanelUrl = await appConfigService.get('tech_panel_url');
  if (!techPanelUrl) return null;
  const ts = Date.now();
  const sig = signLink(uid, ts);
  return `${techPanelUrl}/${uid}?sig=${sig}&ts=${ts}`;
}
