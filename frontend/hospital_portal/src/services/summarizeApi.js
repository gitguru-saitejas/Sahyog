import api from "./api";

/**
 * Summarize API Client Service.
 * Provides functions to fetch and refresh patient clinical summaries.
 */
export const getPatientSummary = async (patientId) => {
  const response = await api.get(`/patients/${patientId}/summarize`);
  return response.data;
};

export const refreshPatientSummary = async (patientId) => {
  const response = await api.post(`/patients/${patientId}/summarize/refresh`);
  return response.data;
};

export const checkPatientSummaryStatus = async (patientId) => {
  const response = await api.get(`/patients/${patientId}/summarize/status`);
  return response.data;
};
