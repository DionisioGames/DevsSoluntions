import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ReservationsPage } from "./pages/ReservationsPage";
import { RoomsPage } from "./pages/RoomsPage";
import { PreviewPage } from "./pages/PreviewPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/preview" element={<PreviewPage />} />
      <Route element={<ProtectedRoute allowedRoles={["professor", "secretaria"]} />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="salas" element={<RoomsPage />} />
          <Route path="reservas" element={<ReservationsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
