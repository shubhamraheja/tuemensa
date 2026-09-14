import { LatLng } from '../types';

export interface MapPin {
  id: number;
  lat: number;
  lng: number;
  selected?: boolean;
}

/** Messages the map page sends to the app. */
export type MapOutMessage =
  | { type: 'ready' }
  | { type: 'pinTap'; id: number }
  | { type: 'mapTap'; lat: number; lng: number };

/** Messages the app sends to the map page. */
export type MapInMessage =
  | { type: 'setPins'; pins: MapPin[] }
  | { type: 'setCenter'; lat: number; lng: number; zoom?: number }
  | { type: 'setPicked'; lat: number; lng: number }
  | { type: 'setUser'; lat: number; lng: number };

/**
 * Self-contained Leaflet + OSM page. Works identically inside a native
 * WebView (ReactNativeWebView.postMessage / injected rnCall) and a web
 * <iframe srcDoc> (window.parent.postMessage / message events).
 */
export function buildMapHtml(center: LatLng, zoom = 14): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; background: #FAF7F2; }
  .leaflet-control-attribution { font-size: 9px; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false }).setView([${center.latitude}, ${center.longitude}], ${zoom});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  var pinLayer = L.layerGroup().addTo(map);
  var pickMarker = null;
  var userMarker = null;

  function send(msg) {
    var json = JSON.stringify(msg);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(json);
    } else if (window.parent !== window) {
      window.parent.postMessage(json, '*');
    }
  }

  function handle(msg) {
    if (!msg || !msg.type) return;
    if (msg.type === 'setPins') {
      pinLayer.clearLayers();
      msg.pins.forEach(function (p) {
        var marker = L.circleMarker([p.lat, p.lng], {
          radius: p.selected ? 11 : 8,
          color: '#FFFFFF',
          weight: 2,
          fillColor: p.selected ? '#D95F1A' : '#F4772E',
          fillOpacity: 1
        }).addTo(pinLayer);
        marker.on('click', function () { send({ type: 'pinTap', id: p.id }); });
      });
    } else if (msg.type === 'setCenter') {
      map.setView([msg.lat, msg.lng], msg.zoom || map.getZoom());
    } else if (msg.type === 'setPicked') {
      if (!pickMarker) {
        pickMarker = L.circleMarker([msg.lat, msg.lng], {
          radius: 9, color: '#FFFFFF', weight: 3, fillColor: '#1C1B1A', fillOpacity: 1
        }).addTo(map);
      } else {
        pickMarker.setLatLng([msg.lat, msg.lng]);
      }
    } else if (msg.type === 'setUser') {
      if (!userMarker) {
        userMarker = L.circleMarker([msg.lat, msg.lng], {
          radius: 7, color: '#FFFFFF', weight: 2, fillColor: '#2563EB', fillOpacity: 1
        }).addTo(map);
      } else {
        userMarker.setLatLng([msg.lat, msg.lng]);
      }
    }
  }

  // Native path: the app injects window.rnCall('<json>').
  window.rnCall = function (raw) {
    try { handle(typeof raw === 'string' ? JSON.parse(raw) : raw); } catch (e) {}
  };
  // Web/iframe path.
  window.addEventListener('message', function (event) {
    try {
      var msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      handle(msg);
    } catch (e) {}
  });

  map.on('click', function (event) {
    send({ type: 'mapTap', lat: event.latlng.lat, lng: event.latlng.lng });
  });

  send({ type: 'ready' });
</script>
</body>
</html>`;
}
