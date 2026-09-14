import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { buildMapHtml, MapInMessage, MapOutMessage, MapPin } from '../lib/leafletHtml';
import { LatLng } from '../types';
import { palette } from '../theme/theme';

export interface LeafletMapProps {
  center: LatLng;
  zoom?: number;
  pins?: MapPin[];
  picked?: LatLng | null;
  user?: LatLng | null;
  onPinTap?: (id: number) => void;
  onMapTap?: (point: LatLng) => void;
  style?: ViewStyle;
}

/** Native Leaflet map in a WebView (see LeafletMap.web.tsx for expo web). */
export default function LeafletMap({
  center,
  zoom = 14,
  pins,
  picked,
  user,
  onPinTap,
  onMapTap,
  style,
}: LeafletMapProps) {
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  // The HTML is created once; later prop changes go through the message bridge.
  const html = useMemo(
    () => buildMapHtml(center, zoom),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const send = useCallback((message: MapInMessage) => {
    webRef.current?.injectJavaScript(
      `window.rnCall(${JSON.stringify(JSON.stringify(message))}); true;`,
    );
  }, []);

  useEffect(() => {
    if (ready && pins) send({ type: 'setPins', pins });
  }, [ready, pins, send]);

  useEffect(() => {
    if (ready && picked) send({ type: 'setPicked', lat: picked.latitude, lng: picked.longitude });
  }, [ready, picked, send]);

  useEffect(() => {
    if (ready && user) send({ type: 'setUser', lat: user.latitude, lng: user.longitude });
  }, [ready, user, send]);

  useEffect(() => {
    if (ready) send({ type: 'setCenter', lat: center.latitude, lng: center.longitude });
  }, [ready, center, send]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const message = JSON.parse(event.nativeEvent.data) as MapOutMessage;
        if (message.type === 'ready') setReady(true);
        else if (message.type === 'pinTap') onPinTap?.(message.id);
        else if (message.type === 'mapTap')
          onMapTap?.({ latitude: message.lat, longitude: message.lng });
      } catch {
        // ignore malformed messages
      }
    },
    [onPinTap, onMapTap],
  );

  return (
    <View style={[styles.host, style]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled={false}
        setBuiltInZoomControls={false}
        overScrollMode="never"
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    overflow: 'hidden',
    backgroundColor: palette.surfaceAlt,
  },
  web: {
    flex: 1,
    backgroundColor: palette.surfaceAlt,
  },
});
