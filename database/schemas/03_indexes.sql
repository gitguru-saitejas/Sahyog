-- Sahyog 1.0 Optimization Indexes
-- Author: Principal Database Architect
-- Purpose: Speeds up common relational joins, RAG similarity queries, and filters out soft-deleted records.

-- =========================================================================
-- 1. FOREIGN KEY INDEXES (Required for fast joins in PostgreSQL)
-- =========================================================================

-- Module 1: Auth & Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions (user_id);

-- Module 2: Hospital & Staff
CREATE INDEX IF NOT EXISTS idx_hospital_admins_hospital ON hospital_admins (hospital_id);
CREATE INDEX IF NOT EXISTS idx_departments_hospital ON departments (hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_hospital ON doctors (hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_department ON doctors (department_id);

-- Module 3: Scheduling & Availability
CREATE INDEX IF NOT EXISTS idx_availability_doctor ON doctor_availability (doctor_id);
CREATE INDEX IF NOT EXISTS idx_availability_date ON doctor_availability (specific_date);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_doctor ON appointment_slots (doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_date_booked ON appointment_slots (date, is_booked);

-- Module 4: Patient Records
CREATE INDEX IF NOT EXISTS idx_medical_history_patient ON medical_history (patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_type ON medical_history (record_type);
CREATE INDEX IF NOT EXISTS idx_medical_documents_patient ON medical_documents (patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_documents_category ON medical_documents (category);

-- Module 5: Appointments
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments (doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_slot ON appointments (slot_id);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital ON appointments (hospital_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);

-- Module 6: Prescriptions & Adherence
CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment ON prescriptions (appointment_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions (patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions (doctor_id);
CREATE INDEX IF NOT EXISTS idx_pm_prescription ON prescription_medicines (prescription_id);
CREATE INDEX IF NOT EXISTS idx_reminders_patient ON medicine_reminders (patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_pm ON medicine_reminders (prescription_medicine_id);
CREATE INDEX IF NOT EXISTS idx_reminders_active ON medicine_reminders (is_active);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_reminder ON medicine_reminder_logs (reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_date_status ON medicine_reminder_logs (scheduled_date, status);

-- Module 7: Hospital Maps & Navigation
CREATE INDEX IF NOT EXISTS idx_maps_hospital ON hospital_maps (hospital_id);
CREATE INDEX IF NOT EXISTS idx_nodes_map ON navigation_nodes (map_id);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON navigation_nodes (type);
CREATE INDEX IF NOT EXISTS idx_edges_node_a ON navigation_edges (node_a_id);
CREATE INDEX IF NOT EXISTS idx_edges_node_b ON navigation_edges (node_b_id);

-- Module 8: Chat Sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_patient ON chat_sessions (patient_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages (created_at DESC);

-- Module 9: RAG Documents
CREATE INDEX IF NOT EXISTS idx_rag_docs_hospital ON rag_documents (hospital_id);
CREATE INDEX IF NOT EXISTS idx_rag_docs_uploaded ON rag_documents (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks (document_id);

-- Module 10: Security, Notifications & Audit
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id) WHERE read_status = FALSE;
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs (activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs (created_at DESC);

-- =========================================================================
-- 2. PARTIAL INDEXES FOR SOFT DELETES (Speeds up queries looking for active records)
-- =========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_active_email ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_active ON users (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hospitals_active ON hospitals (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_doctors_active ON doctors (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_patients_active ON patients (id) WHERE deleted_at IS NULL;

-- =========================================================================
-- 3. UNDIRECTED UNIQUENESS INDEX FOR CORRIDOR/WAY ROUTING
-- =========================================================================
-- Prevents registering identical bidirectional navigation paths, saving space and logic complexity
CREATE UNIQUE INDEX IF NOT EXISTS idx_nav_edges_undirected 
ON navigation_edges (LEAST(node_a_id, node_b_id), GREATEST(node_a_id, node_b_id));

-- =========================================================================
-- 4. TRIGRAM INDEX FOR FUZZY PATIENT/STAFF LANDMARK SEARCHES
-- =========================================================================
-- Speeds up text similarity searches for indoor landmarks (e.g., patient typing "x-ray")
CREATE INDEX IF NOT EXISTS idx_landmarks_name_trgm ON landmarks USING gin (name gin_trgm_ops);

-- =========================================================================
-- 5. VECTOR EMBEDDING (HNSW) INDEX (Requires pgvector)
-- =========================================================================
-- Configures Hierarchical Navigable Small World (HNSW) index for Cosine Similarity search.
-- m=16 (max connections per node), ef_construction=64 (depth of dynamic candidate list during build)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw 
ON document_chunks USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);
