import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Filter, Wrench, Clipboard, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Intervention, InterventionStatus, Technician, TechnicianStatus } from '@oblifield/shared';
import { INTERVENTION_STATUS_LABELS } from '@oblifield/shared';
import { interventionsApi } from '@/api/interventions.api';
import { techniciansApi } from '@/api/technicians.api';
import apiClient from '@/api/client';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

// Fix default Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const STATUS_COLORS: Record<InterventionStatus, string> = {
  pending: '#eab308',
  assigned: '#3b82f6',
  in_progress: '#AEEA00',
  done: '#22c55e',
  issue: '#ef4444',
  cancelled: '#6b7280',
};

const TECH_STATUS_COLORS: Record<TechnicianStatus, string> = {
  available: '#22c55e',
  on_site: '#AEEA00',
  travelling: '#3b82f6',
  offline: '#6b7280',
  on_break: '#eab308',
};

function createColorIcon(color: string, shape: 'circle' | 'pin' = 'pin'): L.DivIcon {
  if (shape === 'circle') {
    return L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  }
  return L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;border-radius:50% 50% 50% 0;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);transform:rotate(-45deg);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 12],
  });
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [map, positions]);
  return null;
}

type ViewLayer = 'interventions' | 'technicians' | 'both';

export function MapPage() {
  const navigate = useNavigate();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [layer, setLayer] = useState<ViewLayer>('both');
  const [statusFilter, setStatusFilter] = useState<InterventionStatus | ''>('');
  const [geocoding, setGeocoding] = useState(false);
  const [showRadius] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [intvs, techs] = await Promise.all([
          interventionsApi.list(),
          techniciansApi.list(),
        ]);
        setInterventions(intvs);
        setTechnicians(techs);
      } catch {
        toast.error('Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Client-side geocoding via Nominatim (browser has internet access, Docker may not)
  async function nominatimGeocode(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const params = new URLSearchParams({ q: address, format: 'json', limit: '1' });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'User-Agent': 'Oblifield/1.0' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || data.length === 0) return null;
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch { return null; }
  }

  const handleGeocode = async () => {
    setGeocoding(true);
    let geocoded = 0;
    const errors: string[] = [];

    try {
      // Geocode technicians missing coordinates
      const techsToGeocode = technicians.filter(
        (t) => (!t.lastLatitude || !t.lastLongitude) && (t.address || t.city || t.postalCode || t.country),
      );
      for (const t of techsToGeocode) {
        const addr = [t.address, t.postalCode, t.city, t.country].filter(Boolean).join(', ');
        if (!addr) continue;
        const result = await nominatimGeocode(addr);
        if (result) {
          await apiClient.post(`/technicians/${t.id}/location`, { latitude: result.lat, longitude: result.lng });
          geocoded++;
        } else {
          errors.push(`Technicien ${t.firstName} ${t.lastName}`);
        }
        // Nominatim rate limit: 1 req/sec
        await new Promise((r) => setTimeout(r, 1100));
      }

      // Geocode interventions missing coordinates
      const intvsToGeocode = interventions.filter(
        (i) => (!i.latitude || !i.longitude) && i.address,
      );
      for (const i of intvsToGeocode) {
        const result = await nominatimGeocode(i.address!);
        if (result) {
          await apiClient.put(`/interventions/${i.id}/geocode`, { latitude: result.lat, longitude: result.lng });
          geocoded++;
        } else {
          errors.push(`Intervention "${i.title}"`);
        }
        await new Promise((r) => setTimeout(r, 1100));
      }

      if (errors.length > 0) {
        toast.error(`${errors.length} adresse(s) non trouvee(s)`);
      }
      toast.success(`${geocoded} adresse${geocoded > 1 ? 's' : ''} geocodee${geocoded > 1 ? 's' : ''}`);

      // Reload data
      const [intvs, techs] = await Promise.all([
        interventionsApi.list(),
        techniciansApi.list(),
      ]);
      setInterventions(intvs);
      setTechnicians(techs);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Erreur inconnue';
      toast.error(`Echec du geocodage : ${msg}`);
    } finally {
      setGeocoding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const filteredInterventions = interventions.filter((i) => {
    if (!i.latitude || !i.longitude) return false;
    if (statusFilter && i.status !== statusFilter) return false;
    return true;
  });

  const filteredTechnicians = technicians.filter(
    (t) => t.lastLatitude && t.lastLongitude,
  );

  const showInterventions = layer === 'interventions' || layer === 'both';
  const showTechnicians = layer === 'technicians' || layer === 'both';

  const allPositions: [number, number][] = [
    ...(showInterventions ? filteredInterventions.map((i) => [i.latitude!, i.longitude!] as [number, number]) : []),
    ...(showTechnicians ? filteredTechnicians.map((t) => [t.lastLatitude!, t.lastLongitude!] as [number, number]) : []),
  ];

  // Default center: France
  const defaultCenter: [number, number] = [46.6, 2.3];

  const STATUSES: InterventionStatus[] = ['pending', 'assigned', 'in_progress', 'done', 'issue', 'cancelled'];

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-border bg-bg-secondary px-4 py-2">
        <div className="flex items-center gap-1.5">
          <MapPin size={16} className="text-accent" />
          <h1 className="text-sm font-semibold text-text-primary">Carte</h1>
        </div>

        <div className="flex items-center gap-1 ml-4">
          {(['both', 'interventions', 'technicians'] as ViewLayer[]).map((l) => (
            <button
              key={l}
              onClick={() => setLayer(l)}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors',
                layer === l
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:bg-bg-hover',
              )}
            >
              {l === 'both' && 'Tout'}
              {l === 'interventions' && <><Clipboard size={12} /> Interventions</>}
              {l === 'technicians' && <><Wrench size={12} /> Techniciens</>}
            </button>
          ))}
        </div>

        {showInterventions && (
          <div className="flex items-center gap-1.5 ml-4">
            <Filter size={12} className="text-text-secondary" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InterventionStatus | '')}
              className="rounded-md border border-border bg-bg-tertiary px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Tous les statuts</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{INTERVENTION_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={handleGeocode}
          disabled={geocoding}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:text-accent hover:border-accent transition-colors disabled:opacity-50 ml-4"
        >
          <RefreshCw size={12} className={geocoding ? 'animate-spin' : ''} />
          Geocoder
        </button>

        <div className="ml-auto text-xs text-text-secondary">
          {showInterventions && `${filteredInterventions.length} intervention${filteredInterventions.length > 1 ? 's' : ''}`}
          {showInterventions && showTechnicians && ' · '}
          {showTechnicians && `${filteredTechnicians.length} technicien${filteredTechnicians.length > 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer
          center={defaultCenter}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {allPositions.length > 0 && <FitBounds positions={allPositions} />}

          {/* Intervention markers */}
          {showInterventions && filteredInterventions.map((intv) => (
            <Marker
              key={`intv-${intv.id}`}
              position={[intv.latitude!, intv.longitude!]}
              icon={createColorIcon(STATUS_COLORS[intv.status], 'pin')}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{intv.title}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {intv.clientName ?? 'Pas de client'}
                    {intv.assignedTechnicianName && ` · ${intv.assignedTechnicianName}`}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    <span style={{ color: STATUS_COLORS[intv.status], fontWeight: 500 }}>
                      {INTERVENTION_STATUS_LABELS[intv.status]}
                    </span>
                  </div>
                  {intv.address && (
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{intv.address}</div>
                  )}
                  <button
                    onClick={() => navigate(`/intervention/${intv.id}`)}
                    style={{
                      marginTop: 6, fontSize: 11, color: '#AEEA00',
                      background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
                    }}
                  >
                    Voir l'intervention
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Technician markers */}
          {showTechnicians && filteredTechnicians.map((tech) => (
            <Marker
              key={`tech-${tech.id}`}
              position={[tech.lastLatitude!, tech.lastLongitude!]}
              icon={createColorIcon(TECH_STATUS_COLORS[tech.status], 'circle')}
            >
              <Popup>
                <div style={{ minWidth: 150 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {tech.firstName} {tech.lastName}
                  </div>
                  {tech.company && (
                    <div style={{ fontSize: 12, color: '#888' }}>{tech.company}</div>
                  )}
                  <div style={{ fontSize: 11, marginTop: 4, color: TECH_STATUS_COLORS[tech.status] }}>
                    {tech.status === 'available' && 'Disponible'}
                    {tech.status === 'on_site' && 'Sur site'}
                    {tech.status === 'travelling' && 'En route'}
                    {tech.status === 'offline' && 'Hors ligne'}
                    {tech.status === 'on_break' && 'En pause'}
                  </div>
                  {tech.lastLocationAt && (
                    <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                      Derniere position : {new Date(tech.lastLocationAt).toLocaleString()}
                    </div>
                  )}
                  <button
                    onClick={() => navigate(`/technicians/${tech.id}`)}
                    style={{
                      marginTop: 6, fontSize: 11, color: '#AEEA00',
                      background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
                    }}
                  >
                    Voir le technicien
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Technician action radius circles */}
          {showTechnicians && showRadius && filteredTechnicians
            .filter((t) => t.actionRadiusKm && t.actionRadiusKm > 0)
            .map((tech) => (
              <Circle
                key={`radius-${tech.id}`}
                center={[tech.lastLatitude!, tech.lastLongitude!]}
                radius={tech.actionRadiusKm! * 1000}
                pathOptions={{
                  color: TECH_STATUS_COLORS[tech.status],
                  fillColor: TECH_STATUS_COLORS[tech.status],
                  fillOpacity: 0.08,
                  weight: 1,
                  dashArray: '4 4',
                }}
              />
            ))}
        </MapContainer>
      </div>
    </div>
  );
}
