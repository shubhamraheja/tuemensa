import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import MenusPage from '@/pages/MenusPage';
import NearbyFoodPage from '@/pages/NearbyFoodPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NearbyFoodPage />} />
        <Route path="/menus" element={<MenusPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
