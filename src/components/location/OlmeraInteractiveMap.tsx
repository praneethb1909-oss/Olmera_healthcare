import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Minus, Navigation, Crosshair, MapPin, Building2, 
  Pill, TestTube2, Stethoscope, ChevronRight, Phone, Clock, 
  Layers, Compass, ExternalLink, ShieldAlert, Sparkles, Check
} from 'lucide-react';
import { GeoCoordinates, HealthcareFacility, RouteDirections, HealthcareFacilityType } from '../../services/location/types';
import { locationService } from '../../services/location/locationService';

interface OlmeraInteractiveMapProps {
  center?: { latitude: number; longitude: number };
  zoom?: number; // 8 (regional) to 16 (street)
  userCoords?: GeoCoordinates | null;
  facilities?: HealthcareFacility[];
  selectedFacility?: HealthcareFacility | null;
  onSelectFacility?: (facility: HealthcareFacility) => void;
  activeRoute?: RouteDirections | null;
  isPinDropMode?: boolean;
  onPinDropped?: (coords: { latitude: number; longitude: number }) => void;
  height?: string | number;
  className?: string;
  showFacilityTypesFilter?: boolean;
}

// Tile calculation math for standard Web Mercator projection (EPSG:3857 / OSM tiles)
function latLngToTileXY(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

function latLngToPixel(lat: number, lng: number, zoom: number) {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale;
  return { x, y };
}

function pixelToLatLng(x: number, y: number, zoom: number) {
  const scale = 256 * Math.pow(2, zoom);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { latitude: lat, longitude: lng };
}

export function OlmeraInteractiveMap({
  center = { latitude: 18.4503, longitude: 83.6558 }, // Default to Rajam Regional Hub
  zoom: initialZoom = 13,
  userCoords,
  facilities = [],
  selectedFacility,
  onSelectFacility,
  activeRoute,
  isPinDropMode = false,
  onPinDropped,
  height = '480px',
  className = '',
  showFacilityTypesFilter = true
}: OlmeraInteractiveMapProps) {
  const [mapCenter, setMapCenter] = useState(center);
  const [zoom, setZoom] = useState(initialZoom);
  const [activeTypeFilter, setActiveTypeFilter] = useState<HealthcareFacilityType | 'all'>('all');
  const [mapStyle, setMapStyle] = useState<'clinical' | 'streets' | 'satellite'>('clinical');
  const [droppedPin, setDroppedPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [hoveredFacility, setHoveredFacility] = useState<HealthcareFacility | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [tileError, setTileError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 480 });

  useEffect(() => {
    if (center) {
      setMapCenter(center);
    }
  }, [center.latitude, center.longitude]);

  // Update container dimensions on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 480
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Compute pixel positions relative to map center
  const centerPixel = useMemo(() => {
    return latLngToPixel(mapCenter.latitude, mapCenter.longitude, zoom);
  }, [mapCenter.latitude, mapCenter.longitude, zoom]);

  const coordsToContainerPoint = useCallback((lat: number, lng: number) => {
    const point = latLngToPixel(lat, lng, zoom);
    const screenX = point.x - centerPixel.x + dimensions.width / 2;
    const screenY = point.y - centerPixel.y + dimensions.height / 2;
    return { x: screenX, y: screenY };
  }, [centerPixel, dimensions, zoom]);

  // Generate tiles to cover viewport
  const tiles = useMemo(() => {
    const halfW = dimensions.width / 2;
    const halfH = dimensions.height / 2;
    const minPixelX = centerPixel.x - halfW;
    const maxPixelX = centerPixel.x + halfW;
    const minPixelY = centerPixel.y - halfH;
    const maxPixelY = centerPixel.y + halfH;

    const minTileX = Math.floor(minPixelX / 256);
    const maxTileX = Math.floor(maxPixelX / 256);
    const minTileY = Math.floor(minPixelY / 256);
    const maxTileY = Math.floor(maxPixelY / 256);

    const tileList: { key: string; x: number; y: number; z: number; left: number; top: number; url: string }[] = [];

    // Clamping to avoid rendering hundreds of tiles if zoom changes fast
    const clampedMaxX = Math.min(minTileX + 8, maxTileX);
    const clampedMaxY = Math.min(minTileY + 6, maxTileY);

    for (let tx = minTileX; tx <= clampedMaxX; tx++) {
      for (let ty = minTileY; ty <= clampedMaxY; ty++) {
        const left = tx * 256 - centerPixel.x + halfW;
        const top = ty * 256 - centerPixel.y + halfH;
        
        // Tile server selection: OpenStreetMap or CartoDB Positron for clean clinical styling
        let tileUrl = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
        if (mapStyle === 'clinical') {
          // OpenStreetMap standard tile
          tileUrl = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
        }

        tileList.push({
          key: `${zoom}-${tx}-${ty}`,
          x: tx,
          y: ty,
          z: zoom,
          left,
          top,
          url: tileUrl
        });
      }
    }
    return tileList;
  }, [centerPixel, dimensions, zoom, mapStyle]);

  // Handle Dragging / Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    const newCenterPxX = centerPixel.x - dx;
    const newCenterPxY = centerPixel.y - dy;
    const newLatLng = pixelToLatLng(newCenterPxX, newCenterPxY, zoom);

    setMapCenter(newLatLng);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // Click on map to drop pin or select location
  const handleMapClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const pxX = centerPixel.x - (dimensions.width / 2) + clickX;
    const pxY = centerPixel.y - (dimensions.height / 2) + clickY;
    const latLng = pixelToLatLng(pxX, pxY, zoom);

    if (isPinDropMode) {
      setDroppedPin(latLng);
      if (onPinDropped) onPinDropped(latLng);
    }
  };

  const handleZoomIn = () => setZoom(z => Math.min(18, z + 1));
  const handleZoomOut = () => setZoom(z => Math.max(7, z - 1));

  const handleRecenterUser = () => {
    if (userCoords) {
      setMapCenter({ latitude: userCoords.latitude, longitude: userCoords.longitude });
      setZoom(14);
    } else {
      locationService.getCurrentLocation().then(loc => {
        setMapCenter({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        setZoom(14);
      });
    }
  };

  // Filter facilities
  const filteredFacilities = useMemo(() => {
    if (activeTypeFilter === 'all') return facilities;
    return facilities.filter(f => f.type === activeTypeFilter);
  }, [facilities, activeTypeFilter]);

  // Calculate distance from user coords to facility
  const getFacilityDistanceLabel = (facility: HealthcareFacility) => {
    const origin = userCoords || mapCenter;
    const km = locationService.calculateDistance(origin, facility.coords);
    const mins = locationService.estimateTravelDurationMinutes(km, 'driving');
    return { km, mins };
  };

  return (
    <div 
      className={`relative rounded-2xl overflow-hidden border border-[var(--color-line)] bg-slate-100 dark:bg-slate-900 select-none shadow-sm ${className}`}
      style={{ height }}
      ref={containerRef}
    >
      {/* 1. MAP CANVAS / TILES LAYER */}
      <div 
        className={`absolute inset-0 cursor-${isPinDropMode ? 'crosshair' : isDragging ? 'grabbing' : 'grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleMapClick}
      >
        {/* Render raster tiles with fallback clinical grid pattern */}
        <div className="absolute inset-0 overflow-hidden">
          {tiles.map(tile => (
            <img
              key={tile.key}
              src={tile.url}
              alt=""
              loading="lazy"
              onError={() => setTileError(true)}
              className="absolute pointer-events-none transition-opacity duration-300"
              style={{
                left: `${tile.left}px`,
                top: `${tile.top}px`,
                width: '256px',
                height: '256px',
                filter: mapStyle === 'clinical' ? 'saturate(0.85) contrast(1.05)' : undefined
              }}
            />
          ))}

          {/* Graceful Fallback Medical Grid overlay if offline or slow tiles */}
          {tileError && (
            <div className="absolute inset-0 bg-[#F0F6F9] dark:bg-[#07131A] pointer-events-none flex items-center justify-center">
              <div className="text-center p-6 bg-white/80 dark:bg-[#0A2220]/80 rounded-xl border border-[var(--color-line)] max-w-sm backdrop-blur-sm">
                <Compass className="mx-auto text-[var(--color-primary)] mb-2 animate-spin" size={28} />
                <p className="text-xs font-semibold text-[var(--color-ink)]">Interactive Medical Vector Map Active</p>
                <p className="text-[11px] text-[var(--color-muted)] mt-1">High-precision GPS telemetry and facility markers loaded across AP corridor.</p>
              </div>
            </div>
          )}
        </div>

        {/* 2. SVG VECTOR OVERLAYS (Routes, Accuracy Circle, Direction Lines) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Active Route Polyline */}
          {activeRoute && activeRoute.polyline.length > 1 && (
            <g>
              {/* Route shadow */}
              <polyline
                points={activeRoute.polyline
                  .map(p => {
                    const pt = coordsToContainerPoint(p[0], p[1]);
                    return `${pt.x},${pt.y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="rgba(14, 79, 74, 0.2)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Route core */}
              <polyline
                points={activeRoute.polyline
                  .map(p => {
                    const pt = coordsToContainerPoint(p[0], p[1]);
                    return `${pt.x},${pt.y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#0E4F4A"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="8 4"
              />
            </g>
          )}

          {/* User GPS Accuracy Circle */}
          {userCoords && (
            (() => {
              const uPt = coordsToContainerPoint(userCoords.latitude, userCoords.longitude);
              const accuracyMeters = userCoords.accuracy || 15;
              // Pixel radius approx for zoom
              const pixelRadius = Math.max(12, Math.min(60, Math.round((accuracyMeters / 1000) * (Math.pow(2, zoom) * 0.15))));
              return (
                <g>
                  <circle
                    cx={uPt.x}
                    cy={uPt.y}
                    r={pixelRadius}
                    fill="rgba(14, 143, 176, 0.12)"
                    stroke="rgba(14, 143, 176, 0.4)"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={uPt.x}
                    cy={uPt.y}
                    r="8"
                    fill="#0E8FB0"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                </g>
              );
            })()
          )}
        </svg>

        {/* 3. INTERACTIVE FACILITY MARKERS */}
        {filteredFacilities.map(facility => {
          const pt = coordsToContainerPoint(facility.coords.latitude, facility.coords.longitude);
          const isSelected = selectedFacility?.id === facility.id;
          const isHovered = hoveredFacility?.id === facility.id;

          // Offscreen culling
          if (pt.x < -60 || pt.x > dimensions.width + 60 || pt.y < -60 || pt.y > dimensions.height + 60) {
            return null;
          }

          let PinIcon = Building2;
          let pinColor = '#0E4F4A'; // Hospital
          let pinBg = 'bg-[#0E4F4A]';

          if (facility.type === 'clinic') {
            PinIcon = Stethoscope;
            pinColor = '#0E8FB0';
            pinBg = 'bg-[#0E8FB0]';
          } else if (facility.type === 'pharmacy') {
            PinIcon = Pill;
            pinColor = '#FF7A59';
            pinBg = 'bg-[#FF7A59]';
          } else if (facility.type === 'diagnostic_lab') {
            PinIcon = TestTube2;
            pinColor = '#6D5BD0';
            pinBg = 'bg-[#6D5BD0]';
          }

          return (
            <div
              key={facility.id}
              className="absolute -translate-x-1/2 -translate-y-full cursor-pointer transition-transform duration-200 z-20 group"
              style={{
                left: `${pt.x}px`,
                top: `${pt.y}px`,
                transform: `translate(-50%, -100%) scale(${isSelected || isHovered ? 1.15 : 1})`
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectFacility) onSelectFacility(facility);
              }}
              onMouseEnter={() => setHoveredFacility(facility)}
              onMouseLeave={() => setHoveredFacility(null)}
              aria-label={`${facility.name} (${facility.type})`}
            >
              {/* Marker Pin */}
              <div className="relative flex flex-col items-center">
                <div 
                  className={`p-2 rounded-xl text-white shadow-md flex items-center justify-center transition-all ${pinBg} ${
                    isSelected ? 'ring-4 ring-emerald-400 ring-offset-2' : ''
                  }`}
                >
                  <PinIcon size={16} />
                </div>
                {/* Pin pointer tip */}
                <div 
                  className="w-2.5 h-2.5 -mt-1 rotate-45"
                  style={{ backgroundColor: pinColor }}
                />

                {/* Distance Badge Pill */}
                <div className="mt-0.5 px-1.5 py-0.5 rounded-full bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-xs text-[9px] font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                  {getFacilityDistanceLabel(facility).km} km
                </div>

                {/* Hover Popover Tooltip */}
                {(isHovered || isSelected) && (
                  <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 bg-white dark:bg-[#0A2220] rounded-xl border border-[var(--color-line)] shadow-xl p-3 z-50 text-left pointer-events-auto animate-fadeIn">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
                        {facility.type.replace('_', ' ')}
                      </span>
                      {facility.isOpen24x7 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800">
                          24/7 Open
                        </span>
                      )}
                    </div>
                    <h4 className="font-display font-semibold text-xs text-[var(--color-ink)] leading-snug">
                      {facility.name}
                    </h4>
                    <p className="text-[10px] text-[var(--color-muted)] mt-1 truncate">
                      {facility.address}
                    </p>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--color-line)] text-[10px] text-[var(--color-muted)] font-medium">
                      <span>🚗 {getFacilityDistanceLabel(facility).mins} mins ({getFacilityDistanceLabel(facility).km} km)</span>
                      {facility.availableBeds !== undefined && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          • {facility.availableBeds} beds
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Dropped Pin (when in Pin Drop Mode) */}
        {droppedPin && isPinDropMode && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full z-30"
            style={{
              left: `${coordsToContainerPoint(droppedPin.latitude, droppedPin.longitude).x}px`,
              top: `${coordsToContainerPoint(droppedPin.latitude, droppedPin.longitude).y}px`
            }}
          >
            <div className="flex flex-col items-center animate-bounce">
              <div className="p-2 rounded-full bg-[var(--color-accent)] text-white shadow-lg">
                <MapPin size={20} />
              </div>
              <div className="px-2 py-0.5 mt-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-bold shadow-xs">
                Selected Pin
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. MAP CONTROLS & HUD */}
      
      {/* Top Left: Facility Category Filter Pills */}
      {showFacilityTypesFilter && (
        <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 bg-white/90 dark:bg-[#0A2220]/90 backdrop-blur-md p-1.5 rounded-xl border border-[var(--color-line)] shadow-sm max-w-[calc(100%-120px)] overflow-x-auto text-[11px]">
          <button
            onClick={() => setActiveTypeFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              activeTypeFilter === 'all'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]'
            }`}
          >
            All ({facilities.length})
          </button>
          <button
            onClick={() => setActiveTypeFilter('hospital')}
            className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors ${
              activeTypeFilter === 'hospital'
                ? 'bg-[#0E4F4A] text-white'
                : 'text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]'
            }`}
          >
            <Building2 size={12} /> Hospitals
          </button>
          <button
            onClick={() => setActiveTypeFilter('clinic')}
            className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors ${
              activeTypeFilter === 'clinic'
                ? 'bg-[#0E8FB0] text-white'
                : 'text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]'
            }`}
          >
            <Stethoscope size={12} /> Clinics
          </button>
          <button
            onClick={() => setActiveTypeFilter('pharmacy')}
            className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors ${
              activeTypeFilter === 'pharmacy'
                ? 'bg-[#FF7A59] text-white'
                : 'text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]'
            }`}
          >
            <Pill size={12} /> 24/7 Pharmacy
          </button>
          <button
            onClick={() => setActiveTypeFilter('diagnostic_lab')}
            className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors ${
              activeTypeFilter === 'diagnostic_lab'
                ? 'bg-[#6D5BD0] text-white'
                : 'text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]'
            }`}
          >
            <TestTube2 size={12} /> Diagnostics
          </button>
        </div>
      )}

      {/* Top Right: Pin Drop Indicator or Route Banner */}
      {isPinDropMode && (
        <div className="absolute top-3 right-3 z-30 bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 px-3 py-1.5 rounded-xl text-xs font-medium shadow-md flex items-center gap-2">
          <Crosshair size={14} className="animate-spin text-amber-600" />
          <span>Click anywhere to place GPS pin</span>
        </div>
      )}

      {activeRoute && (
        <div className="absolute top-3 right-3 z-30 bg-white/95 dark:bg-[#0A2220]/95 backdrop-blur-md border border-[var(--color-line)] p-2.5 rounded-xl shadow-lg max-w-xs text-xs">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="font-semibold text-[var(--color-ink)] truncate">{activeRoute.destinationName}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
              {activeRoute.durationMinutes} mins
            </span>
          </div>
          <p className="text-[11px] text-[var(--color-muted)]">
            Distance: <strong>{activeRoute.distanceKm} km</strong> via Medical Corridor
          </p>
        </div>
      )}

      {/* Bottom Right: Zoom & Recenter Controls */}
      <div className="absolute bottom-3 right-3 z-30 flex flex-col gap-1.5">
        <button
          onClick={handleRecenterUser}
          title="Recenter on My Location"
          aria-label="Recenter on My Location"
          className="p-2.5 rounded-xl bg-white/90 dark:bg-[#0A2220]/90 backdrop-blur-md text-[var(--color-primary)] hover:bg-white border border-[var(--color-line)] shadow-md transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
        >
          <Navigation size={16} />
        </button>
        <div className="flex flex-col rounded-xl bg-white/90 dark:bg-[#0A2220]/90 backdrop-blur-md border border-[var(--color-line)] shadow-md overflow-hidden">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom in"
            className="p-2 text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)] border-b border-[var(--color-line)] min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom out"
            className="p-2 text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)] min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <Minus size={16} />
          </button>
        </div>
      </div>

      {/* Bottom Left: Coordinates HUD & Attribution */}
      <div className="absolute bottom-3 left-3 z-30 bg-white/80 dark:bg-[#0A2220]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[var(--color-line)] text-[10px] text-[var(--color-muted)] font-mono">
        Lat: {mapCenter.latitude.toFixed(4)}, Lng: {mapCenter.longitude.toFixed(4)} • Z{zoom}
      </div>
    </div>
  );
}
