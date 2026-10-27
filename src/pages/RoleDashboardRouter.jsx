import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../auth/auth.js";
import CampaignDashboard from "./CampaignDashboard.jsx";
import SupervisorDashboard from "./SupervisorDashboard.jsx";
import RepresentativeDashboard from "./RepresentativeDashboard.jsx";
import AdminDashboard from "./AdminDashboard.jsx";
import FieldStaffDashboard from "./FieldStaffDashboard.jsx";

export default function RoleDashboardRouter() {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case "ADMIN":
      return <AdminDashboard />;
    case "FIELD_STAFF":
      return <FieldStaffDashboard />;
    case "CAMPAIGN_ADMIN":
    case "CAMPAIGN_OWNER":
      return <CampaignDashboard />;
    case "SUPERVISOR":
      return <SupervisorDashboard />;
    case "REPRESENTATIVE":
    case "REGULAR_EMPLOYEE":
      return <RepresentativeDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
}
