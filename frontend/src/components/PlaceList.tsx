import {useState} from 'react';
import {MenuItem, PlaceWithDistance} from '@/types';
import {formatPrice, formatRating, formatType} from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';

interface Props {
  places: PlaceWithDistance[];
}

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Group menu items by weekday (Mon-first); day-less items go in one trailing group. */
function groupByDay(menu: MenuItem[]): {day: string | null; items: MenuItem[]}[] {
  const groups = new Map<string, MenuItem[]>();
  for (const item of menu) {
    const key = item.day ?? '';
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(item);
  }
  return [...groups.keys()]
    .sort((a, b) => (a ? DAY_ORDER.indexOf(a) : 99) - (b ? DAY_ORDER.indexOf(b) : 99))
    .map(key => ({day: key || null, items: groups.get(key)!}));
}

/** Lieferando-style list: each row expands to reveal details. */
export default function PlaceList({places}: Props) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <ul className="place-list">
      {places.map(place => {
        const open = openId === place.id;
        const rating = formatRating(place);
        const price = formatPrice(place);
        const hasDetails = place.opening_hours.length > 0 || place.menu.length > 0;

        return (
          <li key={place.id} className={open ? 'place-item open' : 'place-item'}>
            <button
              type="button"
              className="place-summary"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : place.id)}
            >
              <div className="place-summary-main">
                <span className="place-name">{place.name}</span>
                <span className="place-tags">
                  <StatusBadge hours={place.opening_hours} />
                  <span className="tag type">{formatType(place)}</span>
                  {place.cuisine && <span className="tag">{place.cuisine}</span>}
                  {rating && <span className="tag rating">★ {rating}</span>}
                  {price && <span className="tag">{price}</span>}
                </span>
                {place.address && <span className="place-address">{place.address}</span>}
              </div>
              <div className="place-summary-side">
                {place.distance_text ? (
                  <>
                    <span className="distance">{place.distance_text}</span>
                    {place.duration_text && (
                      <span className="duration">{place.duration_text}</span>
                    )}
                  </>
                ) : (
                  <span className="distance muted">—</span>
                )}
                <span className={open ? 'chevron up' : 'chevron'} aria-hidden>
                  ⌄
                </span>
              </div>
            </button>

            {open && (
              <div className="place-details">
                {place.opening_hours.length > 0 && (
                  <div className="detail-block">
                    <h4>Opening hours</h4>
                    <ul className="hours">
                      {place.opening_hours.map((hours, index) => (
                        <li key={index}>
                          <span>{hours.day}</span>
                          <span>
                            {hours.open}–{hours.close}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {place.menu.length > 0 && (
                  <div className="detail-block">
                    <h4>Menu</h4>
                    {groupByDay(place.menu).map((group, gi) => (
                      <div className="menu-day" key={gi}>
                        {group.day && <h5 className="menu-day-label">{group.day}</h5>}
                        <ul className="menu">
                          {group.items.map((item, index) => (
                            <li key={index}>
                              <span className="menu-item-name">
                                {item.category && <em className="menu-cat">{item.category}: </em>}
                                {item.name}
                              </span>
                              {item.price != null && (
                                <span>
                                  € {item.price.toFixed(2)}
                                  {item.price_per_100g ? ' / 100 g' : ''}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {!hasDetails && (
                  <p className="detail-empty">No menu or opening hours yet.</p>
                )}

                <div className="detail-links">
                  {place.google_maps_uri && (
                    <a href={place.google_maps_uri} target="_blank" rel="noreferrer">
                      Open in Maps
                    </a>
                  )}
                  {place.website_uri && (
                    <a href={place.website_uri} target="_blank" rel="noreferrer">
                      Website
                    </a>
                  )}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
