import axios from "axios";

// Create custom event system for notifications (toasts) and loading states
export const apiEvents = {
  listeners: {},
  subscribe(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  },
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  timeout: 180000, // increased timeout to handle slower backend responses
  headers: {
    "Content-Type": "application/json",
  }
});

// Request Interceptor: Attach Auth Token and Patient ID
api.interceptors.request.use(
  (config) => {
    apiEvents.emit("loading", true);
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const patientId = localStorage.getItem("selectedPatientId");
    if (patientId) {
      config.headers["X-Patient-ID"] = patientId;
    }
    return config;
  },
  (error) => {
    apiEvents.emit("loading", false);
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle errors globally
api.interceptors.response.use(
  (response) => {
    apiEvents.emit("loading", false);
    return response;
  },
  async (error) => {
    apiEvents.emit("loading", false);
    let message = "An unexpected error occurred.";
    
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const parsed = JSON.parse(text);
        if (parsed?.detail) {
          if (typeof parsed.detail === "string") {
            message = parsed.detail;
          } else if (Array.isArray(parsed.detail)) {
            message = parsed.detail.map(d => `${d.loc ? d.loc.join('.') : 'Error'}: ${d.msg}`).join(', ');
          } else {
            message = JSON.stringify(parsed.detail);
          }
        } else if (parsed?.message) {
          message = parsed.message;
        }
      } catch (e) {
        // Fallback if parsing fails
      }
    } else if (error.response?.data?.detail) {
      if (typeof error.response.data.detail === "string") {
        message = error.response.data.detail;
      } else if (Array.isArray(error.response.data.detail)) {
        message = error.response.data.detail.map(d => `${d.loc ? d.loc.join('.') : 'Error'}: ${d.msg}`).join(', ');
      } else {
        message = JSON.stringify(error.response.data.detail);
      }
    } else if (error.response?.data?.message) {
      message = error.response.data.message;
    } else if (error.message) {
      message = error.message;
    }
    
    apiEvents.emit("toast", { type: "error", message });
    return Promise.reject(error);
  }
);

// =========================================================================
// HIGH-FIDELITY CLIENT-SIDE MOCK LAYER
// =========================================================================
// Set VITE_USE_MOCK to true to simulate PostgreSQL locally in localStorage, 
// or set to false to connect directly to the live Python FastAPI backend on port 8000.
const VITE_USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

