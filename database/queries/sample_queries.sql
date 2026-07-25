-- Sahyog 1.0 Production Query Examples
-- Author: Principal Database Architect
-- Purpose: Reference queries for standard operations, indoor routing, vector RAG search, and compliance tracking.

-- =========================================================================
-- Query 1: Doctor Availability & Overlapping Booking Verification
-- =========================================================================
-- Validates if a doctor is available on a given date/time, and checks if a slot is already booked.
SELECT 
    d.id AS doctor_id,
    u.first_name || ' ' || u.last_name AS doctor_name,
    s.date,
    s.start_time,
    s.end_time,
    s.is_booked
FROM appointment_slots s
JOIN doctors d ON s.doctor_id = d.id
JOIN users u ON d.user_id = u.id
WHERE d.id = '55555555-5555-5555-5555-555555555555'
  AND s.date = '2026-07-27'
  AND s.is_booked = FALSE;

-- =========================================================================
-- Query 2: pgvector RAG Similarity Search with Cosine Distance
-- =========================================================================
-- Searches the AI Knowledge Base chunks using Cosine Distance. 
-- Filters results where similarity is above 0.75, checking both global and hospital-specific boundaries.
-- Note: '<=>' is the pgvector cosine distance operator. 1 - (A <=> B) = Cosine Similarity.
SELECT 
    d.title AS source_document,
    c.chunk_index,
    c.content,
    1 - (c.embedding <=> ARRAY_FILL(0.015::float, ARRAY[1536])::vector) AS similarity_score
FROM document_chunks c
JOIN rag_documents d ON c.document_id = d.id
WHERE (d.hospital_id IS NULL OR d.hospital_id = '11111111-1111-1111-1111-111111111111')
  AND 1 - (c.embedding <=> ARRAY_FILL(0.015::float, ARRAY[1536])::vector) > 0.70
ORDER BY similarity_score DESC
LIMIT 5;

-- =========================================================================
-- Query 3: Dijkstra Navigation Edge Graph List (Indoor Navigation)
-- =========================================================================
-- Fetches the active nodes and edges for the Ground Floor of City General Hospital.
-- This serves as the input dataset for backend graph-routing algorithms (like NetworkX or custom python Dijkstra).
SELECT 
    e.id AS edge_id,
    e.node_a_id,
    na.x_coordinate AS a_x,
    na.y_coordinate AS a_y,
    e.node_b_id,
    nb.x_coordinate AS b_x,
    nb.y_coordinate AS b_y,
    e.distance_meters,
    e.edge_type
FROM navigation_edges e
JOIN navigation_nodes na ON e.node_a_id = na.id
JOIN navigation_nodes nb ON e.node_b_id = nb.id
JOIN hospital_maps m ON na.map_id = m.id
WHERE m.hospital_id = '11111111-1111-1111-1111-111111111111'
  AND m.floor_number = 0
  AND e.is_active = TRUE;

-- =========================================================================
-- Query 4: Patient Medication Compliance Adherence Report
-- =========================================================================
-- Computes the medication adherence rate (Taken vs Missed/Skipped) for a patient over their prescription duration.
SELECT 
    p.id AS patient_id,
    u.first_name || ' ' || u.last_name AS patient_name,
    pm.medicine_name,
    COUNT(l.id) FILTER (WHERE l.status = 'TAKEN') AS doses_taken,
    COUNT(l.id) FILTER (WHERE l.status = 'MISSED') AS doses_missed,
    COUNT(l.id) FILTER (WHERE l.status = 'SKIPPED') AS doses_skipped,
    ROUND(
        (COUNT(l.id) FILTER (WHERE l.status = 'TAKEN') * 100.0) / NULLIF(COUNT(l.id), 0),
        2
    ) AS adherence_percentage
FROM patients p
JOIN users u ON p.user_id = u.id
JOIN medicine_reminders r ON p.id = r.patient_id
JOIN prescription_medicines pm ON r.prescription_medicine_id = pm.id
LEFT JOIN medicine_reminder_logs l ON r.id = l.reminder_id
WHERE p.id = '77777777-7777-7777-7777-777777777777'
GROUP BY p.id, u.first_name, u.last_name, pm.medicine_name;

-- =========================================================================
-- Query 5: Full HIPAA Audit Trail for a Patient Record
-- =========================================================================
-- Pulls the complete change history for a patient profile, including who made the change.
SELECT 
    al.created_at AS event_time,
    al.action,
    u_actor.email AS acted_by,
    u_actor.role AS actor_role,
    al.old_values,
    al.new_values,
    al.ip_address
FROM audit_logs al
LEFT JOIN users u_actor ON al.user_id = u_actor.id
WHERE al.table_name = 'patients'
  AND al.record_id = '77777777-7777-7777-7777-777777777777'
ORDER BY al.created_at DESC;
