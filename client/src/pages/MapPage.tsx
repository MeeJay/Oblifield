import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Filter, Wrench, Clipboard, RefreshCw, X, UserPlus } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
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

const TECH_STATUS_LABELS: Record<TechnicianStatus, string> = {
  available: 'Disponible',
  on_site: 'Sur site',
  travelling: 'En route',
  offline: 'Hors ligne',
  on_break: 'En pause',
};

// ── Haversine distance (km) ─────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Icon factories ──────────────────────────────────────────────────────────
function createColorIcon(color: string, shape: 'circle' | 'pin' = 'pin', size: 'sm' | 'md' | 'lg' = 'md'): L.DivIcon {
  const sizes = { sm: 10, md: shape === 'circle' ? 14 : 12, lg: 20 };
  const s = sizes[size];

  if (shape === 'circle') {
    return L.divIcon({
      className: '',
      html: `<div style="width:${s}px;height:${s}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
      iconSize: [s, s],
      iconAnchor: [s / 2, s / 2],
    });
  }
  return L.divIcon({
    className: '',
    html: `<div style="width:${s}px;height:${s}px;border-radius:50% 50% 50% 0;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);transform:rotate(-45deg);"></div>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s],
  });
}

function createSelectedIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;background:#AEEA00;border:3px solid white;box-shadow:0 0 8px rgba(174,234,0,0.6);transform:rotate(-45deg);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  });
}

function createEligibleTechIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:3px solid #AEEA00;box-shadow:0 0 8px rgba(174,234,0,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function createDimmedIcon(shape: 'circle' | 'pin'): L.DivIcon {
  if (shape === 'circle') {
    return L.divIcon({
      className: '',
      html: `<div style="width:10px;height:10px;border-radius:50%;background:#555;border:1px solid #777;opacity:0.4;"></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });
  }
  return L.divIcon({
    className: '',
    html: `<div style="width:10px;height:10px;border-radius:50% 50% 50% 0;background:#555;border:1px solid #777;opacity:0.4;transform:rotate(-45deg);"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 10],
  });
}

// ── FitBounds ───────────────────────────────────────────────────────────────
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

interface EligibleTech {
  tech: Technician;
  distanceKm: number;
  inRadius: boolean; // within the tech's action radius
}