const initMockDb = () => {
  if (!localStorage.getItem("mock_initialized")) {
    const defaultAccounts = [
      { id: "acc-1", phone_number: "9876543210", password_hash: "password123" }, // Single member account
      { id: "acc-2", phone_number: "9876543222", password_hash: "password123" }  // Multi member family account
    ];

    const defaultPatients = [
      {
        id: "pat-1",
        family_account_id: "acc-1",
        first_name: "Aarav",
        last_name: "Sharma",
        date_of_birth: "1992-05-15",
        gender: "MALE",
        blood_group: "O+",
        relation: "SELF",
        aadhaar_hash: "hash_111122224567",
        aadhaar_last4: "4567",
        address_line1: "Flat 402, Sunshine Apts",
        address_line2: "Sector 15, Vashi",
        city: "Navi Mumbai",
        district: "Thane",
        state: "Maharashtra",
        pincode: "400703"
      },
      {
        id: "pat-2",
        family_account_id: "acc-2",
        first_name: "Rajesh",
        last_name: "Verma",
        date_of_birth: "1975-08-20",
        gender: "MALE",
        blood_group: "A+",
        relation: "SELF",
        aadhaar_hash: "hash_111122228899",
        aadhaar_last4: "8899",
        address_line1: "House No 42",
        address_line2: "Mall Road",
        city: "Shimla",
        district: "Shimla",
        state: "Himachal Pradesh",
        pincode: "171001"
      },
      {
        id: "pat-3",
        family_account_id: "acc-2",
        first_name: "Pooja",
        last_name: "Verma",
        date_of_birth: "1978-11-12",
        gender: "FEMALE",
        blood_group: "AB+",
        relation: "SPOUSE",
        aadhaar_hash: "hash_111122221234",
        aadhaar_last4: "1234",
        address_line1: "House No 42",
        address_line2: "Mall Road",
        city: "Shimla",
        district: "Shimla",
        state: "Himachal Pradesh",
        pincode: "171001"
      },
      {
        id: "pat-4",
        family_account_id: "acc-2",
        first_name: "Karan",
        last_name: "Verma",
        date_of_birth: "2010-04-05",
        gender: "MALE",
        blood_group: "O-",
        relation: "SON",
        aadhaar_hash: "hash_111122225678",
        aadhaar_last4: "5678",
        address_line1: "House No 42",
        address_line2: "Mall Road",
        city: "Shimla",
        district: "Shimla",
        state: "Himachal Pradesh",
        pincode: "171001"
      }
    ];

    const defaultContacts = [
      { id: "c-1", patient_id: "pat-1", name: "Sunita Sharma", relationship: "Mother", phone_number: "9876543211" },
      { id: "c-2", patient_id: "pat-2", name: "Pooja Verma", relationship: "Spouse", phone_number: "9876543223" }
    ];

    const defaultConditions = [
      { id: "con-1", patient_id: "pat-2", condition_name: "Hypertension", diagnosed_date: "2020-01-10", status: "ACTIVE" },
      { id: "con-2", patient_id: "pat-3", condition_name: "Migraine", diagnosed_date: "2021-06-15", status: "ACTIVE" }
    ];

    const defaultAllergies = [
      { id: "al-1", patient_id: "pat-1", allergen: "Peanuts", severity: "HIGH" },
      { id: "al-2", patient_id: "pat-4", allergen: "Dust Mites", severity: "LOW" }
    ];

    const defaultMedications = [
      { id: "med-1", patient_id: "pat-2", medicine_name: "Amlodipine", dosage: "5mg", frequency: "Once daily" }
    ];

    localStorage.setItem("mock_accounts", JSON.stringify(defaultAccounts));
    localStorage.setItem("mock_patients", JSON.stringify(defaultPatients));
    localStorage.setItem("mock_contacts", JSON.stringify(defaultContacts));
    localStorage.setItem("mock_conditions", JSON.stringify(defaultConditions));
    localStorage.setItem("mock_allergies", JSON.stringify(defaultAllergies));
    localStorage.setItem("mock_medications", JSON.stringify(defaultMedications));
    localStorage.setItem("mock_otps", JSON.stringify([]));
    localStorage.setItem("mock_initialized", "true");
  }
};

initMockDb();

const getDb = (key) => JSON.parse(localStorage.getItem(key) || "[]");
const setDb = (key, val) => localStorage.setItem(key, JSON.stringify(val));

