import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { db } from '../db';
import { geocodingService } from '../services/geocoding.service';

const router = Router();

// POST /geocoding/batch — geocode all entities missing coordinates (admin only)
router.post('/batch', requireAdmin, async (req, res) => {
  try {
    let geocoded = 0;

    // Geocode technicians without coordinates
    const techs = await db('technicians')
      .whereNull('last_latitude')
      .whereNotNull('city')
      .select('id', 'address', 'postal_code', 'city', 'country');

    for (const t of techs) {
      const addr = geocodingService.buildAddressString([t.address, t.postal_code, t.city, t.country]);
      const result = await geocodingService.geocode(addr);
      if (result) {
        await db('technicians').where({ id: t.id }).update({
          last_latitude: result.latitude,
          last_longitude: result.longitude,
        });
        geocoded++;
      }
    }

    // Geocode interventions without coordinates
    const intvs = await db('interventions')
      .whereNull('latitude')
      .whereNotNull('address')
      .select('id', 'address');

    for (const i of intvs) {
      const result = await geocodingService.geocode(i.address);
      if (result) {
        await db('interventions').where({ id: i.id }).update({
          latitude: result.latitude,
          longitude: result.longitude,
        });
        geocoded++;
      }
    }

    res.json({ success: true, data: { geocoded } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
