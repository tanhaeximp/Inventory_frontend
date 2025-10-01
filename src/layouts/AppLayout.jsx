// src/layouts/AppLayout.jsx
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function AppLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // clear token or whatever you use
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar handleLogout={handleLogout}>
      {/* Page body area */}
      <div className="min-h-screen bg-gray-50">
        <Outlet />
      </div>
    </Sidebar>
  );
}
