# Sahyog Healthcare System

Sahyog is a healthcare application consisting of a FastAPI backend and multiple frontend client portals.

## Project Structure
- [backend](file:///c:/Users/PRAJWAL/Sahyog/backend): FastAPI application containing database connection, endpoints, and background jobs.
- [frontend](file:///c:/Users/PRAJWAL/Sahyog/frontend): Contains client applications:
  - [patient_portal](file:///c:/Users/PRAJWAL/Sahyog/frontend/patient_portal): Web React dashboard.
  - [patient_app](file:///c:/Users/PRAJWAL/Sahyog/frontend/patient_app): Flutter mobile application for patients.
  - [hospital_portal](file:///c:/Users/PRAJWAL/Sahyog/frontend/hospital_portal): Flutter application for hospitals.
  - [super_admin_portal](file:///c:/Users/PRAJWAL/Sahyog/frontend/super_admin_portal): Flutter application for super administrators.

---

## How to Start the Backend

The backend is built with FastAPI. It connects to a local SQLite database (`sahyog.db`) by default.

### Prerequisites
- Python 3.8+ installed on your system.

### Steps
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   * **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```
   * **Windows (CMD)**:
     ```cmd
     python -m venv .venv
     .venv\Scripts\activate.bat
     ```
   * **macOS / Linux**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
3. Install dependencies from [requirements.txt](file:///c:/Users/PRAJWAL/Sahyog/backend/requirements.txt):
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
   * The API documentation will be available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

---

## How to Start the Frontend Portals

### 1. Patient Portal (Web / React + Vite)
Located in [frontend/patient_portal](file:///c:/Users/PRAJWAL/Sahyog/frontend/patient_portal).

#### Prerequisites
- Node.js (v18+) and npm installed.

#### Steps
1. Navigate to the portal directory:
   ```bash
   cd frontend/patient_portal
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   * By default, the application will run at [http://localhost:5173](http://localhost:5173).

### 2. Patient App (Mobile / Flutter)
Located in [frontend/patient_app](file:///c:/Users/PRAJWAL/Sahyog/frontend/patient_app).

#### Prerequisites
- Flutter SDK installed and configured.
- Emulator/Simulator or physical device connected.

#### Steps
1. Navigate to the app directory:
   ```bash
   cd frontend/patient_app
   ```
2. Fetch dependencies:
   ```bash
   flutter pub get
   ```
3. Run the app:
   ```bash
   flutter run
   ```

### 3. Hospital Portal (Mobile / Flutter)
Located in [frontend/hospital_portal](file:///c:/Users/PRAJWAL/Sahyog/frontend/hospital_portal).

#### Prerequisites
- Flutter SDK installed and configured.
- Emulator/Simulator or physical device connected.

#### Steps
1. Navigate to the directory:
   ```bash
   cd frontend/hospital_portal
   ```
2. Fetch dependencies:
   ```bash
   flutter pub get
   ```
3. Run the app:
   ```bash
   flutter run
   ```

### 4. Super Admin Portal (Mobile / Flutter)
Located in [frontend/super_admin_portal](file:///c:/Users/PRAJWAL/Sahyog/frontend/super_admin_portal).

#### Prerequisites
- Flutter SDK installed and configured.
- Emulator/Simulator or physical device connected.

#### Steps
1. Navigate to the directory:
   ```bash
   cd frontend/super_admin_portal
   ```
2. Fetch dependencies:
   ```bash
   flutter pub get
   ```
3. Run the app:
   ```bash
   flutter run
   ```
