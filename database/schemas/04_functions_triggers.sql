-- Sahyog 1.0 Database Functions and Triggers
-- Author: Principal Database Architect
-- Purpose: Automation of updated_at timestamps, HIPAA-compliant audit trails, and data integrity checks.

-- =========================================================================
-- 1. AUTOMATIC UPDATED_AT TIMESTAMP TRIGGER
-- =========================================================================

-- Trigger function to update the updated_at field on row mutation
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers to tables requiring updated_at tracking
-- Each trigger is drop-guarded to be safely re-runnable

DROP TRIGGER IF EXISTS tg_users_timestamp ON users;
CREATE TRIGGER tg_users_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_hospitals_timestamp ON hospitals;
CREATE TRIGGER tg_hospitals_timestamp BEFORE UPDATE ON hospitals FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_hospital_admins_timestamp ON hospital_admins;
CREATE TRIGGER tg_hospital_admins_timestamp BEFORE UPDATE ON hospital_admins FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_departments_timestamp ON departments;
CREATE TRIGGER tg_departments_timestamp BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_doctors_timestamp ON doctors;
CREATE TRIGGER tg_doctors_timestamp BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_doctor_availability_timestamp ON doctor_availability;
CREATE TRIGGER tg_doctor_availability_timestamp BEFORE UPDATE ON doctor_availability FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_appointment_slots_timestamp ON appointment_slots;
CREATE TRIGGER tg_appointment_slots_timestamp BEFORE UPDATE ON appointment_slots FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_patients_timestamp ON patients;
CREATE TRIGGER tg_patients_timestamp BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_medical_history_timestamp ON medical_history;
CREATE TRIGGER tg_medical_history_timestamp BEFORE UPDATE ON medical_history FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_medical_documents_timestamp ON medical_documents;
CREATE TRIGGER tg_medical_documents_timestamp BEFORE UPDATE ON medical_documents FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_appointments_timestamp ON appointments;
CREATE TRIGGER tg_appointments_timestamp BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_prescriptions_timestamp ON prescriptions;
CREATE TRIGGER tg_prescriptions_timestamp BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_medicine_reminders_timestamp ON medicine_reminders;
CREATE TRIGGER tg_medicine_reminders_timestamp BEFORE UPDATE ON medicine_reminders FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_medicine_reminder_logs_timestamp ON medicine_reminder_logs;
CREATE TRIGGER tg_medicine_reminder_logs_timestamp BEFORE UPDATE ON medicine_reminder_logs FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_hospital_maps_timestamp ON hospital_maps;
CREATE TRIGGER tg_hospital_maps_timestamp BEFORE UPDATE ON hospital_maps FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_navigation_nodes_timestamp ON navigation_nodes;
CREATE TRIGGER tg_navigation_nodes_timestamp BEFORE UPDATE ON navigation_nodes FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_navigation_edges_timestamp ON navigation_edges;
CREATE TRIGGER tg_navigation_edges_timestamp BEFORE UPDATE ON navigation_edges FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_landmarks_timestamp ON landmarks;
CREATE TRIGGER tg_landmarks_timestamp BEFORE UPDATE ON landmarks FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_chat_sessions_timestamp ON chat_sessions;
CREATE TRIGGER tg_chat_sessions_timestamp BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tg_rag_documents_timestamp ON rag_documents;
CREATE TRIGGER tg_rag_documents_timestamp BEFORE UPDATE ON rag_documents FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- =========================================================================
-- 2. HIPAA COMPLIANT IMMUTABLE AUDIT LOG TRIGGER
-- =========================================================================

-- Trigger function to prevent updates or deletions on audit logs (Write-Once enforcement)
CREATE OR REPLACE FUNCTION fn_enforce_audit_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'HIPAA Compliance Violation: Deletion or modification of database audit logs is strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_prevent_audit_mutation ON audit_logs;
CREATE TRIGGER tg_prevent_audit_mutation
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION fn_enforce_audit_immutability();

-- Generic trigger function to automatically record data modifications to the audit log
CREATE OR REPLACE FUNCTION fn_audit_record_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID := NULL;
    v_old JSONB := NULL;
    v_new JSONB := NULL;
    v_action VARCHAR(50);
