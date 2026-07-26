import os
import sys
import json
import urllib.request
import urllib.error
import psycopg2
from dotenv import load_dotenv

# Add backend root and scripts directory to path to ensure app imports resolve correctly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

# Load backend .env environment variables
load_dotenv()

from app.core.config import settings

def run_preflight_checks(db_url):
    print("[PREFLIGHT] Starting preflight validation...")
    
    # 1. Check Database connection
    try:
        conn = psycopg2.connect(db_url)
        conn.close()
        print("[PREFLIGHT] Database connection: OK")
    except Exception as e:
        print(f"[PREFLIGHT] Database connection failed: {str(e)}")
        return False

    # 2. Check Ollama reachability & model download status
    ollama_url = settings.OLLAMA_API_URL or "http://localhost:11434"
    tags_url = f"{ollama_url.rstrip('/')}/api/tags"
    model_name = settings.EMBEDDING_MODEL or "mxbai-embed-large"
    
    print(f"[PREFLIGHT] Checking Ollama service at {ollama_url}...")
    try:
        req = urllib.request.Request(tags_url, method="GET")
        with urllib.request.urlopen(req, timeout=5.0) as response:
            res = json.loads(response.read().decode("utf-8"))
            
        models = res.get("models", [])
        model_names = [m.get("name") for m in models]
        
        # Verify model availability (either match full name or name:latest)
        model_found = False
        for name in model_names:
            if name == model_name or name == f"{model_name}:latest" or name.startswith(f"{model_name}:"):
                model_found = True
                break
                
        if not model_found:
            print(f"[PREFLIGHT] ERROR: Ollama model '{model_name}' is not installed.")
            print(f"[PREFLIGHT] Please run: ollama pull {model_name}")
            return False
            
        print(f"[PREFLIGHT] Ollama model '{model_name}': OK")
        
    except urllib.error.URLError as e:
        print(f"[PREFLIGHT] ERROR: Ollama service is unreachable. Details: {str(e.reason)}")
        return False
    except Exception as e:
        print(f"[PREFLIGHT] ERROR: Failed checking Ollama status. Details: {str(e)}")
        return False

    print("[PREFLIGHT] All preflight checks passed successfully.")
    return True

def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("[ERROR] DATABASE_URL environment variable is not defined in .env")
        return
        
    # Run preflight validation first
    if not run_preflight_checks(db_url):
        print("[ERROR] Preflight validation failed. Migration halted.")
        sys.exit(1)
        
    print(f"[MIGRATION] Connecting to live database...")
    
    # Locate the migration SQL file
    migration_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../database/migrations/V2__migrate_vector_dimensions_1024.sql"))
    if not os.path.exists(migration_file):
        print(f"[ERROR] Migration file not found: {migration_file}")
        return
        
    with open(migration_file, "r") as f:
        sql = f.read()
        
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = False # Run transaction manually
        cursor = conn.cursor()
        
        print("[MIGRATION] Executing SQL statements...")
        cursor.execute(sql)
        conn.commit()
        print("[MIGRATION] SUCCESS: database successfully migrated to 1024-dimensional vectors!")
        
        # Coupled document re-ingestion operation
        print("[MIGRATION] Initiating automated document re-ingestion...")
        from reingest_documents import main as run_reingestion
        run_reingestion()
        print("[MIGRATION] SUCCESS: Migration and document re-ingestion completed successfully.")
        
    except Exception as e:
        print(f"[MIGRATION] FAILURE: Migration failed and rolled back. Error: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()
