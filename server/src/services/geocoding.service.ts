/**
 * Geocoding service using OpenStreetMap Nominatim (free, no API key).
 * Rate limit: 1 request per second. We add a small delay.
 */

interface GeoResult {
  latitude: number;
  longitude: number;
}

let lastRequestTime = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
  }
  lastRequestTime = Date.now();
}

export const geocodingService = {
  async geocode(address: string): Promise<GeoResult | null> {
    if (!address || address.trim().length < 3) return null;

    await throttle();

    try {
      const params = new URLSearchParams({
        q: address,
        format: 'json',
        limit: '1',
      });

      const url = `https://nominatim.openstreetmap.org/search?${params}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Oblifield/1.0 (field intervention management)',
        },
      });

      if (!response.ok) {
        console.error(`[geocoding] HTTP ${response.status} for "${address}"`);
        return null;
      }

      const results = await response.json() as Array<{ lat: string; lon: string }>;
      if (!results || results.length === 0) return null;

      return {
        latitude: parseFloat(results[0].lat),
        longitude: parseFloat(results[0].lon),
      };
    } catch (err) {
      console.error(`[geocoding] Error for "${address}":`, err);
      return null;
    }
  },

  buildAddressString(parts: (string | null | undefined)[]): string {
    return parts.filter(Boolean).join(', ');
  },
};
