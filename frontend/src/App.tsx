import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import MenusPage from '@/pages/MenusPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MenusPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
