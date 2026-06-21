import {CSSProperties, FormEvent, useState} from 'react';
import {getNearbyFood, NearbyFoodParams} from '@/services/locationService';
import {NearbyFoodPlace} from '@/types';

type PlaceType = NonNullable<NearbyFoodParams['place_type']>;

const placeTypeOptions: {value: PlaceType; label: string}[] = [
  {value: 'restaurant', label: 'Restaurants'},
  {value: 'cafe', label: 'Cafes'},
  {value: 'bakery', label: 'Bakeries'},
  {value: 'meal_takeaway', label: 'Takeaway'},
];

export default function NearbyFoodPage() {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radiusMeters, setRadiusMeters] = useState(1200);
  const [placeType, setPlaceType] = useState<PlaceType>('restaurant');
  const [places, setPlaces] = useState<NearbyFoodPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Location lookup is not available in this browser.');
      return;
    }

    setError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setError('Could not access your location. You can enter coordinates manually.');
        setLocating(false);
      },
      {enableHighAccuracy: true, timeout: 10000},
    );
  };

  const search = async (event: FormEvent) => {
    event.preventDefault();

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError('Enter valid latitude and longitude values.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getNearbyFood({
        latitude: lat,
        longitude: lng,
        radius_meters: radiusMeters,
        max_results: 10,
        place_type: placeType,
      });
      setPlaces(response.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nearby food lookup failed. Check the backend Google Maps API key.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.kicker}>Google Maps food finder</p>
          <h1 style={styles.title}>Find food nearby</h1>
        </div>
        <a style={styles.menuLink} href="/menus">
          Today's menu
        </a>
      </section>

      <form style={styles.searchPanel} onSubmit={search}>
        <div style={styles.controls}>
          <label style={styles.field}>
            <span style={styles.label}>Latitude</span>
            <input
              style={styles.input}
              value={latitude}
              onChange={event => setLatitude(event.target.value)}
              placeholder="48.5216"
              inputMode="decimal"
            />
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Longitude</span>
            <input
              style={styles.input}
              value={longitude}
              onChange={event => setLongitude(event.target.value)}
              placeholder="9.0576"
              inputMode="decimal"
            />
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Radius</span>
            <select
              style={styles.input}
              value={radiusMeters}
              onChange={event => setRadiusMeters(Number(event.target.value))}
            >
              <option value={500}>500 m</option>
              <option value={1200}>1.2 km</option>
              <option value={2500}>2.5 km</option>
              <option value={5000}>5 km</option>
            </select>
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Type</span>
            <select
              style={styles.input}
              value={placeType}
              onChange={event => setPlaceType(event.target.value as PlaceType)}
            >
              {placeTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={styles.actions}>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={useCurrentLocation}
            disabled={locating}
          >
            {locating ? 'Locating...' : 'Use current location'}
          </button>
          <button type="submit" style={styles.primaryButton} disabled={loading}>
            {loading ? 'Searching...' : 'Search nearby'}
          </button>
        </div>
      </form>

      {error && <p style={styles.error}>{error}</p>}

      <section style={styles.results}>
        {places.length === 0 && !loading && (
          <p style={styles.empty}>Search for restaurants, cafes, bakeries, or takeaway spots nearby.</p>
        )}
        {places.map(place => (
          <article key={place.place_id} style={styles.resultCard}>
            <div>
              <h2 style={styles.placeName}>{place.name}</h2>
              <p style={styles.address}>{place.address || 'Address unavailable'}</p>
              <p style={styles.meta}>
                {place.open_now === undefined
                  ? 'Hours unavailable'
                  : place.open_now
                    ? 'Open now'
                    : 'Closed now'}
                {place.rating ? ` · ${place.rating.toFixed(1)} (${place.user_rating_count || 0})` : ''}
              </p>
            </div>
            {place.maps_uri && (
              <a style={styles.mapLink} href={place.maps_uri} target="_blank" rel="noreferrer">
                Open in Maps
              </a>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    maxWidth: 980,
    margin: '0 auto',
    padding: '32px 20px',
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#202124',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 20,
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  kicker: {margin: '0 0 6px', color: '#5f6368', fontSize: 14},
  title: {margin: 0, fontSize: 38, lineHeight: 1.1, fontWeight: 760},
  menuLink: {
    color: '#0b57d0',
    textDecoration: 'none',
    fontWeight: 650,
    paddingTop: 12,
    whiteSpace: 'nowrap',
  },
  searchPanel: {
    border: '1px solid #dadce0',
    borderRadius: 8,
    padding: 18,
    background: '#fff',
  },
  controls: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: 14,
  },
  field: {display: 'grid', gap: 6},
  label: {fontSize: 13, color: '#5f6368', fontWeight: 650},
  input: {
    height: 40,
    border: '1px solid #c7c9cc',
    borderRadius: 6,
    padding: '0 10px',
    fontSize: 15,
    background: '#fff',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 16,
  },
  primaryButton: {
    height: 40,
    border: 0,
    borderRadius: 6,
    padding: '0 16px',
    background: '#0b57d0',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryButton: {
    height: 40,
    border: '1px solid #c7c9cc',
    borderRadius: 6,
    padding: '0 16px',
    background: '#fff',
    color: '#202124',
    fontWeight: 700,
    cursor: 'pointer',
  },
  error: {
    padding: '12px 14px',
    border: '1px solid #f4b5ad',
    borderRadius: 6,
    background: '#fceeee',
    color: '#9b1c12',
  },
  results: {display: 'grid', gap: 12, marginTop: 18},
  empty: {color: '#5f6368'},
  resultCard: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 18,
    alignItems: 'center',
    border: '1px solid #dadce0',
    borderRadius: 8,
    padding: 16,
    background: '#fff',
  },
  placeName: {fontSize: 19, lineHeight: 1.2, margin: 0},
  address: {margin: '6px 0 4px', color: '#3c4043'},
  meta: {margin: 0, color: '#5f6368', fontSize: 14},
  mapLink: {
    color: '#0b57d0',
    fontWeight: 700,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
};
