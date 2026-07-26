-- Sahyog 1.0 Mock Seed Data Script
-- Author: Principal Database Architect
-- Purpose: Prepopulates the database with relational test data for validation and development testing.

-- =========================================================================
-- 1. BASE SYSTEM USERS
-- =========================================================================

-- Password hashes are mock representations (e.g. Bcrypt of 'password123')
INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, role) VALUES
-- Super Admin
('a3f8b056-b09a-4c22-b2f7-bd2fe084360e', 'superadmin@sahyog.org', '$2b$12$K3y8u5aM7HkI2U2R7Nf8eO2C4q5r6s7t8u9v0w1x2y3z4a5b6c7d8', 'Super', 'Admin', '+919999999999', 'SUPER_ADMIN'),
-- Hospital Admins
('b5e9c058-29cf-4a37-9759-4d6cb2579dfd', 'admin.city@sahyog.org', '$2b$12$K3y8u5aM7HkI2U2R7Nf8eO2C4q5r6s7t8u9v0w1x2y3z4a5b6c7d8', 'Ramesh', 'Sharma', '+919876543210', 'HOSPITAL_ADMIN'),
('c7a0d159-a78b-4b13-8fc6-3e8df26fcd92', 'admin.metro@sahyog.org', '$2b$12$K3y8u5aM7HkI2U2R7Nf8eO2C4q5r6s7t8u9v0w1x2y3z4a5b6c7d8', 'Sarah', 'D''Souza', '+919876543211', 'HOSPITAL_ADMIN'),
-- Doctors
('d2c3e456-11aa-22bb-cc33-dd44ee55ff66', 'dr.vijay@sahyog.org', '$2b$12$K3y8u5aM7HkI2U2R7Nf8eO2C4q5r6s7t8u9v0w1x2y3z4a5b6c7d8', 'Vijay', 'Kumar', '+919111222333', 'DOCTOR'),
('e4d5f678-22bb-33cc-dd44-ee55ff66aa77', 'dr.anitha@sahyog.org', '$2b$12$K3y8u5aM7HkI2U2R7Nf8eO2C4q5r6s7t8u9v0w1x2y3z4a5b6c7d8', 'Anitha', 'Reddy', '+919222333444', 'DOCTOR'),
-- Patients
('f5e6a789-33cc-44dd-ee55-ff66aa77bb88', 'patient.prajwal@gmail.com', '$2b$12$K3y8u5aM7HkI2U2R7Nf8eO2C4q5r6s7t8u9v0w1x2y3z4a5b6c7d8', 'Prajwal', 'Gupta', '+919333444555', 'PATIENT'),
('a1b2c3d4-44dd-55ee-ff66-aa77bb88cc99', 'patient.rohit@gmail.com', '$2b$12$K3y8u5aM7HkI2U2R7Nf8eO2C4q5r6s7t8u9v0w1x2y3z4a5b6c7d8', 'Rohit', 'Verma', '+919444555666', 'PATIENT')
ON CONFLICT (email) DO NOTHING;

-- =========================================================================
-- 2. HOSPITALS & DEPARTMENTS
-- =========================================================================

INSERT INTO hospitals (id, name, address, contact_number, email, logo_url) VALUES
('11111111-1111-1111-1111-111111111111', 'City General Hospital', '123 Healthcare Lane, New Delhi, 110001', '+911123456789', 'contact@citygeneral.org', 'https://storage.sahyog.org/logos/city_general.png'),
('22222222-2222-2222-2222-222222222222', 'Metro Cardiology & Specialty Center', '456 Cardiac Ring Road, Bangalore, 560001', '+918023456789', 'info@metrocardio.org', 'https://storage.sahyog.org/logos/metro_cardio.png')
ON CONFLICT (email) DO NOTHING;

