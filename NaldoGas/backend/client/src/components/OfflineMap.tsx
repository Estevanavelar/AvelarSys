import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  type: "delivery" | "customer" | "warehouse";
}

interface OfflineMapProps {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (marker: MapMarker) => void;
  height?: string;
}

/**
 * Componente de Mapa Offline usando OpenStreetMap e Leaflet
 * Funciona sem dependência do Google Maps
 */
export default function OfflineMap({
  markers = [],
  center = [-20.3155, -40.2806], // Vila Velha, ES, Brasil
  zoom = 13,
  onMarkerClick,
  height = "500px",
}: OfflineMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  // Ícones customizados para diferentes tipos de marcadores
  const getIcon = (type: "delivery" | "customer" | "warehouse") => {
    const colors = {
      delivery: "#ef4444", // Vermelho para entregas
      customer: "#3b82f6", // Azul para clientes
      warehouse: "#8b5cf6", // Roxo para depósito
    };

    return L.divIcon({
      html: `
        <div style="
          background-color: ${colors[type]};
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          color: white;
          font-weight: bold;
          font-size: 18px;
        ">
          ${type === "delivery" ? "🚚" : type === "customer" ? "👤" : "📦"}
        </div>
      `,
      className: "custom-marker",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });
  };

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current) return;

    // Criar mapa
    map.current = L.map(mapContainer.current).setView(center, zoom);

    // Adicionar camada de tiles do OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 10,
    }).addTo(map.current);

    // Adicionar marcador do depósito (Vila Velha, ES)
    const warehouseMarker = L.marker([-20.3155, -40.2806], {
      icon: getIcon("warehouse"),
    })
      .bindPopup("<strong>Depósito NaldoGás</strong><br/>Vila Velha, ES")
      .addTo(map.current);

    markersRef.current["warehouse"] = warehouseMarker;

    return () => {
      map.current?.remove();
    };
  }, []);

  // Atualizar marcadores quando mudarem
  useEffect(() => {
    if (!map.current) return;

    // Remover marcadores antigos
    Object.values(markersRef.current).forEach((marker) => {
      const popupContent = marker.getPopup()?.getContent();
      const contentStr = typeof popupContent === 'string' ? popupContent : popupContent?.toString() || '';
      if (contentStr.includes("Depósito")) return; // Manter marcador do depósito
      map.current?.removeLayer(marker);
    });

    // Adicionar novos marcadores
    markers.forEach((marker) => {
      const leafletMarker = L.marker([marker.lat, marker.lng], {
        icon: getIcon(marker.type),
      })
        .bindPopup(`<strong>${marker.title}</strong><br/>${marker.description || ""}`)
        .addTo(map.current!)
        .on("click", () => {
          onMarkerClick?.(marker);
        });

      markersRef.current[marker.id] = leafletMarker;
    });
  }, [markers, onMarkerClick]);

  return (
    <div
      ref={mapContainer}
      style={{
        height,
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid #e5e7eb",
      }}
      className="map-container"
    />
  );
}
