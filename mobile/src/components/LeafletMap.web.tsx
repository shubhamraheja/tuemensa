import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { buildMapHtml, MapInMessage, MapOutMessage } from '../lib/leafletHtml';
import { palette } from '../theme/theme';
import type { LeafletMapProps } from './LeafletMap';

/** Expo-web variant: same HTML + protocol inside an iframe. */
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const html = useMemo(
    () => buildMapHtml(center, zoom),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const send = useCallback((message: MapInMessage) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(message), '*');
  }, []);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      try {
        const message = (
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        ) as MapOutMessage;
        if (message.type === 'ready') setReady(true);
        else if (message.type === 'pinTap') onPinTap?.(message.id);
        else if (message.type === 'mapTap')
          onMapTap?.({ latitude: message.lat, longitude: message.lng });
      } catch {
        // ignore malformed messages
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [onPinTap, onMapTap]);

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

  return (
    <View style={[styles.host, style]}>
      <iframe
        ref={iframeRef}
        srcDoc={html}
        title="Map"
        style={{ border: 0, width: '100%', height: '100%' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    overflow: 'hidden',
    backgroundColor: palette.surfaceAlt,
  },
});
