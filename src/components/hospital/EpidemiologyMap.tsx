import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Layers, 
  AlertTriangle, 
  Filter, 
  Maximize2, 
  Building2, 
  Plus, 
  ShieldAlert, 
  Activity, 
  CheckCircle2, 
  X,
  Crosshair,
  Info
} from 'lucide-react';
import { EpidemiologyCase, HospitalInfo } from '../../types';

interface ClusterZone {
  id: string;
  name: string;
  district: string;
  ward?: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  zoneType: 'Vùng Đỏ' | 'Vùng Cam' | 'Vùng Vàng';
  caseCount: number;
  cases: EpidemiologyCase[];
  primaryDisease: string;
  summary: string;
}

interface EpidemiologyMapProps {
  epidemiologyCases: EpidemiologyCase[];
  hospitals?: HospitalInfo[];
  onAddCase?: (newCase: Omit<EpidemiologyCase, 'id'>) => void;
  onUpdateCaseStatus?: (caseId: string, newStatus: EpidemiologyCase['status']) => void;
}

export const EpidemiologyMap: React.FC<EpidemiologyMapProps> = ({
  epidemiologyCases,
  hospitals = [],
  onAddCase,
  onUpdateCaseStatus
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  // Filter and display states
  const [selectedDisease, setSelectedDisease] = useState<string>('all');
  const [selectedZoneType, setSelectedZoneType] = useState<string>('all');
  const [showAutoZones, setShowAutoZones] = useState<boolean>(true);
  const [showHospitals, setShowHospitals] = useState<boolean>(true);
  const [activeCaseDetails, setActiveCaseDetails] = useState<EpidemiologyCase | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Form for adding new case
  const [newCaseForm, setNewCaseForm] = useState({
    diseaseName: 'Sốt Xuất Huyết Dengue',
    district: 'TP. Quảng Ngãi',
    ward: 'Phường Nghĩa Lộ',
    lat: 15.1150,
    lng: 108.8020,
    severity: 'Nguy hiểm' as const,
    isContagious: true,
    status: 'Khoanh vùng đỏ' as const
  });

  // Unique diseases list
  const uniqueDiseases = useMemo(() => {
    const set = new Set(epidemiologyCases.map(c => c.diseaseName));
    return Array.from(set);
  }, [epidemiologyCases]);

  // Filtered cases
  const filteredCases = useMemo(() => {
    return epidemiologyCases.filter(c => {
      const matchDisease = selectedDisease === 'all' || c.diseaseName === selectedDisease;
      const matchZone = 
        selectedZoneType === 'all' ||
        (selectedZoneType === 'red' && c.status === 'Khoanh vùng đỏ') ||
        (selectedZoneType === 'orange' && c.status === 'Xác nhận') ||
        (selectedZoneType === 'yellow' && c.status === 'Nghi ngờ') ||
        (selectedZoneType === 'controlled' && c.status === 'Đã kiểm soát');
      return matchDisease && matchZone;
    });
  }, [epidemiologyCases, selectedDisease, selectedZoneType]);

  // Distance helper (Haversine formula in km)
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Automatic Cluster Zones Calculation from epidemiologyCases
  const clusterZones = useMemo<ClusterZone[]>(() => {
    const zones: ClusterZone[] = [];
    const visited = new Set<string>();

    epidemiologyCases.forEach(baseCase => {
      if (visited.has(baseCase.id)) return;

      // Group cases within 3.5km of baseCase
      const clusterGroup = epidemiologyCases.filter(c => {
        const dist = getDistanceKm(baseCase.lat, baseCase.lng, c.lat, c.lng);
        return dist <= 3.5;
      });

      clusterGroup.forEach(c => visited.add(c.id));

      // Calculate centroid
      const totalLat = clusterGroup.reduce((sum, c) => sum + c.lat, 0);
      const totalLng = clusterGroup.reduce((sum, c) => sum + c.lng, 0);
      const centerLat = totalLat / clusterGroup.length;
      const centerLng = totalLng / clusterGroup.length;

      // Determine severity & zone type
      const hasRedStatus = clusterGroup.some(c => c.status === 'Khoanh vùng đỏ');
      const hasDangerous = clusterGroup.some(c => c.severity === 'Nguy hiểm' || c.severity === 'Khẩn cấp');
      const hasConfirmed = clusterGroup.some(c => c.status === 'Xác nhận');

      let zoneType: 'Vùng Đỏ' | 'Vùng Cam' | 'Vùng Vàng' = 'Vùng Vàng';
      let radiusMeters = 1000;

      if (hasRedStatus || (hasDangerous && clusterGroup.length >= 2)) {
        zoneType = 'Vùng Đỏ';
        radiusMeters = Math.min(2800, 1500 + clusterGroup.length * 350);
      } else if (hasConfirmed || clusterGroup.length >= 2) {
        zoneType = 'Vùng Cam';
        radiusMeters = Math.min(2000, 1200 + clusterGroup.length * 250);
      } else {
        zoneType = 'Vùng Vàng';
        radiusMeters = 900;
      }

      // Main disease name
      const diseaseCounts: Record<string, number> = {};
      clusterGroup.forEach(c => {
        diseaseCounts[c.diseaseName] = (diseaseCounts[c.diseaseName] || 0) + 1;
      });
      const primaryDisease = Object.entries(diseaseCounts).sort((a, b) => b[1] - a[1])[0][0];

      zones.push({
        id: `zone-${baseCase.id}`,
        name: `Ổ dịch ${primaryDisease} (${baseCase.ward || baseCase.district})`,
        district: baseCase.district,
        ward: baseCase.ward,
        centerLat,
        centerLng,
        radiusMeters,
        zoneType,
        caseCount: clusterGroup.length,
        cases: clusterGroup,
        primaryDisease,
        summary: `${clusterGroup.length} ca ghi nhận - Đã tự động khoanh vùng bán kính ${(radiusMeters / 1000).toFixed(1)}km`
      });
    });

    return zones;
  }, [epidemiologyCases]);

  // Red zones and stats
  const redZonesCount = useMemo(() => clusterZones.filter(z => z.zoneType === 'Vùng Đỏ').length, [clusterZones]);
  const orangeZonesCount = useMemo(() => clusterZones.filter(z => z.zoneType === 'Vùng Cam').length, [clusterZones]);
  const yellowZonesCount = useMemo(() => clusterZones.filter(z => z.zoneType === 'Vùng Vàng').length, [clusterZones]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Create map centered on Quảng Ngãi city
      const map = L.map(mapContainerRef.current, {
        center: [15.1205, 108.7923],
        zoom: 11,
        zoomControl: false,
        attributionControl: false
      });

      // Add clean CartoDB Voyager / Positron tiles for smooth medical map
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }).addTo(map);

      // Custom Zoom control at top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Attribution
      L.control.attribution({ position: 'bottomright', prefix: 'Bản đồ Dịch tễ MedAssist' }).addTo(map);

      // Group layer for dynamic elements
      const layersGroup = L.layerGroup().addTo(map);
      layersGroupRef.current = layersGroup;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers and Clusters on map when cases or options change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layersGroup = layersGroupRef.current;
    if (!map || !layersGroup) return;

    layersGroup.clearLayers();

    // 1. RENDER AUTOMATIC CLUSTERING ZONES (Circles with radar/pulse styling)
    if (showAutoZones) {
      clusterZones.forEach(zone => {
        // Color mapping
        const isRed = zone.zoneType === 'Vùng Đỏ';
        const isOrange = zone.zoneType === 'Vùng Cam';

        const strokeColor = isRed ? '#e11d48' : isOrange ? '#ea580c' : '#eab308';
        const fillColor = isRed ? '#f43f5e' : isOrange ? '#fb923c' : '#fde047';
        const fillOpacity = isRed ? 0.22 : isOrange ? 0.16 : 0.12;

        const circle = L.circle([zone.centerLat, zone.centerLng], {
          color: strokeColor,
          weight: isRed ? 2.5 : 2,
          dashArray: isRed ? undefined : isOrange ? '6, 6' : '4, 4',
          fillColor: fillColor,
          fillOpacity: fillOpacity,
          radius: zone.radiusMeters
        });

        // Tooltip hover
        circle.bindTooltip(
          `<div class="p-1.5 text-xs font-sans">
            <div class="font-black ${isRed ? 'text-rose-700' : isOrange ? 'text-amber-700' : 'text-yellow-700'} flex items-center gap-1">
              <span>${isRed ? '🚨' : isOrange ? '⚠️' : '🟡'} ${zone.zoneType.toUpperCase()}: ${zone.primaryDisease}</span>
            </div>
            <div class="text-[11px] text-slate-700 font-semibold mt-0.5">${zone.name}</div>
            <div class="text-[10px] text-slate-500">${zone.summary}</div>
          </div>`,
          { sticky: true, opacity: 0.95 }
        );

        // Click popup
        circle.bindPopup(
          `<div class="p-3 text-xs font-sans space-y-2 min-w-[220px]">
            <div class="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span class="px-2 py-0.5 rounded font-black text-[10px] ${
                isRed ? 'bg-rose-100 text-rose-800' : isOrange ? 'bg-amber-100 text-amber-800' : 'bg-yellow-100 text-yellow-800'
              }">${zone.zoneType} TỰ ĐỘNG</span>
              <span class="font-mono font-bold text-slate-500 text-[11px]">${zone.caseCount} ca bệnh</span>
            </div>
            <h4 class="font-bold text-slate-900 text-sm">${zone.name}</h4>
            <p class="text-[11px] text-slate-600">
              Khu vực: <strong>${zone.ward ? `${zone.ward}, ` : ''}${zone.district}</strong>
            </p>
            <p class="text-[11px] text-slate-600">
              Bán kính cách ly & khoanh vùng giám sát: <strong class="text-rose-600 font-mono">${(zone.radiusMeters / 1000).toFixed(1)} km</strong>
            </p>
            <div class="pt-1 border-t border-slate-100 text-[10px] text-slate-500 italic">
              Thuật toán tự động nhóm ca bệnh dựa trên tọa độ GPS và mức độ lây truyền.
            </div>
          </div>`,
          { className: 'custom-leaflet-popup' }
        );

        circle.addTo(layersGroup);
      });
    }

    // 2. RENDER INDIVIDUAL CASE MARKERS
    filteredCases.forEach(caseItem => {
      const isRed = caseItem.status === 'Khoanh vùng đỏ';
      const isConfirmed = caseItem.status === 'Xác nhận';
      const isControlled = caseItem.status === 'Đã kiểm soát';

      const pulseClass = isRed ? 'map-marker-pulse-red' : isConfirmed ? 'map-marker-pulse-orange' : '';
      const bgColor = isRed ? 'bg-rose-600' : isConfirmed ? 'bg-amber-600' : isControlled ? 'bg-emerald-600' : 'bg-yellow-500';

      const customIcon = L.divIcon({
        className: 'custom-case-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer">
            <div class="w-7 h-7 rounded-full ${bgColor} ${pulseClass} text-white flex items-center justify-center shadow-lg border-2 border-white font-bold text-[11px] transition-transform hover:scale-125">
              ${isRed ? '!' : isControlled ? '✓' : '●'}
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([caseItem.lat, caseItem.lng], { icon: customIcon });

      marker.bindPopup(
        `<div class="p-3 text-xs font-sans space-y-2 min-w-[240px]">
          <div class="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span class="font-bold text-slate-800">${caseItem.diseaseName}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-black ${
              isRed ? 'bg-rose-100 text-rose-800' : isConfirmed ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }">${caseItem.status}</span>
          </div>
          <div>
            <p class="text-slate-500 text-[11px]">Địa bàn ghi nhận:</p>
            <p class="font-semibold text-slate-800">${caseItem.ward ? `${caseItem.ward}, ` : ''}${caseItem.district}</p>
            <p class="text-slate-400 font-mono text-[10px] mt-0.5">Tọa độ: ${caseItem.lat.toFixed(4)}, ${caseItem.lng.toFixed(4)}</p>
          </div>
          <div class="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
            <span>Thời gian báo cáo:</span>
            <span class="font-medium">${new Date(caseItem.reportedAt).toLocaleDateString('vi-VN')}</span>
          </div>
          <div class="pt-2">
            <button 
              id="btn-view-case-${caseItem.id}"
              class="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer text-center"
            >
              Xem Chi Tiết & Cập Nhật
            </button>
          </div>
        </div>`,
        { className: 'custom-leaflet-popup' }
      );

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-view-case-${caseItem.id}`);
        if (btn) {
          btn.onclick = () => {
            setActiveCaseDetails(caseItem);
          };
        }
      });

      marker.addTo(layersGroup);
    });

    // 3. RENDER HOSPITALS LAYER (Green Medical Crosses)
    if (showHospitals && hospitals.length > 0) {
      hospitals.forEach(hosp => {
        const hospIcon = L.divIcon({
          className: 'custom-hosp-marker',
          html: `
            <div class="relative flex items-center justify-center cursor-pointer">
              <div class="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg border-2 border-white transition-transform hover:scale-125">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 6v12m-6-6h12"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([hosp.lat, hosp.lng], { icon: hospIcon });

        marker.bindPopup(
          `<div class="p-3 text-xs font-sans space-y-2 min-w-[250px]">
            <div class="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span class="font-extrabold text-emerald-800 text-xs">${hosp.type}</span>
            </div>
            <h4 class="font-bold text-slate-900 text-sm leading-tight">${hosp.name}</h4>
            <p class="text-slate-600 text-[11px] leading-relaxed">${hosp.address}</p>
            <div class="pt-1.5 border-t border-slate-100 space-y-1 text-[11px]">
              <div class="flex justify-between">
                <span class="text-slate-500">Hotline:</span>
                <strong class="text-emerald-700 font-mono">${hosp.hotline}</strong>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Cấp cứu 115:</span>
                <strong class="text-rose-600 font-mono">${hosp.emergencyPhone}</strong>
              </div>
            </div>
          </div>`,
          { className: 'custom-leaflet-popup' }
        );

        marker.addTo(layersGroup);
      });
    }
  }, [filteredCases, clusterZones, showAutoZones, showHospitals, hospitals]);

  // Fit all markers in view
  const handleFitBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points: L.LatLngExpression[] = [];
    filteredCases.forEach(c => points.push([c.lat, c.lng]));
    if (showHospitals) {
      hospitals.forEach(h => points.push([h.lat, h.lng]));
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else {
      map.setView([15.1205, 108.7923], 11);
    }
  };

  // Fly to specific case
  const handleFlyToCase = (c: EpidemiologyCase) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([c.lat, c.lng], 15, { duration: 1.2 });
    setActiveCaseDetails(c);
  };

  // Submit new case form
  const handleCreateCaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddCase) return;

    onAddCase({
      diseaseName: newCaseForm.diseaseName,
      reportedAt: new Date().toISOString(),
      district: newCaseForm.district,
      ward: newCaseForm.ward,
      lat: Number(newCaseForm.lat),
      lng: Number(newCaseForm.lng),
      severity: newCaseForm.severity,
      isContagious: newCaseForm.isContagious,
      status: newCaseForm.status
    });

    setIsAddModalOpen(false);

    // Pan map to newly added case
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([Number(newCaseForm.lat), Number(newCaseForm.lng)], 14);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Toolbar with Filter and Live Hotspot Stats */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors duration-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                Hệ Thống GIS Giám Sát Dịch Tễ Học
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Leaflet OpenStreetMap
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
              Bản Đồ Điểm Nóng & Tự Động Khoanh Vùng Dịch Tễ Tỉnh Quảng Ngãi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hệ thống tự động phân tích tọa độ GPS của các ca bệnh truyền nhiễm, thuật toán bán kính tự động khoanh vùng đỏ/cam phục vụ Ban Chỉ Đạo CDC & Bệnh viện.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleFitBounds}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Căn chỉnh toàn bộ bản đồ bao phủ các điểm ca bệnh"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Toàn Tỉnh</span>
            </button>

            {onAddCase && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Ca Bệnh Mới</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Cluster Metrics Counter */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between">
            <div>
              <span className="text-rose-700 dark:text-rose-400 font-bold block text-[11px]">Ổ Dịch Vùng Đỏ</span>
              <strong className="text-rose-900 dark:text-rose-200 text-lg font-black">{redZonesCount}</strong>
              <span className="text-rose-600 dark:text-rose-400 text-[10px] block">Khoanh vùng nguy cơ cao</span>
            </div>
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping"></span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between">
            <div>
              <span className="text-amber-700 dark:text-amber-400 font-bold block text-[11px]">Vùng Cảnh Báo Cam</span>
              <strong className="text-amber-900 dark:text-amber-200 text-lg font-black">{orangeZonesCount}</strong>
              <span className="text-amber-600 dark:text-amber-400 text-[10px] block">Ghi nhận cụm ca lây lan</span>
            </div>
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>

          <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-900/40 flex items-center justify-between">
            <div>
              <span className="text-yellow-700 dark:text-yellow-400 font-bold block text-[11px]">Vùng Giám Sát Vàng</span>
              <strong className="text-yellow-900 dark:text-yellow-200 text-lg font-black">{yellowZonesCount}</strong>
              <span className="text-yellow-600 dark:text-yellow-400 text-[10px] block">Ca nghi nhiễm cần test</span>
            </div>
            <Activity className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          </div>

          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between">
            <div>
              <span className="text-blue-700 dark:text-blue-400 font-bold block text-[11px]">Tổng Ca Dịch Tễ</span>
              <strong className="text-blue-900 dark:text-blue-200 text-lg font-black">{epidemiologyCases.length}</strong>
              <span className="text-blue-600 dark:text-blue-400 text-[10px] block">Đang hiển thị {filteredCases.length}</span>
            </div>
            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Disease Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Bệnh:</span>
              <select
                value={selectedDisease}
                onChange={(e) => setSelectedDisease(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="all" className="dark:bg-slate-900">Tất cả bệnh truyền nhiễm ({epidemiologyCases.length})</option>
                {uniqueDiseases.map(d => (
                  <option key={d} value={d} className="dark:bg-slate-900">{d}</option>
                ))}
              </select>
            </div>

            {/* Zone Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Phân cấp:</span>
              <select
                value={selectedZoneType}
                onChange={(e) => setSelectedZoneType(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="all" className="dark:bg-slate-900">Tất cả mức độ</option>
                <option value="red" className="dark:bg-slate-900">🔴 Chỉ Ổ Dịch Vùng Đỏ</option>
                <option value="orange" className="dark:bg-slate-900">🟠 Chỉ Vùng Cảnh Báo Cam</option>
                <option value="yellow" className="dark:bg-slate-900">🟡 Chỉ Ca Nghi Ngờ Vàng</option>
                <option value="controlled" className="dark:bg-slate-900">🟢 Đã Kiểm Soát Xong</option>
              </select>
            </div>
          </div>

          {/* Layer toggles */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer select-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors">
              <input
                type="checkbox"
                checked={showAutoZones}
                onChange={(e) => setShowAutoZones(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <span className="font-semibold text-[11px]">Vòng Khoanh Vùng Tự Động</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors">
              <input
                type="checkbox"
                checked={showHospitals}
                onChange={(e) => setShowHospitals(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="font-semibold text-[11px]">Cơ Sở Bệnh Viện ({hospitals.length})</span>
            </label>
          </div>
        </div>
      </div>

      {/* 2. Main Leaflet Map Container */}
      <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-900">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Legend Overlay on Map (Top-Left) */}
        <div className="absolute top-3 left-3 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg text-[11px] space-y-1.5 max-w-[220px]">
          <span className="font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider block text-[10px]">
            Chú Giải Bản Đồ:
          </span>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-600 border border-white shadow-xs shrink-0 animate-ping"></span>
            <span>Ổ Dịch Đỏ (Bán kính 1.5 - 2.8km)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <span className="w-3 h-3 rounded-full bg-amber-500 border border-white shadow-xs shrink-0"></span>
            <span>Vùng Cam (Cụm ca xác nhận)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <span className="w-3 h-3 rounded-full bg-yellow-500 border border-white shadow-xs shrink-0"></span>
            <span>Vùng Vàng (Ca nghi nhiễm)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <span className="w-3.5 h-3.5 rounded bg-emerald-600 text-white flex items-center justify-center font-bold text-[9px] shrink-0">
              +
            </span>
            <span>Bệnh Viện & Trung Tâm Y Tế</span>
          </div>
        </div>

        {/* Quick Fly-To Cluster Drawer (Bottom-Left) */}
        <div className="absolute bottom-3 left-3 right-3 z-10 overflow-x-auto pb-1 flex items-center gap-2 pointer-events-auto">
          {clusterZones.map(zone => (
            <button
              key={zone.id}
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo([zone.centerLat, zone.centerLng], 14, { duration: 1 });
                }
              }}
              className={`shrink-0 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-md backdrop-blur-md flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer ${
                zone.zoneType === 'Vùng Đỏ'
                  ? 'bg-rose-600/90 hover:bg-rose-600 text-white border-rose-300'
                  : zone.zoneType === 'Vùng Cam'
                  ? 'bg-amber-600/90 hover:bg-amber-600 text-white border-amber-300'
                  : 'bg-white/95 hover:bg-white text-slate-800 border-slate-200'
              }`}
            >
              <span>{zone.zoneType === 'Vùng Đỏ' ? '🚨' : '⚠️'}</span>
              <span>{zone.district}: {zone.caseCount} ca</span>
              <span className="text-[10px] opacity-80">({(zone.radiusMeters / 1000).toFixed(1)}km)</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Detailed Cluster Zones Table & Recent Events Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Automated Quarantine Zones Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-rose-600" />
              <span>Danh Sách Vùng Khoanh Tự Động Theo Thuật Toán GIS</span>
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {clusterZones.length} Cụm Dịch Tễ
            </span>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="px-3 py-2 text-left">Phân Vùng</th>
                  <th className="px-3 py-2 text-left">Tên Cụm Ổ Dịch & Địa Bàn</th>
                  <th className="px-3 py-2 text-center">Số Ca</th>
                  <th className="px-3 py-2 text-left">Bán Kính Khoanh Vùng</th>
                  <th className="px-3 py-2 text-right">Định Vị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {clusterZones.map(zone => (
                  <tr key={zone.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                        zone.zoneType === 'Vùng Đỏ' ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 animate-pulse' :
                        zone.zoneType === 'Vùng Cam' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800' : 'bg-yellow-100 dark:bg-yellow-950/80 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800'
                      }`}>
                        {zone.zoneType}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-bold text-slate-900 dark:text-white">{zone.primaryDisease}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">{zone.ward ? `${zone.ward}, ` : ''}{zone.district}</p>
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                      {zone.caseCount}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-rose-700 dark:text-rose-400 font-bold">
                      {(zone.radiusMeters / 1000).toFixed(1)} km
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => {
                          if (mapInstanceRef.current) {
                            mapInstanceRef.current.flyTo([zone.centerLat, zone.centerLng], 14);
                          }
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                      >
                        Bay Đến
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Raw Cases Feed with Fly-To */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Dòng Sự Kiện Ca Bệnh Mới</span>
            </h4>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              {filteredCases.length} ca
            </span>
          </div>

          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {filteredCases.slice(0, 8).map(c => (
              <div
                key={c.id}
                onClick={() => handleFlyToCase(c)}
                className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 dark:text-white">{c.diseaseName}</strong>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    c.status === 'Khoanh vùng đỏ' ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800' :
                    c.status === 'Xác nhận' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800' :
                    c.status === 'Đã kiểm soát' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800' : 'bg-yellow-100 dark:bg-yellow-950/80 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800'
                  }`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  {c.ward ? `${c.ward}, ` : ''}{c.district}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono pt-0.5">
                  <span>{new Date(c.reportedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5">
                    <Crosshair className="w-3 h-3" />
                    Chỉ Tọa Độ
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Case Details Modal */}
      {activeCaseDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-600"></span>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Chi Tiết Hồ Sơ Dịch Tễ</h4>
              </div>
              <button
                onClick={() => setActiveCaseDetails(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Mã ca bệnh:</span>
                <strong className="font-mono text-slate-800 dark:text-slate-200">{activeCaseDetails.id}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Bệnh truyền nhiễm:</span>
                <strong className="text-slate-900 dark:text-white">{activeCaseDetails.diseaseName}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Địa bàn ghi nhận:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {activeCaseDetails.ward ? `${activeCaseDetails.ward}, ` : ''}{activeCaseDetails.district}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Tọa độ GPS:</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                  {activeCaseDetails.lat.toFixed(4)}, {activeCaseDetails.lng.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Mức độ nguy cơ:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">{activeCaseDetails.severity}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Trạng thái xử lý:</span>
                <span className="px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  {activeCaseDetails.status}
                </span>
              </div>
            </div>

            {/* Quick Status Update Buttons */}
            {onUpdateCaseStatus && (
              <div className="pt-2 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">Điều chuyển trạng thái:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => {
                      onUpdateCaseStatus(activeCaseDetails.id, 'Đã kiểm soát');
                      setActiveCaseDetails(null);
                    }}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors cursor-pointer text-center"
                  >
                    ✓ Đã Kiểm Soát
                  </button>
                  <button
                    onClick={() => {
                      onUpdateCaseStatus(activeCaseDetails.id, 'Khoanh vùng đỏ');
                      setActiveCaseDetails(null);
                    }}
                    className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors cursor-pointer text-center"
                  >
                    🚨 Khoanh Vùng Đỏ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Thêm Ca Bệnh Dịch Tễ Mới */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-black text-slate-900 dark:text-white text-base">Ghi Nhận Ca Bệnh Dịch Tễ Mới</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tự động cập nhật tọa độ vào bản đồ Leaflet & vẽ lại vòng khoanh vùng</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCaseSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Loại Bệnh Truyền Nhiễm:</label>
                <select
                  value={newCaseForm.diseaseName}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, diseaseName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value="Sốt Xuất Huyết Dengue">Sốt Xuất Huyết Dengue</option>
                  <option value="Bệnh Tay Chân Miệng">Bệnh Tay Chân Miệng</option>
                  <option value="Cúm Mùa / Cúm A">Cúm Mùa / Cúm A</option>
                  <option value="Viêm Phổi Virus">Viêm Phổi Virus</option>
                  <option value="Sốt Phát Ban / Sởi">Sốt Phát Ban / Sởi</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Huyện / Thị Xã:</label>
                  <select
                    value={newCaseForm.district}
                    onChange={(e) => {
                      const d = e.target.value;
                      // approximate coordinates per district
                      let lat = 15.1205;
                      let lng = 108.7923;
                      if (d === 'Huyện Bình Sơn') { lat = 15.2875; lng = 108.7410; }
                      else if (d === 'Thị xã Đức Phổ') { lat = 14.8050; lng = 108.9950; }
                      else if (d === 'Huyện Sơn Tịnh') { lat = 15.1600; lng = 108.7600; }
                      else if (d === 'Huyện Tư Nghĩa') { lat = 15.0850; lng = 108.8150; }
                      else if (d === 'Huyện Nghĩa Hành') { lat = 15.0420; lng = 108.7450; }
                      setNewCaseForm({ ...newCaseForm, district: d, lat, lng });
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="TP. Quảng Ngãi">TP. Quảng Ngãi</option>
                    <option value="Huyện Bình Sơn">Huyện Bình Sơn</option>
                    <option value="Huyện Sơn Tịnh">Huyện Sơn Tịnh</option>
                    <option value="Huyện Tư Nghĩa">Huyện Tư Nghĩa</option>
                    <option value="Thị xã Đức Phổ">Thị xã Đức Phổ</option>
                    <option value="Huyện Nghĩa Hành">Huyện Nghĩa Hành</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Xã / Phường / Khu Phố:</label>
                  <input
                    type="text"
                    value={newCaseForm.ward}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, ward: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200"
                    placeholder="VD: Phường Nghĩa Chánh"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tọa độ Vĩ độ (Lat):</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newCaseForm.lat}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tọa độ Kinh độ (Lng):</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newCaseForm.lng}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Mức Độ Nguy Cơ:</label>
                  <select
                    value={newCaseForm.severity}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, severity: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="Thấp">Thấp</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Nguy hiểm">Nguy hiểm</option>
                    <option value="Khẩn cấp">Khẩn cấp</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Trạng Thái Ban Đầu:</label>
                  <select
                    value={newCaseForm.status}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, status: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="Khoanh vùng đỏ">Khoanh vùng đỏ</option>
                    <option value="Xác nhận">Xác nhận</option>
                    <option value="Nghi ngờ">Nghi ngờ</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md transition-colors cursor-pointer"
                >
                  Lưu & Tự Động Khoanh Vùng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
