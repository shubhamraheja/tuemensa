/* eslint-disable @typescript-eslint/no-explicit-any */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {getMapsConfig, getNearbyFood, NearbyFoodPlace} from '@/services/placeService';
import './FoodLookupPage.css';

declare global {
  interface Window {
    google?: any;
    initGoogleMaps?: () => void;
  }
}

type Coordinates = {
  latitude: number;
  longitude: number;
};

const DEFAULT_CENTER: Coordinates = {latitude: 48.5216, longitude: 9.0576};

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps) {
    return Promise.resolve();
  }

  const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-maps]');
  if (existingScript) {
    return new Promise<void>((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), {once: true});
      existingScript.addEventListener('error', () => reject(new Error('Google Maps failed to load')), {
        once: true,
      });
    });
  }

  return new Promise<void>((resolve, reject) => {
    window.initGoogleMaps = () => resolve();

    const script = document.createElement('script');
    script.dataset.googleMaps = 'true';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&callback=initGoogleMaps`;
    script.onerror = () => reject(new Error('Google Maps failed to load'));

    document.head.appendChild(script);
  });
}

function formatPlaceType(types: string[]) {
  const readable = types.find(type => ['restaurant', 'cafe', 'bakery', 'meal_takeaway'].includes(type));
  return readable?.replaceAll('_', ' ') ?? 'food';
}

function formatPrice(priceLevel?: string | null) {
  if (!priceLevel) return '';
  return priceLevel.replace('PRICE_LEVEL_', '').toLowerCase().replaceAll('_', ' ');
}

export default function FoodLookupPage() {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const map = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const centerMarker = useRef<any>(null);

  const [center, setCenter] = useState<Coordinates>(DEFAULT_CENTER);
  const [radius, setRadius] = useState(1200);
  const [places, setPlaces] = useState<NearbyFoodPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedPlace = useMemo(
    () => places.find(place => place.id === selectedPlaceId) ?? places[0],
    [places, selectedPlaceId],
  );

  const clearMarkers = () => {
    markers.current.forEach(marker => marker.setMap(null));
    markers.current = [];
  };

  const renderMarkers = useCallback(
    (nextPlaces: NearbyFoodPlace[]) => {
      if (!map.current || !window.google?.maps) return;

      clearMarkers();

      nextPlaces.forEach(place => {
        const marker = new window.google.maps.Marker({
          map: map.current,
          position: {
            lat: place.location.latitude,
            lng: place.location.longitude,
          },
          title: place.name,
        });

        marker.addListener('click', () => {
          setSelectedPlaceId(place.id);
          map.current.panTo(marker.getPosition());
        });

        markers.current.push(marker);
      });
    },
    [],
  );

  // Updated to accept an optional currentRadius parameter to avoid stale state bugs on change
  const searchNearby = useCallback(
    async (searchCenter: Coordinates, currentRadius: number = radius) => {
      setLoading(true);
      setError(null);

      try {
        const response = await getNearbyFood({
          latitude: searchCenter.latitude,
          longitude: searchCenter.longitude,
          radius: currentRadius,
        });

        setPlaces(response.places);
        setSelectedPlaceId(response.places[0]?.id ?? null);
        renderMarkers(response.places);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load nearby food places.');
      } finally {
        setLoading(false);
      }
    },
    [renderMarkers, radius],
  );

  const moveCenter = useCallback(
    (nextCenter: Coordinates) => {
      setCenter(nextCenter);

      if (map.current && window.google?.maps) {
        const position = {lat: nextCenter.latitude, lng: nextCenter.longitude};
        map.current.panTo(position);

        if (!centerMarker.current) {
          centerMarker.current = new window.google.maps.Marker({
            map: map.current,
            position,
            title: 'Search center',
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#2563eb',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            },
          });
        } else {
          centerMarker.current.setPosition(position);
        }
      }

      void searchNearby(nextCenter);
    },
    [searchNearby],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootMap() {
      try {
        const config = await getMapsConfig();
        if (!config.googleMapsApiKey) {
          throw new Error('Google Maps API key is missing. Set GOOGLE_MAPS_API_KEY in Docker Compose.');
        }

        await loadGoogleMaps(config.googleMapsApiKey);
        if (cancelled || !mapElement.current) return;

        map.current = new window.google.maps.Map(mapElement.current, {
          center: {lat: DEFAULT_CENTER.latitude, lng: DEFAULT_CENTER.longitude},
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        map.current.addListener('click', (event: any) => {
          if (!event.latLng) return;
          moveCenter({latitude: event.latLng.lat(), longitude: event.latLng.lng()});
        });

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            position => {
              moveCenter({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            },
            () => moveCenter(DEFAULT_CENTER),
            {enableHighAccuracy: false, timeout: 8000, maximumAge: 0},
          );
        } else {
          moveCenter(DEFAULT_CENTER);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not initialize Google Maps.');
        setLoading(false);
      }
    }

    void bootMap();

    return () => {
      cancelled = true;
      clearMarkers();
      centerMarker.current?.setMap(null);
    };
  }, [moveCenter]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Your browser does not support location lookup.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      position =>
        moveCenter({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => {
        setLoading(false);
        setError('Location permission was denied or unavailable.');
      },
      {enableHighAccuracy: false, timeout: 8000, maximumAge: 0},
    );
  };

  return (
    <main className="food-page">
      <section className="toolbar" aria-label="Food search controls">
        <div>
          <h1>Nearby Food</h1>
          <p>Search restaurants, cafes, bakeries, and takeaway spots around the map center.</p>
        </div>
        <div className="toolbar-actions">
          <label>
            Radius
            <select 
              value={radius} 
              onChange={event => {
                const nextRadius = Number(event.target.value);
                setRadius(nextRadius);
                void searchNearby(center, nextRadius); // Instantly updates search when option changes
              }}
            >
              <option value={100}>100 m</option>
              <option value={250}>250 m</option>
              <option value={500}>500 m</option>
              <option value={1000}>1 km</option>
            </select>
          </label>
          <button type="button" onClick={() => void searchNearby(center)}>
            Search this area
          </button>
          <button type="button" className="secondary" onClick={handleUseMyLocation}>
            Use my location
          </button>
        </div>
      </section>

      <section className="lookup-shell">
        <div className="map-panel">
          <div ref={mapElement} className="map-canvas" />
          {loading && <div className="map-status">Loading nearby places...</div>}
          {error && <div className="map-error">{error}</div>}
        </div>

        <aside className="places-panel" aria-label="Nearby food results">
          <div className="results-header">
            <span>{places.length} places</span>
            <span>
              {center.latitude.toFixed(4)}, {center.longitude.toFixed(4)}
            </span>
          </div>

          {places.length === 0 && !loading && <p className="empty-state">No food locations found nearby.</p>}

          <div className="places-list">
            {places.map(place => (
              <button
                type="button"
                className={place.id === selectedPlace?.id ? 'place-row active' : 'place-row'}
                key={place.id}
                onClick={() => {
                  setSelectedPlaceId(place.id);
                  map.current?.panTo({
                    lat: place.location.latitude,
                    lng: place.location.longitude,
                  });
                }}
              >
                <span className="place-name">{place.name}</span>
                <span className="place-meta">
                  {formatPlaceType(place.types)}
                  {place.rating ? ` • ${place.rating.toFixed(1)} stars` : ''}
                  {place.open_now === true ? ' • open now' : ''}
                </span>
                {place.address && <span className="place-address">{place.address}</span>}
              </button>
            ))}
          </div>

          {selectedPlace && (
            <div className="details-panel">
              <h2>{selectedPlace.name}</h2>
              <p>{selectedPlace.address}</p>
              <dl>
                <div>
                  <dt>Rating</dt>
                  <dd>
                    {selectedPlace.rating
                      ? `${selectedPlace.rating.toFixed(1)} (${selectedPlace.user_rating_count ?? 0})`
                      : 'Not listed'}
                  </dd>
                </div>
                <div>
                  <dt>Price</dt>
                  <dd>{formatPrice(selectedPlace.price_level) || 'Not listed'}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{selectedPlace.open_now == null ? 'Unknown' : selectedPlace.open_now ? 'Open now' : 'Closed'}</dd>
                </div>
              </dl>
              <div className="details-actions">
                {selectedPlace.google_maps_uri && (
                  <a href={selectedPlace.google_maps_uri} target="_blank" rel="noreferrer">
                    Open in Maps
                  </a>
                )}
                {selectedPlace.website_uri && (
                  <a href={selectedPlace.website_uri} target="_blank" rel="noreferrer">
                    Website
                  </a>
                )}
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}