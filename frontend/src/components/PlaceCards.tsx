import {PlaceWithDistance} from '@/types';
import {formatPrice, formatRating, formatType} from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';

interface Props {
  places: PlaceWithDistance[];
}

/** Grid of photo-style cards. Second display mode in the selection bar. */
export default function PlaceCards({places}: Props) {
  return (
    <div className="place-cards">
      {places.map(place => {
        const rating = formatRating(place);
        const price = formatPrice(place);
        const distance = place.distance_text
          ? place.duration_text
            ? `${place.distance_text} · ${place.duration_text}`
            : place.distance_text
          : '—';

        return (
          <article key={place.id} className="place-card">
            <div className="card-thumb" aria-hidden>
              {place.name.charAt(0).toUpperCase()}
            </div>
            <div className="card-body">
              <h3 className="card-name">{place.name}</h3>
              <p className="card-meta">
                <StatusBadge hours={place.opening_hours} />
                <span>{formatType(place)}</span>
                {place.cuisine && <span className="tag">{place.cuisine}</span>}
                {rating && <span>★ {rating}</span>}
                {price && <span>{price}</span>}
              </p>
              {place.address && <p className="card-address">{place.address}</p>}
              <div className="card-footer">
                <span className="card-distance">{distance}</span>
                {place.google_maps_uri && (
                  <a href={place.google_maps_uri} target="_blank" rel="noreferrer">
                    Maps
                  </a>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
