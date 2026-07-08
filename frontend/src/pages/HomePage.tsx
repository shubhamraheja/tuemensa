import {useCallback, useEffect, useMemo, useState} from 'react';
import {getPlaces, getPlacesWithDistances, runScrapers} from '@/services/placeService';
import {DisplayMode, PlaceWithDistance} from '@/types';
import DisplayModeBar from '@/components/DisplayModeBar';
import PlaceList from '@/components/PlaceList';
import PlaceCards from '@/components/PlaceCards';
import './HomePage.css';

// Tübingen city center — used when the browser can't give us a location.
const DEFAULT_CENTER = {latitude: 48.5216, longitude: 9.0576};

const TYPE_FILTERS: {id: string; label: string; types: string[] | null}[] = [
  {id: 'all', label: 'All', types: null},
  {id: 'mensa', label: 'Mensas', types: ['mensa', 'cafeteria']},
  {id: 'restaurant', label: 'Restaurants', types: ['restaurant', 'bistro']},
  {id: 'cafe', label: 'Cafés', types: ['cafe']},
  {id: 'bakery', label: 'Bakeries', types: ['bakery']},
];

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
  const [filterId, setFilterId] = useState('all');
  const [places, setPlaces] = useState<PlaceWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approximate, setApproximate] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState<string | null>(null);

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

  // Debug: run the mensa scrapers, then reload.
  const handleScrape = useCallback(async () => {
    setScraping(true);
    setScrapeMsg(null);
    try {
      const res = await runScrapers();
      setScrapeMsg(
        `Scraped ${res.total_places} places (+${res.created} new, ${res.updated} updated, ${res.enriched} enriched). Reloading…`,
      );
      await load();
    } catch {
      setScrapeMsg('Scrape failed — check the backend logs.');
    } finally {
      setScraping(false);
    }
  }, [load]);

  const shown = useMemo(() => {
    const filter = TYPE_FILTERS.find(f => f.id === filterId);
    if (!filter?.types) return places;
    return places.filter(p => p.place_type && filter.types!.includes(p.place_type));
  }, [places, filterId]);

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
        <div className="home-actions">
          <button type="button" className="locate-btn" onClick={() => void load()}>
            Use my location
          </button>
          <button
            type="button"
            className="debug-btn"
            onClick={() => void handleScrape()}
            disabled={scraping}
          >
            {scraping ? 'Scraping…' : 'Run scrapers (debug)'}
          </button>
        </div>
      </header>

      <div className="controls">
        <DisplayModeBar mode={mode} onChange={setMode} />
        <label className="filter">
          Show
          <select value={filterId} onChange={event => setFilterId(event.target.value)}>
            {TYPE_FILTERS.map(f => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {scrapeMsg && <div className="banner">{scrapeMsg}</div>}
      {error && <div className="banner error">{error}</div>}

      {loading ? (
        <div className="banner">Loading nearby food…</div>
      ) : places.length === 0 ? (
        <div className="banner">
          No places in the database yet. Set GOOGLE_MAPS_API_KEY and restart the backend to seed
          Tübingen, or hit “Run scrapers”.
        </div>
      ) : shown.length === 0 ? (
        <div className="banner">No places match this filter.</div>
      ) : mode === 'list' ? (
        <PlaceList places={shown} />
      ) : (
        <PlaceCards places={shown} />
      )}
    </main>
  );
}
