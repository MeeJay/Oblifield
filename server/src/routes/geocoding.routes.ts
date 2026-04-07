import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { db } from '../db';
import { geocodingService } from '../services/geocoding.service';

const router = Router();

// POST /geocoding/batch — geocode all entities missing coordinates (admin only)
router.post('/batch', requireAdmin, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    let geocoded = 0;
    const errors: string[] = [];

    // Geocode technicians without coordinates (use any address field available)
    const techs = await db('technicians')
      .where({ tenant_id: tenantId })
      .where(function () {
        this.whereNull('last_latitude').orWhere('last_latitude', 0);
      })
      .where(function () {
        this.whereNotNull('address')
          .orWhereNotNull('city')
          .orWhereNotNull('postal_code')
          .orWhereNotNull('country');
      })
      .select('id', 'first_name', 'last_name', 'address', 'postal_code', 'city', 'country');

    for (const t of techs) {
      const addr = geocodingService.buildAddressString([t.address, t.postal_code, t.city, t.country]);
      if (!addr) continue;
      const result = await geocodingService.geocode(addr);
      if (result) {
        await db('technicians').where({ id: t.id }).update({
          last_latitude: result.latitude,
          last_longitude: result.longitude,
        });
        geocoded++;
      } else {
        errors.push(`Technicien ${t.first_name} ${t.last_name}: "${addr}" non trouve`);
      }
    }

    // Geocode interventions without coordinates
    const intvs = await db('interventions')
      .where({ tenant_id: tenantId })
      .where(function () {
        this.whereNull('latitude').orWhere('latitude', 0);
      })
      .where(function () {
        this.whereNotNull('address');
      })
      .select('id', 'title', 'address');

    for (const i of intvs) {
      if (!i.address) continue;
      const result = await geocodingService.geocode(i.address);
      if (result) {
        await db('interventions').where({ id: i.id }).update({
          latitude: result.latitude,
          longitude: result.longitude,
        });
        geocoded++;
      } else {
        errors.push(`Intervention "${i.title}": "${i.address}" non trouve`);
      }
    }

    // Also geocode interventions that have a site but no address/coords
    const siteIntvs = await db('interventions')
      .where({ 'interventions.tenant_id': tenantId })
      .where(function () {
        this.whereNull('latitude').orWhere('latitude', 0);
      })
      .whereNull('address')
      .whereNotNull('site_id')
      .join('sites as s', 'interventions.site_id', 's.id')
      .select('interventions.id', 'interventions.title', 's.address as site_address', 's.city as site_city', 's.postal_code as site_postal_code', 's.country as site_country');

    for (const i of siteIntvs) {
      const addr = geocodingService.buildAddressString([i.site_address, i.site_postal_code, i.site_city, i.site_country]);
      if (!addr) continue;
      const result = await geocodingService.geocode(addr);
      if (result) {
        await db('interventions').where({ id: i.id }).update({
          latitude: result.latitude,
          longitude: result.longitude,
        });
        geocoded++;
      } else {
        errors.push(`Intervention "${i.title}" (via site): "${addr}" non trouve`);
      }
    }

    res.json({ success: true, data: { geocoded, errors } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /geocoding/intervention/:id — geocode a single intervention by its address
router.post('/intervention/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const intv = await db('interventions').where({ id }).select('id', 'title', 'address', 'site_id').first();
    if (!intv) return res.status(404).json({ success: false, error: 'Intervention not found' });

    let addr = intv.address;
    if (!addr && intv.site_id) {
      const site = await db('sites').where({ id: intv.site_id }).select('address', 'postal_code', 'city', 'country').first();
      if (site) addr = geocodingService.buildAddressString([site.address, site.postal_code, site.city, site.country]);
    }
    if (!addr) return res.status(400).json({ success: false, error: 'Aucune adresse disponible' });

    const result = await geocodingService.geocode(addr);
    if (!result) return res.status(400).json({ success: false, error: `Adresse non trouvee : ${addr}` });

    await db('interventions').where({ id }).update({ latitude: result.latitude, longitude: result.longitude });
    res.json({ success: true, data: { latitude: result.latitude, longitude: result.longitude } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /geocoding/technician/:id — geocode a single technician by their address
router.post('/technician/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const tech = await db('technicians').where({ id }).select('id', 'address', 'postal_code', 'city', 'country').first();
    if (!tech) return res.status(404).json({ success: false, error: 'Technician not found' });

    const addr = geocodingService.buildAddressString([tech.address, tech.postal_code, tech.city, tech.country]);
    if (!addr) return res.status(400).json({ success: false, error: 'Aucune adresse disponible' });

    const result = await geocodingService.geocode(addr);
    if (!result) return res.status(400).json({ success: false, error: `Adresse non trouvee : ${addr}` });

    await db('technicians').where({ id }).update({ last_latitude: result.latitude, last_longitude: result.longitude });
    res.json({ success: true, data: { latitude: result.latitude, longitude: result.longitude } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
