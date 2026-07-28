import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import GlobalToast from "./components/GlobalToast";
import HospitalLayout from "./components/HospitalLayout";

// Employee Auth Pages
import Login from "./pages/auth/Login";
import ChangePassword from "./pages/auth/ChangePassword";

// Admin Subpages & Layout
import HospitalAdminLayout from "./components/HospitalAdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import DoctorManagement from "./pages/admin/DoctorManagement";
import StaffManagement from "./pages/admin/StaffManagement";
import DepartmentManagement from "./pages/admin/DepartmentManagement";

// Doctor Pages
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import PatientTimelinePage from "./pages/doctor/PatientTimelinePage";

// Support Staff Pages
import StaffDashboard from "./pages/support/StaffDashboard";
import ClinicalTriage from "./pages/support/ClinicalTriage";

// Guards
const DoctorRoute = ({ children }) => {
  const { employee } = useAuth();
  if (!employee) return <Navigate to="/employee-login" replace />;
  if (employee.role !== "DOCTOR") return <Navigate to="/employee-login" replace />;
  return <HospitalLayout>{children}</HospitalLayout>;
};

const SupportRoute = ({ children }) => {
  const { employee } = useAuth();
  if (!employee) return <Navigate to="/employee-login" replace />;
  if (employee.role !== "SUPPORT_STAFF") return <Navigate to="/employee-login" replace />;
  return <HospitalLayout>{children}</HospitalLayout>;
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/employee-login" replace />} />
          <Route path="/employee-login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />

          {/* Nested Hospital Admin routes */}
          <Route path="/hospital/admin" element={<HospitalAdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="doctors" element={<DoctorManagement />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="departments" element={<DepartmentManagement />} />
          </Route>

          {/* Doctor routes */}
          <Route
            path="/doctor/dashboard"
            element={
              <DoctorRoute>
                <DoctorDashboard />
              </DoctorRoute>
            }
          />
          <Route
            path="/doctor/timeline"
            element={
              <DoctorRoute>
                <PatientTimelinePage />
              </DoctorRoute>
            }
          />


          {/* Support Staff routes */}
          <Route
            path="/support/dashboard"
            element={
              <SupportRoute>
                <StaffDashboard />
              </SupportRoute>
            }
          />
          <Route
            path="/support/encounter"
            element={
              <SupportRoute>
                <ClinicalTriage />
              </SupportRoute>
            }
          />

          {/* Wildcard redirect */}
          <Route path="*" element={<Navigate to="/employee-login" replace />} />
        </Routes>
        <GlobalToast />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
