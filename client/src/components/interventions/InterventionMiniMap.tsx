import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TimelineEvent } from '@oblifield/shared';

interface Props {
  latitude: number | null;
  longitude: number | null;
  timeline: TimelineEvent[];
}

function createCircleIcon(color: string, size = 14): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>`,
  });
}

// Offset overlapping points slightly so all are visible
function offsetPoints(points: { lat: number; lng: number; color: string; label: string }[]): typeof points {
  const THRESHOLD = 0.00005; // ~5m
  const result = [...points];
  for (let i = 1; i < result.length; i++) {
    for (let j = 0; j < i; j++) {
      const dx = Math.abs(result[i].lat - result[j].lat);
      const dy = Math.abs(result[i].lng - result[j].lng);
      if (dx < THRESHOLD && dy < THRESHOLD) {
        // Spiral offset
        const angle = (i * 2 * Math.PI) / 3;
        const offset = 0.00015;
        result[i] = {
          ...result[i],
          lat: result[i].lat + Math.cos(angle) * offset,
          lng: result[i].lng + Math.sin(angle) * offset,
        };
      }
    }
  }
  return result;
}

export function InterventionMiniMap({ latitude, longitude, timeline }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Collect points
    const points: { lat: number; lng: number; color: string; label: string }[] = [];

    if (latitude != null && longitude != null) {
      points.push({ lat: Number(latitude), lng: Number(longitude), color: '#3b82f6', label: 'Adresse intervention' });
    }

    const checkIn = timeline.find((e) => e.type === 'check_in' && e.latitude != null && e.longitude != null);
    if (checkIn) {
      points.push({ lat: Number(checkIn.latitude), lng: Number(checkIn.longitude), color: '#22c55e', label: 'Check-in' });
    }

    const checkOuts = timeline.filter((e) => e.type === 'check_out' && e.latitude != null && e.longitude != null);
    const lastCheckOut = checkOuts[0]; // timeline is ordered desc
    if (lastCheckOut) {
      points.push({ lat: Number(lastCheckOut.latitude), lng: Number(lastCheckOut.longitude), color: '#ef4444', label: 'Check-out' });
    }

    if (points.length === 0) return;

    // Destroy previous map
    if (leafletRef.current) {
      leafletRef.current.remove();
      leafletRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
    });
    leafletRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

    const offsetPts = offsetPoints(points);
    const markers: L.LatLng[] = [];

    for (const pt of offsetPts) {
      const marker = L.marker([pt.lat, pt.lng], { icon: createCircleIcon(pt.color) })
        .bindTooltip(pt.label, { direction: 'top', offset: [0, -10] })
        .addTo(map);
      markers.push(marker.getLatLng());
    }

    map.whenReady(() => {
      try {
        if (markers.length === 1) {
          map.setView(markers[0], 16);
        } else {
          map.fitBounds(L.latLngBounds(markers).pad(0.3));
        }
      } catch { /* map not ready */ }
    });

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, [latitude, longitude, timeline]);

  const hasData = (latitude != null && longitude != null) ||
    timeline.some((e) => (e.type === 'check_in' || e.type === 'check_out') && e.latitude != null);

  if (!hasData) return null;

  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
        Localisation
        <span className="flex items-center gap-3 text-[10px] font-normal text-text-muted">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-500" /> Adresse</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-500" /> Check-in</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-500" /> Check-out</span>
        </span>
      </h2>
      <div ref={mapRef} className="w-full h-48 rounded-lg border border-border overflow-hidden" />
    </div>
  );
}
