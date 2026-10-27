import { useLocation } from "react-router-dom";
import DashboardWorkspace from "./DashboardWorkspace.jsx";

export default function CampaignDashboard() {
  const location = useLocation();
  const activation = location.state?.paymentConfirmed ? location.state : readPaidCampaign();
  return <DashboardWorkspace expectedRole="CAMPAIGN_OWNER" activation={activation} />;
}

function readPaidCampaign() {
  try {
    const value = JSON.parse(sessionStorage.getItem("ons-paid-campaign") || "null");
    return value?.paymentConfirmed && value?.paymentStatus === "PAID" ? value : null;
  } catch { return null; }
}

