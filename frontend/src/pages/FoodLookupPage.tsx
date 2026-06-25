import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  getNearbyFood,
  MealType,
  NearbyFoodParams,
  NearbySearchResult,
  PriceTier,
} from '@/services/placeService';
import './FoodLookupPage.css';

// Fix Leaflet's broken default icon paths when bundled with Vite
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
});

const CENTER_ICON = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

type Coordinates = {latitude: number; longitude: number};
const DEFAULT_CENTER: Coordinates = {latitude: 48.5216, longitude: 9.0576};

const ALLERGEN_OPTIONS = ['gluten', 'nuts', 'dairy', 'eggs', 'soy', 'fish', 'shellfish', 'sesame'];

function formatDistance(m: number | null | undefined) {
  if (m == null) return '';
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function priceTierLabel(tier: PriceTier | null | undefined) {
  if (tier === '<5') return '< €5';
  if (tier === '5-10') return '€5–10';
  if (tier === '>10') return '> €10';
  return '';
}

export default function FoodLookupPage() {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.Marker[]>([]);
  const centerMarker = useRef<L.Marker | null>(null);

  const [center, setCenter] = useState<Coordinates>(DEFAULT_CENTER);
  const [radius, setRadius] = useState(1200);
  const [places, setPlaces] = useState<NearbySearchResult[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mealType, setMealType] = useState<MealType | null>(null);
  const [priceTier, setPriceTier] = useState<PriceTier | null>(null);
  const [veganOnly, setVeganOnly] = useState(false);
  const [vegOnly, setVegOnly] = useState(false);
  const [excludedAllergens, setExcludedAllergens] = useState<string[]>([]);

  const selectedPlace = useMemo(
    () => places.find(p => p.id === selectedId) ?? places[0] ?? null,
    [places, selectedId],
  );

  const clearMarkers = () => {
    markers.current.forEach(m => m.remove());
    markers.current = [];
  };

  const renderMarkers = useCallback((nextPlaces: NearbySearchResult[]) => {
    if (!map.current) return;
    clearMarkers();
    nextPlaces.forEach(place => {
      if (place.latitude == null || place.longitude == null) return;
      const marker = L.marker([place.latitude, place.longitude], {title: place.name})
        .addTo(map.current!)
        .bindTooltip(place.name, {permanent: false, direction: 'top'});
      marker.on('click', () => setSelectedId(place.id));
      markers.current.push(marker);
    });
  }, []);

  const searchNearby = useCallback(
    async (searchCenter: Coordinates, overrides?: Partial<NearbyFoodParams>) => {
      setLoading(true);
      setError(null);
      try {
        const params: NearbyFoodParams = {
          latitude: searchCenter.latitude,
          longitude: searchCenter.longitude,
          radius,
          meal_type: mealType,
          price_tier: priceTier,
          is_vegan_friendly: veganOnly ? true : null,
          is_vegetarian_friendly: vegOnly ? true : null,
          allergens_exclude: excludedAllergens,
          ...overrides,
        };
        const response = await getNearbyFood(params);
        setPlaces(response.places);
        setSelectedId(response.places[0]?.id ?? null);
        renderMarkers(response.places);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load nearby food places.');
      } finally {
        setLoading(false);
      }
    },
    [renderMarkers, radius, mealType, priceTier, veganOnly, vegOnly, excludedAllergens],
  );

  const moveCenter = useCallback(
    (nextCenter: Coordinates) => {
      setCenter(nextCenter);
      if (map.current) {
        const latlng: L.LatLngExpression = [nextCenter.latitude, nextCenter.longitude];
        map.current.panTo(latlng);
        if (!centerMarker.current) {
          centerMarker.current = L.marker(latlng, {icon: CENTER_ICON, zIndexOffset: 1000}).addTo(map.current);
        } else {
          centerMarker.current.setLatLng(latlng);
        }
      }
      void searchNearby(nextCenter);
    },
    [searchNearby],
  );

  // Boot Leaflet map once
  useEffect(() => {
    if (!mapElement.current || map.current) return;

    map.current = L.map(mapElement.current, {
      center: [DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map.current);

    map.current.on('click', (e: L.LeafletMouseEvent) => {
      moveCenter({latitude: e.latlng.lat, longitude: e.latlng.lng});
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => moveCenter({latitude: pos.coords.latitude, longitude: pos.coords.longitude}),
        () => moveCenter(DEFAULT_CENTER),
        {enableHighAccuracy: false, timeout: 8000, maximumAge: 0},
      );
    } else {
      moveCenter(DEFAULT_CENTER);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Your browser does not support geolocation.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => moveCenter({latitude: pos.coords.latitude, longitude: pos.coords.longitude}),
      () => {
        setLoading(false);
        setError('Location permission was denied or unavailable.');
      },
      {enableHighAccuracy: false, timeout: 8000, maximumAge: 0},
    );
  };

  return (
    <main className="food-page">
      <header className="topbar">
        <h1>Nearby Food</h1>
        <div className="topbar-actions">
          <button type="button" onClick={() => void searchNearby(center)}>
            Search this area
          </button>
          <button type="button" className="secondary" onClick={handleUseMyLocation}>
            Use my location
          </button>
        </div>
      </header>

      <div className="page-body">
        <aside className="filter-sidebar" aria-label="Filters">
          <section className="filter-section">
            <h2>Radius</h2>
            <select
              value={radius}
              onChange={e => {
                const next = Number(e.target.value);
                setRadius(next);
                void searchNearby(center, {radius: next});
              }}
            >
              <option value={250}>250 m</option>
              <option value={500}>500 m</option>
              <option value={1000}>1 km</option>
              <option value={1200}>1.2 km</option>
              <option value={2000}>2 km</option>
              <option value={5000}>5 km</option>
            </select>
          </section>

          <section className="filter-section">
            <h2>Type</h2>
            <div className="toggle-group">
              {(['meal', 'snack'] as MealType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  className={mealType === t ? 'toggle active' : 'toggle'}
                  onClick={() => {
                    const next = mealType === t ? null : t;
                    setMealType(next);
                    void searchNearby(center, {meal_type: next});
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </section>

          <section className="filter-section">
            <h2>Price</h2>
            <div className="toggle-group">
              {(['<5', '5-10', '>10'] as PriceTier[]).map(t => (
                <button
                  key={t}
                  type="button"
                  className={priceTier === t ? 'toggle active' : 'toggle'}
                  onClick={() => {
                    const next = priceTier === t ? null : t;
                    setPriceTier(next);
                    void searchNearby(center, {price_tier: next});
                  }}
                >
                  {priceTierLabel(t)}
                </button>
              ))}
            </div>
          </section>

          <section className="filter-section">
            <h2>Dietary</h2>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={veganOnly}
                onChange={e => {
                  setVeganOnly(e.target.checked);
                  void searchNearby(center, {is_vegan_friendly: e.target.checked ? true : null});
                }}
              />
              Vegan-friendly
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={vegOnly}
                onChange={e => {
                  setVegOnly(e.target.checked);
                  void searchNearby(center, {is_vegetarian_friendly: e.target.checked ? true : null});
                }}
              />
              Vegetarian-friendly
            </label>
          </section>

          <section className="filter-section">
            <h2>Exclude allergens</h2>
            <div className="allergen-grid">
              {ALLERGEN_OPTIONS.map(a => (
                <label key={a} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={excludedAllergens.includes(a)}
                    onChange={() => {
                      const next = excludedAllergens.includes(a)
                        ? excludedAllergens.filter(x => x !== a)
                        : [...excludedAllergens, a];
                      setExcludedAllergens(next);
                      void searchNearby(center, {allergens_exclude: next});
                    }}
                  />
                  {a.charAt(0).toUpperCase() + a.slice(1)}
                </label>
              ))}
            </div>
          </section>
        </aside>

        <div className="map-panel">
          <div ref={mapElement} className="map-canvas" />
          {loading && <div className="map-status">Loading nearby places…</div>}
          {error && <div className="map-error">{error}</div>}
        </div>

        <aside className="results-panel" aria-label="Nearby food results">
          <div className="results-header">
            <span>{places.length} places</span>
            <span className="coords">
              {center.latitude.toFixed(4)}, {center.longitude.toFixed(4)}
            </span>
          </div>

          {places.length === 0 && !loading && (
            <p className="empty-state">No food locations found for the current filters.</p>
          )}

          <div className="places-list">
            {places.map(place => (
              <button
                key={place.id}
                type="button"
                className={place.id === selectedPlace?.id ? 'place-card active' : 'place-card'}
                onClick={() => {
                  setSelectedId(place.id);
                  if (place.latitude != null && place.longitude != null) {
                    map.current?.panTo([place.latitude, place.longitude]);
                  }
                }}
              >
                <div className="place-card-top">
                  <span className="place-name">{place.name}</span>
                  <div className="place-badges">
                    {place.meal_type && <span className={`badge ${place.meal_type}`}>{place.meal_type}</span>}
                    {place.price_tier && <span className="badge price">{priceTierLabel(place.price_tier)}</span>}
                    {place.is_vegan_friendly && <span className="badge vegan">Vegan</span>}
                    {place.is_vegetarian_friendly && !place.is_vegan_friendly && <span className="badge veg">Veg</span>}
                  </div>
                </div>
                <div className="place-meta">
                  {place.cuisine && <span>{place.cuisine}</span>}
                  {place.rating != null && <span>★ {place.rating.toFixed(1)}</span>}
                  {place.open_now === true && <span className="open">Open now</span>}
                  {place.open_now === false && <span className="closed">Closed</span>}
                  {place.distance_m != null && <span>{formatDistance(place.distance_m)}</span>}
                </div>
                {place.address && <div className="place-address">{place.address}</div>}
              </button>
            ))}
          </div>

          {selectedPlace && (
            <div className="detail-panel">
              <h2>{selectedPlace.name}</h2>
              {selectedPlace.address && <p className="detail-address">{selectedPlace.address}</p>}

              <div className="detail-badges">
                {selectedPlace.meal_type && <span className={`badge ${selectedPlace.meal_type}`}>{selectedPlace.meal_type}</span>}
                {selectedPlace.price_tier && <span className="badge price">{priceTierLabel(selectedPlace.price_tier)}</span>}
                {selectedPlace.is_vegan_friendly && <span className="badge vegan">Vegan-friendly</span>}
                {selectedPlace.is_vegetarian_friendly && <span className="badge veg">Vegetarian-friendly</span>}
              </div>

              <dl className="detail-grid">
                {selectedPlace.cuisine && <div><dt>Cuisine</dt><dd>{selectedPlace.cuisine}</dd></div>}
                <div>
                  <dt>Rating</dt>
                  <dd>{selectedPlace.rating != null ? `${selectedPlace.rating.toFixed(1)} (${selectedPlace.user_rating_count ?? 0})` : 'Not listed'}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{selectedPlace.open_now == null ? 'Unknown' : selectedPlace.open_now ? 'Open now' : 'Closed'}</dd>
                </div>
                {selectedPlace.distance_m != null && <div><dt>Distance</dt><dd>{formatDistance(selectedPlace.distance_m)}</dd></div>}
              </dl>

              {selectedPlace.opening_hours.length > 0 && (
                <div className="detail-section">
                  <h3>Opening hours</h3>
                  <ul className="hours-list">
                    {selectedPlace.opening_hours.map((h, i) => (
                      <li key={i}>{h.description ?? `${h.day}: ${h.open}–${h.close}`}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedPlace.allergens && selectedPlace.allergens.length > 0 && (
                <div className="detail-section">
                  <h3>Allergens</h3>
                  <div className="allergen-tags">
                    {selectedPlace.allergens.map(a => <span key={a} className="allergen-tag">{a}</span>)}
                  </div>
                </div>
              )}

              {selectedPlace.menu.length > 0 && (
                <div className="detail-section">
                  <h3>Menu</h3>
                  <ul className="menu-list">
                    {selectedPlace.menu.map((item, i) => (
                      <li key={i} className="menu-item">
                        <span>{item.name}</span>
                        {item.price != null && <span>€{item.price.toFixed(2)}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="detail-actions">
                {selectedPlace.google_maps_uri && (
                  <a href={selectedPlace.google_maps_uri} target="_blank" rel="noreferrer">Open in Maps</a>
                )}
                {selectedPlace.website_uri && (
                  <a href={selectedPlace.website_uri} target="_blank" rel="noreferrer">Website</a>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