-- Assign Hospital Admins to Hospitals
INSERT INTO hospital_admins (id, user_id, hospital_id) VALUES
(uuid_generate_v4(), 'b5e9c058-29cf-4a37-9759-4d6cb2579dfd', '11111111-1111-1111-1111-111111111111'),
(uuid_generate_v4(), 'c7a0d159-a78b-4b13-8fc6-3e8df26fcd92', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (user_id) DO NOTHING;

-- Departments in City General
INSERT INTO departments (id, hospital_id, name, description) VALUES
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Cardiology', 'Heart diagnostics and surgical services'),
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Pediatrics', 'Comprehensive care for newborn infants and adolescents')
ON CONFLICT (hospital_id, name) DO NOTHING;

-- =========================================================================
-- 3. DOCTORS & PATIENT PROFILES
-- =========================================================================

-- Doctors
INSERT INTO doctors (id, user_id, hospital_id, department_id, license_number, specialization, experience_years, bio, consultation_fee) VALUES
('55555555-5555-5555-5555-555555555555', 'd2c3e456-11aa-22bb-cc33-dd44ee55ff66', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'MC-10293', 'Interventional Cardiologist', 15, 'Dr. Vijay Kumar is a specialist in angioplasty and cardiac stenting.', 800.00),
('66666666-6666-6666-6666-666666666666', 'e4d5f678-22bb-33cc-dd44-ee55ff66aa77', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'MC-39485', 'Pediatric Nephrologist', 8, 'Dr. Anitha Reddy specializes in children kidney conditions and health checkups.', 600.00)
ON CONFLICT (user_id) DO NOTHING;

-- Patients
INSERT INTO patients (id, user_id, date_of_birth, gender, blood_group, emergency_contact_name, emergency_contact_phone, address) VALUES
('77777777-7777-7777-7777-777777777777', 'f5e6a789-33cc-44dd-ee55-ff66aa77bb88', '1995-08-12', 'MALE', 'O+', 'Surendra Gupta', '+919988776655', 'Apartment 4B, Vasundhara Enclave, Delhi'),
('88888888-8888-8888-8888-888888888888', 'a1b2c3d4-44dd-55ee-ff66-aa77bb88cc99', '1988-04-20', 'MALE', 'A-', 'Nisha Verma', '+919988776644', 'Sector 15, Dwarka, Delhi')
ON CONFLICT (user_id) DO NOTHING;

-- =========================================================================
-- 4. AVAILABILITY & APPOINTMENT SLOTS
-- =========================================================================

-- Recurring availability: Monday (1) and Wednesday (3) for Dr. Vijay Kumar (09:00 to 12:00)
INSERT INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes) VALUES
(uuid_generate_v4(), '55555555-5555-5555-5555-555555555555', 1, '09:00:00', '12:00:00', 30),
(uuid_generate_v4(), '55555555-5555-5555-5555-555555555555', 3, '09:00:00', '12:00:00', 30);

-- Generate Physical Slots for 2026-07-27 (Monday)
INSERT INTO appointment_slots (id, doctor_id, date, start_time, end_time, is_booked) VALUES
('99999999-9999-9999-9999-999999999901', '55555555-5555-5555-5555-555555555555', '2026-07-27', '09:00:00', '09:30:00', TRUE),
('99999999-9999-9999-9999-999999999902', '55555555-5555-5555-5555-555555555555', '2026-07-27', '09:30:00', '10:00:00', FALSE),
('99999999-9999-9999-9999-999999999903', '55555555-5555-5555-5555-555555555555', '2026-07-27', '10:00:00', '10:30:00', FALSE)
ON CONFLICT (doctor_id, date, start_time) DO NOTHING;

-- =========================================================================
-- 5. APPOINTMENTS, CLINICAL RECORDS & PRESCRIPTIONS
-- =========================================================================

-- Appointment
INSERT INTO appointments (id, patient_id, doctor_id, slot_id, hospital_id, status, reason_for_visit) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', '99999999-9999-9999-9999-999999999901', '11111111-1111-1111-1111-111111111111', 'COMPLETED', 'Regular cardiovascular checkup and minor breathing heaviness.')
ON CONFLICT (slot_id) DO NOTHING;

-- Prescription
INSERT INTO prescriptions (id, appointment_id, patient_id, doctor_id, diagnosis, notes, issued_date) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', 'Mild hypertension. Heart rate normal. ECG normal.', 'Reduce sodium intake. Walk 30 minutes daily. Follow up in 1 month.', '2026-07-27')
ON CONFLICT (appointment_id) DO NOTHING;

-- Prescription Line Items
INSERT INTO prescription_medicines (id, prescription_id, medicine_name, dosage, frequency, duration_days, instructions) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Amlodipine 5mg', '1 Tablet', 'Once daily (morning)', 30, 'Take after breakfast');

-- Medicine Reminder configuration
INSERT INTO medicine_reminders (id, patient_id, prescription_medicine_id, reminder_time, is_active, start_date, end_date) VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd', '77777777-7777-7777-7777-777777777777', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '08:30:00', TRUE, '2026-07-27', '2026-08-26')
ON CONFLICT DO NOTHING;

-- Compliance Adherence Logs
INSERT INTO medicine_reminder_logs (id, reminder_id, scheduled_date, status, taken_at) VALUES
(uuid_generate_v4(), 'dddddddd-dddd-dddd-dddd-dddddddddddd', '2026-07-27', 'TAKEN', '2026-07-27 08:35:04+05:30'),
(uuid_generate_v4(), 'dddddddd-dddd-dddd-dddd-dddddddddddd', '2026-07-28', 'PENDING', NULL)
ON CONFLICT (reminder_id, scheduled_date) DO NOTHING;

