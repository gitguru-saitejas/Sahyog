import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import HospitalLayout from "./HospitalLayout";

export default function HospitalAdminLayout() {
  const { employee } = useAuth();

  // Role Protection Guard
  if (!employee) {
    return <Navigate to="/employee-login" replace />;
  }

  if (employee.role !== "HOSPITAL_ADMIN") {
    // Redirect non-admin to their respective dashboards
    if (employee.role === "DOCTOR") {
      return <Navigate to="/doctor/dashboard" replace />;
    } else if (employee.role === "SUPPORT_STAFF") {
      return <Navigate to="/support/dashboard" replace />;
    }
    return <Navigate to="/employee-login" replace />;
  }

  return (
    <HospitalLayout>
      <Outlet />
    </HospitalLayout>
  );
}
