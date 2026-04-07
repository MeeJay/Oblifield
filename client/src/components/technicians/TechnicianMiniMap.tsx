import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  latitude: number | null;
  longitude: number | null;
  actionRadiusKm: number | null;
  name: string;
}

export function TechnicianMiniMap({ latitude, longitude, actionRadiusKm, name }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || latitude == null || longitude == null) return;

    if (leafletRef.current) {
      leafletRef.current.remove();
      leafletRef.current = null;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
    });
    leafletRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

    // Technician marker
    const icon = L.divIcon({
      className: '',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>',
    });
    L.marker([lat, lng], { icon }).bindTooltip(name, { direction: 'top', offset: [0, -10] }).addTo(map);

    // Action radius circle
    if (actionRadiusKm && actionRadiusKm > 0) {
      const circle = L.circle([lat, lng], {
        radius: actionRadiusKm * 1000,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: '6 4',
      }).addTo(map);
      map.fitBounds(circle.getBounds().pad(0.1));
    } else {
      map.setView([lat, lng], 14);
    }

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, [latitude, longitude, actionRadiusKm, name]);

  if (latitude == null || longitude == null) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
        Localisation
        {actionRadiusKm != null && actionRadiusKm > 0 && (
          <span className="text-[10px] font-normal text-text-muted">Rayon : {actionRadiusKm} km</span>
        )}
      </h3>
      <div ref={mapRef} className="w-full h-48 rounded-lg border border-border overflow-hidden" />
    </div>
  );
}
