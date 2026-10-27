import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../auth/auth.js";
import RoleDashboardRouter from "./RoleDashboardRouter.jsx";

export default function Dashboard() {
  return getCurrentUser() ? <RoleDashboardRouter /> : <Navigate to="/login" replace />;
}