export function MapPage() {
  const navigate = useNavigate();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [layer, setLayer] = useState<ViewLayer>('both');
  const [statusFilter, setStatusFilter] = useState<InterventionStatus | ''>('');
  const [geocoding, setGeocoding] = useState(false);
  const [showRadius] = useState(true);

  // Assignment mode
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
  const [assigning, setAssigning] = useState(false);

  const loadData = useCallback(async () => {
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
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Compute eligible technicians for selected intervention ────────────────
  const eligibleTechs: EligibleTech[] = (() => {
    if (!selectedIntervention?.latitude || !selectedIntervention?.longitude) return [];
    return technicians
      .filter((t) => t.lastLatitude && t.lastLongitude)
      .map((tech) => {
        const dist = haversineKm(
          selectedIntervention.latitude!,
          selectedIntervention.longitude!,
          tech.lastLatitude!,
          tech.lastLongitude!,
        );
        const inRadius = tech.actionRadiusKm ? dist <= tech.actionRadiusKm : true; // no radius = always eligible
        return { tech, distanceKm: dist, inRadius };
      })
      .filter((e) => e.inRadius)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  })();

  const eligibleTechIds = new Set(eligibleTechs.map((e) => e.tech.id));

  // ── Assign technician ─────────────────────────────────────────────────────
  const handleAssign = async (techId: number) => {
    if (!selectedIntervention) return;
    setAssigning(true);
    try {
      await interventionsApi.update(selectedIntervention.id, {
        assignedTechnicianId: techId,
        status: selectedIntervention.status === 'pending' ? 'assigned' : undefined,
      } as any);
      toast.success('Technicien assigne');
      setSelectedIntervention(null);
      await loadData();
    } catch {
      toast.error("Erreur lors de l'assignation");
    } finally {
      setAssigning(false);
    }
  };

  // ── Client-side geocoding ─────────────────────────────────────────────────
  async function nominatimGeocode(
    parts: { street?: string | null; city?: string | null; postalcode?: string | null; country?: string | null },
  ): Promise<{ lat: number; lng: number } | null> {
    try {
      const structured: Record<string, string> = { format: 'json', limit: '1' };
      if (parts.street) structured.street = parts.street;
      if (parts.city) structured.city = parts.city;
      if (parts.postalcode) structured.postalcode = parts.postalcode;
      if (parts.country) structured.country = parts.country;

      const params = new URLSearchParams(structured);
      let res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'User-Agent': 'Oblifield/1.0' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
      }

      const freeForm = [parts.street, parts.postalcode, parts.city, parts.country].filter(Boolean).join(', ');
      if (!freeForm) return null;
      await new Promise((r) => setTimeout(r, 1100));
      const params2 = new URLSearchParams({ q: freeForm, format: 'json', limit: '1' });
      res = await fetch(`https://nominatim.openstreetmap.org/search?${params2}`, {
        headers: { 'User-Agent': 'Oblifield/1.0' },
      });
      if (!res.ok) return null;
      const data2 = await res.json();
      if (!data2 || data2.length === 0) return null;
      return { lat: parseFloat(data2[0].lat), lng: parseFloat(data2[0].lon) };
    } catch { return null; }
  }

  const handleGeocode = async () => {
    setGeocoding(true);
    let geocoded = 0;
    const errors: string[] = [];

    try {
      const techsToGeocode = technicians.filter(
        (t) => (!t.lastLatitude || !t.lastLongitude) && (t.address || t.city || t.postalCode || t.country),
      );
      for (const t of techsToGeocode) {
        const result = await nominatimGeocode({
          street: t.address, city: t.city, postalcode: t.postalCode, country: t.country,
        });
        if (result) {
          await apiClient.post(`/technicians/${t.id}/location`, { latitude: result.lat, longitude: result.lng });
          geocoded++;
        } else {
          errors.push(`Technicien ${t.firstName} ${t.lastName}`);
        }
        await new Promise((r) => setTimeout(r, 1100));
      }

      const intvsToGeocode = interventions.filter(
        (i) => (!i.latitude || !i.longitude) && i.address,
      );
      for (const i of intvsToGeocode) {
        const result = await nominatimGeocode({ street: i.address });
        if (result) {
          await apiClient.put(`/interventions/${i.id}/geocode`, { latitude: result.lat, longitude: result.lng });
          geocoded++;
        } else {
          errors.push(`Intervention "${i.title}"`);
        }
        await new Promise((r) => setTimeout(r, 1100));
      }

      if (errors.length > 0) toast.error(`${errors.length} adresse(s) non trouvee(s)`);
      if (geocoded > 0) toast.success(`${geocoded} adresse${geocoded > 1 ? 's' : ''} geocodee${geocoded > 1 ? 's' : ''}`);

      await loadData();
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

  const isAssignMode = !!selectedIntervention;
  const showInterventions = layer === 'interventions' || layer === 'both';
  const showTechnicians = layer === 'technicians' || layer === 'both' || isAssignMode;

  const allPositions: [number, number][] = [
    ...(showInterventions ? filteredInterventions.map((i) => [i.latitude!, i.longitude!] as [number, number]) : []),
    ...(showTechnicians ? filteredTechnicians.map((t) => [t.lastLatitude!, t.lastLongitude!] as [number, number]) : []),
  ];

  const defaultCenter: [number, number] = [46.6, 2.3];
  const STATUSES: InterventionStatus[] = ['pending', 'assigned', 'in_progress', 'done', 'issue', 'cancelled'];

  return (
    <div className="flex h-full flex-col">
      {/* Assignment mode banner */}
      {isAssignMode && (
        <div className="flex items-center gap-3 border-b border-accent/30 bg-accent/10 px-4 py-2">
          <UserPlus size={16} className="text-accent" />
          <span className="text-sm font-medium text-accent">
            Assigner un technicien a : <strong>{selectedIntervention.title}</strong>
          </span>
          <span className="text-xs text-text-secondary">
            {eligibleTechs.length} technicien{eligibleTechs.length > 1 ? 's' : ''} eligible{eligibleTechs.length > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setSelectedIntervention(null)}
            className="ml-auto flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:text-red-400 hover:border-red-400 transition-colors"
          >
            <X size={12} />
            Annuler
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-border bg-bg-secondary px-4 py-2">
        <div className="flex items-center gap-1.5">
          <MapPin size={16} className="text-accent" />
          <h1 className="text-sm font-semibold text-text-primary">Carte</h1>
        </div>

        {!isAssignMode && (
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
        )}

        {showInterventions && !isAssignMode && (
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
          {showInterventions && !isAssignMode && `${filteredInterventions.length} intervention${filteredInterventions.length > 1 ? 's' : ''}`}
          {showInterventions && showTechnicians && !isAssignMode && ' · '}
          {showTechnicians && !isAssignMode && `${filteredTechnicians.length} technicien${filteredTechnicians.length > 1 ? 's' : ''}`}
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
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {allPositions.length > 0 && <FitBounds positions={allPositions} />}

          {/* ── Intervention markers ──────────────────────────────────────── */}
          {showInterventions && filteredInterventions.map((intv) => {
            const isSelected = selectedIntervention?.id === intv.id;
            const isDimmed = isAssignMode && !isSelected;

            return (
              <Marker
                key={`intv-${intv.id}`}
                position={[intv.latitude!, intv.longitude!]}
                icon={
                  isSelected
                    ? createSelectedIcon()
                    : isDimmed
                      ? createDimmedIcon('pin')
                      : createColorIcon(STATUS_COLORS[intv.status], 'pin')
                }
                eventHandlers={isDimmed ? {} : {}}
              >
                <Popup>
                  <div style={{ minWidth: 200 }}>
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
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                      <button
                        onClick={() => navigate(`/intervention/${intv.id}`)}
                        style={{
                          fontSize: 11, color: '#AEEA00',
                          background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
                        }}
                      >
                        Voir
                      </button>
                      {!isAssignMode && intv.latitude && intv.longitude && (
                        <button
                          onClick={() => {
                            setSelectedIntervention(intv);
                          }}
                          style={{
                            fontSize: 11, color: '#fff', background: '#AEEA00', border: 'none',
                            borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontWeight: 600,
                          }}
                        >
                          Assigner
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* ── Technician markers ────────────────────────────────────────── */}
          {showTechnicians && filteredTechnicians.map((tech) => {
            const eligible = eligibleTechs.find((e) => e.tech.id === tech.id);
            const isEligible = isAssignMode && eligibleTechIds.has(tech.id);
            const isDimmed = isAssignMode && !isEligible;

            const icon = isEligible
              ? createEligibleTechIcon(TECH_STATUS_COLORS[tech.status])
              : isDimmed
                ? createDimmedIcon('circle')
                : createColorIcon(TECH_STATUS_COLORS[tech.status], 'circle');

            return (
              <Marker
                key={`tech-${tech.id}`}
                position={[tech.lastLatitude!, tech.lastLongitude!]}
                icon={icon}
                zIndexOffset={isEligible ? 1000 : 0}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {tech.firstName} {tech.lastName}
                    </div>
                    {tech.company && (
                      <div style={{ fontSize: 12, color: '#888' }}>{tech.company}</div>
                    )}
                    <div style={{ fontSize: 11, marginTop: 4, color: TECH_STATUS_COLORS[tech.status] }}>
                      {TECH_STATUS_LABELS[tech.status]}
                    </div>
                    {tech.actionRadiusKm && (
                      <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                        Rayon : {tech.actionRadiusKm} km
                      </div>
                    )}
                    {eligible && (
                      <div style={{ fontSize: 11, marginTop: 4, color: '#AEEA00', fontWeight: 500 }}>
                        {eligible.distanceKm.toFixed(1)} km de l'intervention
                      </div>
                    )}
                    {isEligible && (
                      <button
                        onClick={() => handleAssign(tech.id)}
                        disabled={assigning}
                        style={{
                          marginTop: 8, fontSize: 12, color: '#000', background: '#AEEA00',
                          border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer',
                          fontWeight: 600, width: '100%', opacity: assigning ? 0.5 : 1,
                        }}
                      >
                        {assigning ? 'Assignation...' : 'Assigner ce technicien'}
                      </button>
                    )}
                    {!isAssignMode && (
                      <button
                        onClick={() => navigate(`/technicians/${tech.id}`)}
                        style={{
                          marginTop: 6, fontSize: 11, color: '#AEEA00',
                          background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
                        }}
                      >
                        Voir le technicien
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* ── Lines from intervention to eligible technicians ───────────── */}
          {isAssignMode && selectedIntervention?.latitude && selectedIntervention?.longitude &&
            eligibleTechs.map((e) => (
              <Polyline
                key={`line-${e.tech.id}`}
                positions={[
                  [selectedIntervention.latitude!, selectedIntervention.longitude!],
                  [e.tech.lastLatitude!, e.tech.lastLongitude!],
                ]}
                pathOptions={{
                  color: '#AEEA00',
                  weight: 1.5,
                  opacity: 0.5,
                  dashArray: '6 4',
                }}
              />
            ))
          }

          {/* ── Action radius circles ────────────────────────────────────── */}
          {showTechnicians && showRadius && filteredTechnicians
            .filter((t) => t.actionRadiusKm && t.actionRadiusKm > 0)
            .map((tech) => {
              const isEligible = isAssignMode && eligibleTechIds.has(tech.id);
              const isDimmed = isAssignMode && !isEligible;
              const baseColor = TECH_STATUS_COLORS[tech.status];
              return (
                <Circle
                  key={`radius-${tech.id}`}
                  center={[tech.lastLatitude!, tech.lastLongitude!]}
                  radius={tech.actionRadiusKm! * 1000}
                  pathOptions={{
                    color: isDimmed ? '#666' : isEligible ? '#AEEA00' : baseColor,
                    fillColor: isDimmed ? '#666' : isEligible ? '#AEEA00' : baseColor,
                    fillOpacity: isDimmed ? 0.04 : isEligible ? 0.15 : 0.12,
                    weight: isEligible ? 3 : 2,
                    dashArray: undefined,
                  }}
                />
              );
            })}
        </MapContainer>
      </div>
    </div>
  );
}
