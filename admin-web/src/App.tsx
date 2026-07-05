import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useApp } from "./context/AppContext";
import { Spinner } from "./components/ui";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Appointments from "./pages/Appointments";
import Treatments from "./pages/Treatments";
import Billing from "./pages/Billing";
import Staff from "./pages/Staff";
import Hospitals from "./pages/Hospitals";
import { canManage } from "./context/AppContext";

function Logout() {
  const { logout } = useApp();
  const navigate = useNavigate();
  useEffect(() => {
    logout();
    navigate("/", { replace: true });
  }, [logout, navigate]);
  return null;
}

export default function App() {
  const { me, loading, isAdmin, role, activeHospitalId } = useApp();

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "grid", placeItems: "center" }}>
        <Spinner />
      </div>
    );
  }

  if (!me) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  const manage = canManage(role);

  return (
    <Routes>
      <Route path="/logout" element={<Logout />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        {isAdmin ? (
          <Route path="hospitals" element={<Hospitals />} />
        ) : activeHospitalId ? (
          <>
            <Route path="patients" element={<Patients />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="treatments" element={<Treatments />} />
            <Route path="billing" element={<Billing />} />
            {manage && <Route path="staff" element={<Staff />} />}
          </>
        ) : null}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
