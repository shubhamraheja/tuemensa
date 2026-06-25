import {useCallback, useEffect, useState} from 'react';
import {getPlaces, getPlacesWithDistances} from '@/services/placeService';
import {DisplayMode, PlaceWithDistance} from '@/types';
import DisplayModeBar from '@/components/DisplayModeBar';
import PlaceList from '@/components/PlaceList';
import PlaceCards from '@/components/PlaceCards';
import './HomePage.css';

// Tübingen city center — used when the browser can't give us a location.
const DEFAULT_CENTER = {latitude: 48.5216, longitude: 9.0576};

interface Located {
  latitude: number;
  longitude: number;
  approximate: boolean;
}

function requestLocation(): Promise<Located> {
  return new Promise(resolve => {
    if (!navigator.geolocation) {
      resolve({...DEFAULT_CENTER, approximate: true});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          approximate: false,
        }),
      () => resolve({...DEFAULT_CENTER, approximate: true}),
      {enableHighAccuracy: true, timeout: 8000},
    );
  });
}

export default function HomePage() {
  const [mode, setMode] = useState<DisplayMode>('list');
  const [places, setPlaces] = useState<PlaceWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approximate, setApproximate] = useState(false);

  // App-open flow: locate the user, then fetch DB places with live distances.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const where = await requestLocation();
      setApproximate(where.approximate);
      const data = await getPlacesWithDistances({
        latitude: where.latitude,
        longitude: where.longitude,
        mode: 'walking',
      });
      setPlaces(data);
    } catch {
      // Distance call failed — fall back to the plain place list.
      try {
        const fallback = await getPlaces();
        setPlaces(fallback);
        setError('Could not load distances; showing places without them.');
      } catch {
        setError('Could not load places. Is the backend running?');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="home">
      <header className="home-header">
        <div>
          <h1>Tübingen Eats</h1>
          <p>
            Food places near you
            {approximate ? ' (using Tübingen center — allow location for exact distances)' : ''}.
          </p>
        </div>
        <button type="button" className="locate-btn" onClick={() => void load()}>
          Use my location
        </button>
      </header>

      <DisplayModeBar mode={mode} onChange={setMode} />

      {error && <div className="banner error">{error}</div>}

      {loading ? (
        <div className="banner">Loading nearby food…</div>
      ) : places.length === 0 ? (
        <div className="banner">
          No places in the database yet. Set GOOGLE_MAPS_API_KEY and restart the backend to seed
          Tübingen.
        </div>
      ) : mode === 'list' ? (
        <PlaceList places={places} />
      ) : (
        <PlaceCards places={places} />
      )}
    </main>
  );
}
