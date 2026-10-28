import ReportTrackingPage from "./pages/ReportTrackingPage.jsx";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import PaymentPage from "./pages/PaymentPage.jsx";
import SetPasswordPage from "./pages/SetPasswordPage.jsx";
import PilgrimKioskPage from "./pages/PilgrimKioskPage.jsx";
import RoleDashboardRouter from "./pages/RoleDashboardRouter.jsx";

import CampaignDashboard from "./pages/CampaignDashboard.jsx";
import SupervisorDashboard from "./pages/SupervisorDashboard.jsx";
import RepresentativeDashboard from "./pages/RepresentativeDashboard.jsx";

import "./styles/WorkspaceTheme.css";
import "./styles/WorkspacePremium.css";
import "./styles/SupervisorIslamic.css";
import "./styles/IslamicWorkspace.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />

        <Route path="/track/:reportId" element={<ReportTrackingPage />} />
        <Route path="/dashboard" element={<RoleDashboardRouter />} />
        <Route path="/campaign-dashboard" element={<CampaignDashboard />} />
        <Route path="/supervisor-dashboard" element={<SupervisorDashboard />} />
        <Route path="/representative-dashboard" element={<RepresentativeDashboard />} />

        <Route path="/pilgrim-kiosk" element={<PilgrimKioskPage />} />
        <Route
          path="/pilgrim-kiosk/setup"
          element={<PilgrimKioskPage />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;