BEGIN
    -- Determine the current context user if saved in config parameters (e.g. app.current_user_id)
    -- This allows FastAPI to pass user_id down to db trigger session context
    BEGIN
        v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    IF (TG_OP = 'INSERT') THEN
        v_action := 'CREATE';
        v_new := to_jsonb(NEW);
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
        VALUES (v_user_id, v_action, TG_TABLE_NAME, NEW.id, NULL, v_new);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := 'UPDATE';
        
        -- Check if it is a soft-delete restore
        IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
            v_action := 'RESTORE';
        ELSIF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            v_action := 'DELETE';
        END IF;

        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
        
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
        VALUES (v_user_id, v_action, TG_TABLE_NAME, NEW.id, v_old, v_new);
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        v_action := 'DELETE';
        v_old := to_jsonb(OLD);
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
        VALUES (v_user_id, v_action, TG_TABLE_NAME, OLD.id, v_old, NULL);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to clinical and core entities
DROP TRIGGER IF EXISTS tg_audit_users ON users;
CREATE TRIGGER tg_audit_users AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION fn_audit_record_changes();

DROP TRIGGER IF EXISTS tg_audit_hospitals ON hospitals;
CREATE TRIGGER tg_audit_hospitals AFTER INSERT OR UPDATE OR DELETE ON hospitals FOR EACH ROW EXECUTE FUNCTION fn_audit_record_changes();

DROP TRIGGER IF EXISTS tg_audit_doctors ON doctors;
CREATE TRIGGER tg_audit_doctors AFTER INSERT OR UPDATE OR DELETE ON doctors FOR EACH ROW EXECUTE FUNCTION fn_audit_record_changes();

DROP TRIGGER IF EXISTS tg_audit_patients ON patients;
CREATE TRIGGER tg_audit_patients AFTER INSERT OR UPDATE OR DELETE ON patients FOR EACH ROW EXECUTE FUNCTION fn_audit_record_changes();

DROP TRIGGER IF EXISTS tg_audit_medical_history ON medical_history;
CREATE TRIGGER tg_audit_medical_history AFTER INSERT OR UPDATE OR DELETE ON medical_history FOR EACH ROW EXECUTE FUNCTION fn_audit_record_changes();

DROP TRIGGER IF EXISTS tg_audit_medical_documents ON medical_documents;
CREATE TRIGGER tg_audit_medical_documents AFTER INSERT OR UPDATE OR DELETE ON medical_documents FOR EACH ROW EXECUTE FUNCTION fn_audit_record_changes();

DROP TRIGGER IF EXISTS tg_audit_appointments ON appointments;
CREATE TRIGGER tg_audit_appointments AFTER INSERT OR UPDATE OR DELETE ON appointments FOR EACH ROW EXECUTE FUNCTION fn_audit_record_changes();

DROP TRIGGER IF EXISTS tg_audit_prescriptions ON prescriptions;
CREATE TRIGGER tg_audit_prescriptions AFTER INSERT OR UPDATE OR DELETE ON prescriptions FOR EACH ROW EXECUTE FUNCTION fn_audit_record_changes();

-- =========================================================================
-- 3. SOFT DELETE SAFETY & VALIDATION TRIGGERS
-- =========================================================================

-- Trigger function to block logins or references to soft-deleted users
CREATE OR REPLACE FUNCTION fn_check_referenced_user_status()
RETURNS TRIGGER AS $$
DECLARE
    v_is_deleted BOOLEAN;
BEGIN
    SELECT (deleted_at IS NOT NULL) INTO v_is_deleted FROM users WHERE id = NEW.user_id;
    IF v_is_deleted THEN
        RAISE EXCEPTION 'Integrity Error: Cannot create profile link. The referenced User account is soft-deleted.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_check_doctor_user_status ON doctors;
CREATE TRIGGER tg_check_doctor_user_status BEFORE INSERT OR UPDATE OF user_id ON doctors FOR EACH ROW EXECUTE FUNCTION fn_check_referenced_user_status();

DROP TRIGGER IF EXISTS tg_check_patient_user_status ON patients;
CREATE TRIGGER tg_check_patient_user_status BEFORE INSERT OR UPDATE OF user_id ON patients FOR EACH ROW EXECUTE FUNCTION fn_check_referenced_user_status();
