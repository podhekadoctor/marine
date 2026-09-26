import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Rectangle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Zone } from '../types/api';

interface MarineMapProps {
  zones: Zone[];
  selectedZone: Zone | null;
  onSelectZone: (zone: Zone) => void;
}

// Forces Leaflet to recalculate its viewport dimensions inside CSS grid
function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 250);
  }, [map]);
  return null;
}

// Pans map smoothly when a zone is selected
function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 8, { duration: 1.2 });
  }, [center, map]);
  return null;
}

export const MarineMap: React.FC<MarineMapProps> = ({ zones, selectedZone, onSelectZone }) => {
  const defaultCenter: [number, number] = selectedZone
    ? selectedZone.coordinates
    : [17.15, 83.40];

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950">
      <MapContainer
        center={defaultCenter}
        zoom={7}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <MapResizeHandler />
        {selectedZone && <MapRecenter center={selectedZone.coordinates} />}

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {zones.map((z) => {
          const isSelected = selectedZone?.id === z.id;
          return (
            <React.Fragment key={z.id}>
              <Rectangle
                bounds={z.bounding_box}
                pathOptions={{
                  color: isSelected ? '#0d9488' : '#38bdf8',
                  weight: isSelected ? 3 : 1.5,
                  fillOpacity: isSelected ? 0.35 : 0.15,
                }}
                eventHandlers={{ click: () => onSelectZone(z) }}
              />
              <CircleMarker
                center={z.coordinates}
                radius={isSelected ? 9 : 6}
                pathOptions={{
                  color: isSelected ? '#14b8a6' : '#0284c7',
                  fillColor: isSelected ? '#2dd4bf' : '#38bdf8',
                  fillOpacity: 0.9,
                  weight: 2,
                }}
                eventHandlers={{ click: () => onSelectZone(z) }}
              >
                <Popup>
                  <div className="text-slate-900 font-sans p-1">
                    <p className="text-[10px] uppercase font-mono text-slate-500">{z.region}</p>
                    <p className="font-bold text-xs">{z.name}</p>
                    <p className="text-[11px] text-slate-700 mt-1">Depth: {z.depth_meters}m</p>
                    <p className="text-[11px] text-slate-700">Primary Risk: {z.primary_risk}</p>
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      <div className="absolute top-3 right-3 z-[400] bg-slate-900/90 border border-slate-800 px-3 py-1.5 text-[11px] font-mono text-teal-300 backdrop-blur pointer-events-none">
        SURFACE RADAR: ACTIVE | TELEMETRY STREAM ONLINE
      </div>
    </div>
  );
};