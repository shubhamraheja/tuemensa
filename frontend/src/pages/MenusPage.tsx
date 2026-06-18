import {useEffect, useState} from 'react';
import {getMenus} from '@/services/menuService';
import {Menu} from '@/types';

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    getMenus({date: today})
      .then(r => setMenus(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;

  return (
    <div style={styles.container}>
      <h2>Today's Menu</h2>
      {menus.length === 0 && <p>No menus available for today.</p>}
      {menus.map(menu => (
        <div key={menu.id} style={styles.card}>
          <h3>{menu.location}</h3>
          <p style={styles.date}>{menu.date}</p>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Item</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Price</th>
              </tr>
            </thead>
            <tbody>
              {menu.items.map(item => (
                <tr key={item.id}>
                  <td style={styles.td}>{item.name}</td>
                  <td style={styles.td}>{item.category}</td>
                  <td style={styles.td}>€{item.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {padding: 24, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto'},
  card: {
    background: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
  },
  date: {color: '#666', fontSize: 13, marginTop: -8},
  table: {width: '100%', borderCollapse: 'collapse'},
  th: {textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #eee'},
  td: {padding: '8px 12px', borderBottom: '1px solid #eee'},
};
