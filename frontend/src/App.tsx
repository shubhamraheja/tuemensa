import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import FoodLookupPage from '@/pages/FoodLookupPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FoodLookupPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
