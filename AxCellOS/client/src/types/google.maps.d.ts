export {};

declare global {
  namespace google {
    namespace maps {
      interface LatLngLiteral {
        lat: number;
        lng: number;
      }

      interface MapOptions {
        center?: LatLngLiteral;
        zoom?: number;
        mapTypeId?: string;
        mapTypeControl?: boolean;
        streetViewControl?: boolean;
        fullscreenControl?: boolean;
        zoomControl?: boolean;
        gestureHandling?: string;
        clickableIcons?: boolean;
        mapId?: string;
      }

      interface MarkerOptions {
        position?: LatLngLiteral;
        map?: Map | null;
        title?: string;
        icon?: string;
      }

      class Marker {
        constructor(options: MarkerOptions);
        setMap(map: Map | null): void;
        setPosition(position: LatLngLiteral): void;
      }

      class Map {
        constructor(container: HTMLElement, options: MapOptions);
        setCenter(latLng: LatLngLiteral): void;
        setZoom(zoom: number): void;
        getCenter(): LatLngLiteral;
        getZoom(): number;
      }
    }
  }

  interface Window {
    google: typeof google;
  }
}