-- Patient Medical History
INSERT INTO medical_history (id, patient_id, record_type, title, description, diagnosed_date, resolved_date, severity, created_by) VALUES
(uuid_generate_v4(), '77777777-7777-7777-7777-777777777777', 'ALLERGY', 'Penicillin Allergy', 'Triggers skin hives and moderate breathing congestion.', '2015-05-10', NULL, 'HIGH', 'd2c3e456-11aa-22bb-cc33-dd44ee55ff66')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 6. INDOOR NAVIGATION GRAPH DATA (City General Ground Floor Map)
-- =========================================================================

-- Ground Floor Map
INSERT INTO hospital_maps (id, hospital_id, floor_number, floor_name, map_image_url, scale_pixels_per_meter) VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 0, 'Ground Floor', 'https://storage.sahyog.org/maps/ground_floor.svg', 12.5000)
ON CONFLICT (hospital_id, floor_number) DO NOTHING;

-- Navigation Nodes
INSERT INTO navigation_nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES
('00000000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 50.00, 100.00, 'ENTRANCE'),
('00000000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 150.00, 100.00, 'RECEPTION'),
('00000000-0000-0000-0000-000000000003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 250.00, 100.00, 'CORRIDOR'),
('00000000-0000-0000-0000-000000000004', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 250.00, 200.00, 'ROOM'),
('00000000-0000-0000-0000-000000000005', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 350.00, 100.00, 'PHARMACY')
ON CONFLICT DO NOTHING;

-- Bidirectional Edges between physical nodes
INSERT INTO navigation_edges (id, node_a_id, node_b_id, distance_meters, is_handicap_accessible, edge_type) VALUES
-- Entrance to Reception (100 px / 12.5 px/m = 8 meters)
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 8.00, TRUE, 'WALKWAY'),
-- Reception to Corridor (100 px = 8 meters)
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 8.00, TRUE, 'WALKWAY'),
-- Corridor to Cardiology Room (100 px = 8 meters)
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 8.00, TRUE, 'WALKWAY'),
-- Corridor to Pharmacy (100 px = 8 meters)
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', 8.00, TRUE, 'WALKWAY')
ON CONFLICT DO NOTHING;

-- Searchable POIs (Landmarks)
INSERT INTO landmarks (id, node_id, name, description) VALUES
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'Main Gate Gate-A', 'Main pedestrian lobby entrance'),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000002', 'General Help Desk', 'Information desk and patient registration'),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000004', 'Cardiology Clinic Room 1', 'Dr. Vijay Kumar''s consulting chambers')
ON CONFLICT (node_id) DO NOTHING;

-- =========================================================================
-- 7. AI KNOWLEDGE BASE & pgvector CHUNKS
-- =========================================================================

-- Knowledge document
INSERT INTO rag_documents (id, hospital_id, uploaded_by, title, file_url, category, version) VALUES
('ffffffff-ffff-ffff-ffff-ffffffffffff', NULL, 'a3f8b056-b09a-4c22-b2f7-bd2fe084360e', 'Global Hypertension Treatment Standard guidelines', 'https://storage.sahyog.org/rag/hypertension_guidelines.pdf', 'CLINICAL_STANDARDS', '1.2')
ON CONFLICT DO NOTHING;

-- Vector embedding chunks (1536 dimensions mock vectors, mostly zeros with test coordinates)
-- In production, the FastAPI app calculates this via Ollama or OpenAI embed models.
INSERT INTO document_chunks (id, document_id, chunk_index, content, embedding) VALUES
(uuid_generate_v4(), 'ffffffff-ffff-ffff-ffff-ffffffffffff', 1, 
 'Hypertension management requires dietary adjustments. Sodium intake should be restricted to less than 2 grams per day (equivalent to 5 grams of salt). Regular physical activity such as walking 30 minutes daily improves cardiac output and reduces vascular stiffness.', 
 -- Array format casted to pgvector
 ARRAY_FILL(0.01::float, ARRAY[1024])::vector
),
(uuid_generate_v4(), 'ffffffff-ffff-ffff-ffff-ffffffffffff', 2, 
 'Pharmacological therapies for blood pressure: Angiotensin-Converting Enzyme (ACE) inhibitors, Beta-Blockers, and Calcium Channel Blockers like Amlodipine are primary choices. Dosage ranges from 2.5mg to 10mg daily based on target blood pressure thresholds.', 
 ARRAY_FILL(0.02::float, ARRAY[1024])::vector
)
ON CONFLICT (document_id, chunk_index) DO NOTHING;
