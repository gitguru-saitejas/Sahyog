import json
import urllib.request
import urllib.error
from app.core.config import settings

def upload_rag_document(path: str, content: bytes, content_type: str) -> str:
    """
    Uploads raw document bytes to Supabase Storage bucket.
    Returns the stable relative storage path (e.g. 'knowledge-base/global/<uuid>.pdf').
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Supabase configuration is incomplete. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.")
        
    url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{settings.SUPABASE_STORAGE_BUCKET}/{path}"
    
    req = urllib.request.Request(
        url,
        data=content,
        headers={
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": content_type
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15.0) as response:
            pass
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise ValueError(f"Target Supabase bucket '{settings.SUPABASE_STORAGE_BUCKET}' does not exist. Please configure and create it in the Supabase dashboard.")
        body = e.read().decode("utf-8", errors="ignore")
        raise ValueError(f"Supabase upload failed with status {e.code}: {body}")
    except Exception as e:
        raise ValueError(f"Supabase Storage connection failed: {str(e)}")
            
    return path

def delete_rag_document(path: str):
    """
    Deletes the document object from Supabase Storage.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return
        
    url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{settings.SUPABASE_STORAGE_BUCKET}/{path}"
    
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"
        },
        method="DELETE"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15.0) as response:
            pass
    except urllib.error.HTTPError as e:
        if e.code not in (200, 404):
            # 404 is acceptable (object might have been already deleted or never created)
            body = e.read().decode("utf-8", errors="ignore")
            print(f"[STORAGE SERVICE] Supabase delete warning (status {e.code}): {body}")
    except Exception as e:
        # We log the warning but do not crash during cleanup to prevent hiding other errors
        print(f"[STORAGE SERVICE] Supabase delete failed: {str(e)}")

def create_signed_url(path: str, expires_in: int = 60) -> str:
    """
    Generates a short-lived signed URL for reading private storage objects.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Supabase configuration is incomplete. Please check Settings.")
        
    url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/sign/{settings.SUPABASE_STORAGE_BUCKET}/{path}"
    
    req = urllib.request.Request(
        url,
        data=json.dumps({"expiresIn": expires_in}).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15.0) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        raise ValueError(f"Failed to create signed URL from Supabase (status {e.code}): {body}")
    except Exception as e:
        raise ValueError(f"Supabase connection for signed URL failed: {str(e)}")
            
    signed_url = data.get("signedURL") or data.get("signedUrl")
    if not signed_url:
        raise ValueError("Supabase response did not contain a valid signed URL key.")
        
    # Ensure relative URLs are fully qualified
    if signed_url.startswith("/"):
        signed_url = f"{settings.SUPABASE_URL.rstrip('/')}{signed_url}"
            
    return signed_url
