# Sahyog 1.0 Alembic Migration Ordering Plan
-- Author: Principal Database Architect
-- Purpose: Documentation of structural table dependencies to avoid constraint violations during migration runs.

Due to the complex foreign key references in a multi-tenant healthcare database, Alembic migration scripts must execute in a strictly defined order. 

The tables are clustered below in the sequence they should be created:

## Migration Batch 1: Extensions & Base Authentication
These tables have zero external dependencies and must exist first:
1. `01_extensions` (Enable: pgvector, uuid-ossp, pg_trgm)
2. `users`

## Migration Batch 2: Core Tenants & Session Management
These tables reference the user table:
3. `user_sessions` (Depends on: `users`)
4. `hospitals` (Base multi-tenant boundary)
5. `hospital_admins` (Depends on: `users`, `hospitals`)
6. `departments` (Depends on: `hospitals`)

## Migration Batch 3: Professional Profiles & Availability
These tables define clinical actors and scheduling parameters:
7. `doctors` (Depends on: `users`, `hospitals`, `departments`)
8. `patients` (Depends on: `users`)
9. `doctor_availability` (Depends on: `doctors`)
10. `appointment_slots` (Depends on: `doctors`)

## Migration Batch 4: Clinical History & Spatial Data
These tables configure maps and history files relative to hospitals and patient profiles:
11. `medical_history` (Depends on: `patients`, `users`)
12. `medical_documents` (Depends on: `patients`, `users`)
13. `hospital_maps` (Depends on: `hospitals`)
14. `navigation_nodes` (Depends on: `hospital_maps`)
15. `navigation_edges` (Depends on: `navigation_nodes`)
16. `landmarks` (Depends on: `navigation_nodes`)

## Migration Batch 5: Core Workflow (Appointments & Chat)
These tables capture patient interactions and booking operations:
17. `appointments` (Depends on: `patients`, `doctors`, `appointment_slots`, `hospitals`, `users`)
18. `chat_sessions` (Depends on: `patients`)
19. `chat_messages` (Depends on: `chat_sessions`)

## Migration Batch 6: Prescriptions & Reminders
These clinical tables reference appointments and support medical adherence logs:
20. `prescriptions` (Depends on: `appointments`, `patients`, `doctors`)
21. `prescription_medicines` (Depends on: `prescriptions`)
22. `medicine_reminders` (Depends on: `patients`, `prescription_medicines`)
23. `medicine_reminder_logs` (Depends on: `medicine_reminders`)

## Migration Batch 7: RAG Vector Data & System Utilities
These tables host vectorized document indexing and log compliance:
24. `rag_documents` (Depends on: `hospitals`, `users`)
25. `document_chunks` (Depends on: `rag_documents`)
26. `notifications` (Depends on: `users`)
27. `audit_logs` (Depends on: `users`)
28. `activity_logs` (Depends on: `users`)

***

## Downward Migration (Tear-down) Order
When rolling back migrations, execute them in the exact **reverse** order (Batch 7 down to Batch 1) to prevent foreign key dependency errors.
