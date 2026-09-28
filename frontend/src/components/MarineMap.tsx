import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Rectangle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Zone } from '../types/api';
import { Compass, Radio } from 'lucide-react';

interface MarineMapProps {
  zones: Zone[];
  selectedZone: Zone | null;
  onSelectZone: (zone: Zone) => void;
}

function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function MapRecenter({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(coords, { animate: true, duration: 0.8 });
  }, [coords, map]);
  return null;
}

export const MarineMap: React.FC<MarineMapProps> = ({
  zones,
  selectedZone,
  onSelectZone,
}) => {
  const defaultCenter: [number, number] = [27.7, -97.1];

  return (
    <div className="relative w-full h-full min-h-[440px] bg-[var(--abyss)] border border-[#123a45] rounded-2xl overflow-hidden flex flex-col">
      {/* Map header */}
      <div className="bg-[var(--deep)]/90 backdrop-blur-sm border-b border-[#123a45] px-3 py-2 flex items-center justify-between z-[400] text-xs">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <Compass className="w-3.5 h-3.5 text-[var(--current)]" />
          <span className="text-[11px] font-medium">
            Survey map
          </span>
          <span className="text-[var(--text-dim)]">·</span>
          <span className="font-mono text-[var(--text-secondary)] text-[11px]">
            {selectedZone
              ? `${selectedZone.coordinates[0].toFixed(4)}°N, ${Math.abs(selectedZone.coordinates[1]).toFixed(4)}°W`
              : "27.7000°N, 97.1000°W"}
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-[var(--kelp)]" />
            {zones.length} buoys active
          </span>
        </div>
      </div>

      {/* Interactive map viewport */}
      <div className="relative flex-1 w-full h-full">
        <MapContainer
          center={defaultCenter}
          zoom={9}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <MapResizeHandler />
          {selectedZone && <MapRecenter coords={selectedZone.coordinates} />}

          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
          />

          {zones.map((zone) => {
            const isSelected = selectedZone?.id === zone.id;

            return (
              <React.Fragment key={zone.id}>
                {/* Sector bounding area */}
                <Rectangle
                  bounds={zone.bounding_box}
                  pathOptions={{
                    color: isSelected ? '#1f8fa3' : '#1e4a54',
                    weight: isSelected ? 1.5 : 1,
                    dashArray: isSelected ? '4, 4' : '2, 3',
                    fillColor: isSelected ? '#15697a' : '#0f4552',
                    fillOpacity: isSelected ? 0.22 : 0.1,
                  }}
                  eventHandlers={{
                    click: () => onSelectZone(zone),
                  }}
                />

                {/* Buoy sensor marker */}
                <CircleMarker
                  center={zone.coordinates}
                  radius={isSelected ? 7 : 5}
                  pathOptions={{
                    color: isSelected ? '#f2f8f6' : '#2d7d94',
                    fillColor: isSelected ? '#1f8fa3' : '#15697a',
                    fillOpacity: 1,
                    weight: isSelected ? 2 : 1.5,
                  }}
                  eventHandlers={{
                    click: () => onSelectZone(zone),
                  }}
                >
                  <Popup>
                    <div className="text-xs text-[var(--sea-mist)] space-y-1.5 min-w-[210px]">
                      <div className="flex items-center justify-between border-b border-[#1e4a54] pb-1">
                        <span className="font-semibold text-[var(--foam)] tracking-wide">{zone.name}</span>
                        <span className="font-mono text-[10px] text-[var(--current)]">{zone.id}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] pt-0.5">
                        <span className="text-[var(--text-secondary)]">Station depth:</span>
                        <span className="font-mono text-right text-[var(--foam)]">{zone.depth_meters} m</span>
                        <span className="text-[var(--text-secondary)]">Baseline temp.:</span>
                        <span className="font-mono text-right text-[var(--foam)]">{zone.baseline_sst_celsius}°C</span>
                        <span className="text-[var(--text-secondary)]">Baseline oxygen:</span>
                        <span className="font-mono text-right text-[var(--foam)]">{zone.baseline_do_mg_l} mg/L</span>
                        <span className="text-[var(--text-secondary)]">Baseline chl-a:</span>
                        <span className="font-mono text-right text-[var(--foam)]">{zone.baseline_chl_a} mg/m³</span>
                        <span className="text-[var(--text-secondary)]">Watching for:</span>
                        <span className="font-mono text-right text-[var(--sand)] capitalize">{zone.primary_risk}</span>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-[400] bg-[var(--deep)]/95 border border-[#1e4a54] p-2.5 rounded-xl text-[11px] space-y-1.5 shadow-lg backdrop-blur-sm pointer-events-auto">
          <div className="font-medium text-[var(--text-secondary)] text-[10px] pb-1 border-b border-[#153e48]">
            Map key
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--current)] border border-white inline-block"></span>
            <span className="text-[var(--sea-mist)]">Selected station</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--surface-water)] border border-[#2d7d94] inline-block"></span>
            <span className="text-[var(--text-secondary)]">Buoy station</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-2 border border-dashed border-[var(--current)] bg-[var(--surface-water)]/30 inline-block"></span>
            <span className="text-[var(--text-secondary)]">Survey area</span>
          </div>
        </div>
      </div>
    </div>
  );
};