const mockAdapter = async (url, data, method = "POST") => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  if (url === "/auth/login") {
    const { phone_number, password, login_type } = data;
    const accounts = getDb("mock_accounts");
    const account = accounts.find(a => a.phone_number === phone_number);

    if (!account) {
      throw { response: { data: { message: "Account not registered." } } };
    }

    if (login_type === "password" && account.password_hash !== password) {
      throw { response: { data: { message: "Invalid password." } } };
    }

    // OTP validation is bypassed for demo verification or handled separately
    const patients = getDb("mock_patients").filter(p => p.family_account_id === account.id);
    return {
      data: {
        accessToken: `mock-jwt-token-for-${account.id}`,
        family_account_id: account.id,
        patients
      }
    };
  }

  if (url === "/auth/otp/send") {
    const { phone_number } = data;
    // Store generated OTP code
    const otps = getDb("mock_otps").filter(o => o.phone_number !== phone_number);
    const mockOtp = "123456"; // Default standard code for testing
    otps.push({ phone_number, code: mockOtp, expires_at: Date.now() + 180000 });
    setDb("mock_otps", otps);
    return { data: { message: "OTP sent successfully. Use 123456 to verify." } };
  }

  if (url === "/auth/otp/verify") {
    const { phone_number, code } = data;
    const otps = getDb("mock_otps");
    const match = otps.find(o => o.phone_number === phone_number && o.code === code);

    if (!match) {
      throw { response: { data: { message: "Invalid OTP code." } } };
    }

    if (match.expires_at < Date.now()) {
      throw { response: { data: { message: "OTP has expired." } } };
    }

    // Remove OTP after verification
    setDb("mock_otps", otps.filter(o => o.phone_number !== phone_number));

    // Get or auto-create account for this verified mobile
    const accounts = getDb("mock_accounts");
    let account = accounts.find(a => a.phone_number === phone_number);
    if (!account) {
      account = { id: `acc-${Date.now()}`, phone_number, password_hash: "password123" };
      accounts.push(account);
      setDb("mock_accounts", accounts);
    }

    const patients = getDb("mock_patients").filter(p => p.family_account_id === account.id);
    return {
      data: {
        accessToken: `mock-jwt-token-for-${account.id}`,
        family_account_id: account.id,
        patients
      }
    };
  }

  if (url === "/auth/register") {
    const { credentials, personal, address, emergency, medical, consent } = data;
    const accounts = getDb("mock_accounts");
    const patients = getDb("mock_patients");

    if (accounts.some(a => a.phone_number === credentials.phone_number)) {
      throw { response: { data: { message: "Phone number already registered." } } };
    }

    const aadhaarHash = `hash_${personal.aadhaar}`;
    if (patients.some(p => p.aadhaar_hash === aadhaarHash)) {
      throw { response: { data: { message: "Aadhaar number is already linked to another patient profile." } } };
    }

    // Create Account
    const accId = `acc-${Date.now()}`;
    const newAccount = { id: accId, phone_number: credentials.phone_number, password_hash: credentials.password };
    accounts.push(newAccount);
    setDb("mock_accounts", accounts);

    // Create Patient Profile
    const patId = `pat-${Date.now()}`;
    const newPatient = {
      id: patId,
      family_account_id: accId,
      first_name: personal.first_name,
      last_name: personal.last_name,
      date_of_birth: personal.dob,
      gender: personal.gender,
      blood_group: personal.blood_group,
      relation: "SELF",
      aadhaar_hash: aadhaarHash,
      aadhaar_last4: personal.aadhaar.slice(-4),
      address_line1: address.address_line1,
      address_line2: address.address_line2 || "",
      city: address.city,
      district: address.district,
      state: address.state,
      pincode: address.pincode
    };
    patients.push(newPatient);
    setDb("mock_patients", patients);

    // Save contacts
    const contacts = getDb("mock_contacts");
    contacts.push({
      id: `c-${Date.now()}`,
      patient_id: patId,
      name: emergency.name,
      relationship: emergency.relationship,
      phone_number: emergency.phone_number
    });
    setDb("mock_contacts", contacts);

    // Save conditions
    if (medical.diseases) {
      const conditions = getDb("mock_conditions");
      conditions.push({
        id: `con-${Date.now()}`,
        patient_id: patId,
        condition_name: medical.diseases,
        diagnosed_date: new Date().toISOString().split('T')[0],
        status: "ACTIVE"
      });
      setDb("mock_conditions", conditions);
    }

    // Save allergies
    if (medical.allergies) {
      const allergies = getDb("mock_allergies");
      allergies.push({
        id: `al-${Date.now()}`,
        patient_id: patId,
        allergen: medical.allergies,
        severity: "MEDIUM"
      });
      setDb("mock_allergies", allergies);
    }

    // Save medications
    if (medical.medications) {
      const medications = getDb("mock_medications");
      medications.push({
        id: `med-${Date.now()}`,
        patient_id: patId,
        medicine_name: medical.medications,
        dosage: "As directed",
        frequency: "Standard"
      });
      setDb("mock_medications", medications);
    }

    // Save consents
    const consents = getDb("mock_consents");
    consents.push({
      id: `con-${Date.now()}`,
      patient_id: patId,
      consent_type: "TERMS_AND_DATA",
      accepted: consent.agreeTerms && consent.consentStorage,
      accepted_at: new Date().toISOString(),
      ip_address: "127.0.0.1",
      version: "1.0"
    });

    return {
      data: {
        message: "Registration successful. Triggering OTP verification.",
        phone_number: credentials.phone_number
      }
    };
  }

  if (url === "/auth/forgot-password/request") {
    const { phone_number } = data;
    const accounts = getDb("mock_accounts");
    if (!accounts.some(a => a.phone_number === phone_number)) {
      throw { response: { data: { message: "Account with this mobile number does not exist." } } };
    }
    const mockOtp = "654321";
    const otps = getDb("mock_otps").filter(o => o.phone_number !== phone_number);
    otps.push({ phone_number, code: mockOtp, expires_at: Date.now() + 180000 });
    setDb("mock_otps", otps);
    return { data: { message: "OTP sent. Use 654321 to verify and reset password." } };
  }

  if (url === "/auth/forgot-password/reset") {
    const { phone_number, otp_code, new_password } = data;
    const otps = getDb("mock_otps");
    const match = otps.find(o => o.phone_number === phone_number && o.code === otp_code);
    if (!match) {
      throw { response: { data: { message: "Invalid OTP code." } } };
    }

    const accounts = getDb("mock_accounts");
    const idx = accounts.findIndex(a => a.phone_number === phone_number);
    if (idx === -1) {
      throw { response: { data: { message: "Account not found." } } };
    }

    accounts[idx].password_hash = new_password;
    setDb("mock_accounts", accounts);
    setDb("mock_otps", otps.filter(o => o.phone_number !== phone_number));

    return { data: { message: "Password updated successfully." } };
  }

  if (url === "/patients" && method === "POST") {
    const { patientData, family_account_id } = data;
    const patients = getDb("mock_patients");

    const aadhaarHash = `hash_${patientData.aadhaar}`;
    if (patients.some(p => p.aadhaar_hash === aadhaarHash)) {
      throw { response: { data: { message: "Aadhaar number is already linked." } } };
    }

    const newPatient = {
      id: `pat-${Date.now()}`,
      family_account_id,
      first_name: patientData.first_name,
      last_name: patientData.last_name,
      date_of_birth: patientData.dob,
      gender: patientData.gender,
      blood_group: patientData.blood_group,
      relation: patientData.relation,
      aadhaar_hash: aadhaarHash,
      aadhaar_last4: patientData.aadhaar.slice(-4),
      address_line1: patientData.address_line1,
      address_line2: patientData.address_line2 || "",
      city: patientData.city,
      district: patientData.district,
      state: patientData.state,
      pincode: patientData.pincode
    };

    patients.push(newPatient);
    setDb("mock_patients", patients);

    // Save emergency contact
    const contacts = getDb("mock_contacts");
    contacts.push({
      id: `c-${Date.now()}`,
      patient_id: newPatient.id,
      name: patientData.emergency_name,
      relationship: patientData.emergency_relationship,
      phone_number: patientData.emergency_phone
    });
    setDb("mock_contacts", contacts);

    return { data: { message: "Family member added successfully.", patient: newPatient } };
  }

  if (url === "/patients/link" && method === "POST") {
    const { family_account_id, phone_number, otp_code, patient_aadhaar } = data;
    
    // Verify phone number + OTP
    const otps = getDb("mock_otps");
    const match = otps.find(o => o.phone_number === phone_number && o.code === otp_code);
    if (!match) {
      throw { response: { data: { message: "Invalid OTP code." } } };
    }

    // Find the target patient profile having this Aadhaar
    const patients = getDb("mock_patients");
    const targetAadhaarHash = `hash_${patient_aadhaar}`;
    const pIdx = patients.findIndex(p => p.aadhaar_hash === targetAadhaarHash);
    
    if (pIdx === -1) {
      throw { response: { data: { message: "Patient profile with specified Aadhaar not found." } } };
    }

    // Re-link the family_account_id to the target family account
    patients[pIdx].family_account_id = family_account_id;
    setDb("mock_patients", patients);
    setDb("mock_otps", otps.filter(o => o.phone_number !== phone_number));

    return { data: { message: "Profile linked successfully.", patient: patients[pIdx] } };
  }
  
  if (url === "/patient-guidance/ask" && method === "POST") {
    const { question, patient_id, hospital_id, session_id, guidance_topic } = data;
    if (!question || !question.trim()) {
      throw { response: { status: 400, data: { detail: "Question cannot be empty or only whitespace." } } };
    }
    if (question.length > 1000) {
      throw { response: { status: 400, data: { detail: "Question exceeds maximum allowed length of 1000 characters." } } };
    }

    if (guidance_topic) {
      const allowed = ["PREGNANCY", "DIABETES", "HYPERTENSION", "NUTRITION", "CHILD_HEALTH"];
      const normalized = guidance_topic.trim().toUpperCase();
      if (!allowed.includes(normalized)) {
        throw { response: { status: 400, data: { detail: `Invalid guidance topic. Must be one of ${allowed.join(", ")}` } } };
      }
    }
    
    // Simulate zero-result fallback for a specific test query to test zero-context scenarios
    if (question.toLowerCase().includes("blood group")) {
      return {
        data: {
          answer: "I'm sorry, but I couldn't find any relevant patient guidance information in the knowledge base.",
          sources: [],
          session_id: session_id || `mock-session-${Date.now()}`
        }
      };
    }

    if (guidance_topic) {
      const normalized = guidance_topic.trim().toUpperCase();
      if (normalized === "PREGNANCY") {
        return {
          data: {
            answer: "Mock Pregnancy guidance response.",
            sources: [
              { document_title: "Mock Pregnancy Guidance", similarity_score: 0.91 }
            ],
            session_id: session_id || `mock-session-pregnancy-${Date.now()}`
          }
        };
      }
      if (normalized === "DIABETES") {
        return {
          data: {
            answer: "Mock Diabetes guidance response.",
            sources: [
              { document_title: "Mock Diabetes Guidance", similarity_score: 0.91 }
            ],
            session_id: session_id || `mock-session-diabetes-${Date.now()}`
          }
        };
      }
      if (normalized === "HYPERTENSION") {
        return {
          data: {
            answer: "Mock Hypertension guidance response.",
            sources: [
              { document_title: "Mock Hypertension Guidance", similarity_score: 0.91 }
            ],
            session_id: session_id || `mock-session-hypertension-${Date.now()}`
          }
        };
      }
    }

    // Default mock response
    return {
      data: {
        answer: `This is a mocked health guidance response for patient ${patient_id}. You asked: "${question}". Make sure to follow exercise and salt-reduction guidelines.`,
        sources: [
          { document_title: "Hypertension Patient Guidance", similarity_score: 0.82 }
        ],
        session_id: session_id || `mock-session-${Date.now()}`
      }
    };
  }

  throw { response: { data: { message: "Route not found in Mock API." } } };
};

// Override axios request layer if mock mode is on
const mockInstance = {
  post: async (url, data, config) => {
    if (VITE_USE_MOCK) {
      apiEvents.emit("loading", true);
      try {
        const response = await mockAdapter(url, data, "POST");
        apiEvents.emit("loading", false);
        return response;
      } catch (err) {
        apiEvents.emit("loading", false);
        const msg = err.response?.data?.message || "Mock server error";
        apiEvents.emit("toast", { type: "error", message: msg });
        throw err;
      }
    }
    return api.post(url, data, config);
  },
  get: async (url, config) => {
    if (VITE_USE_MOCK) {
      apiEvents.emit("loading", true);
      try {
        let response = { data: [] };
        if (url === "/patients") {
          const accId = localStorage.getItem("familyAccountId");
          const patients = getDb("mock_patients").filter(p => p.family_account_id === accId);
          response = { data: patients };
        }
        apiEvents.emit("loading", false);
        return response;
      } catch (err) {
        apiEvents.emit("loading", false);
        throw err;
      }
    }
    return api.get(url, config);
  }
};

export default mockInstance;
