import json
import urllib.request
import urllib.error
from app.core.config import settings

def ensure_bucket_exists():
    """
    Attempts to create the configured Supabase storage bucket if it doesn't already exist.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return
        
    url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/bucket"
    payload = json.dumps({
        "id": settings.SUPABASE_STORAGE_BUCKET,
        "name": settings.SUPABASE_STORAGE_BUCKET,
        "public": False
    }).encode("utf-8")
    
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10.0) as response:
            print(f"[STORAGE SERVICE] Created missing bucket: {settings.SUPABASE_STORAGE_BUCKET}", flush=True)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        # 409 Conflict indicates the bucket already exists, which is safe to ignore
        if e.code not in (409, 422):
            print(f"[STORAGE SERVICE] Attempted to create bucket '{settings.SUPABASE_STORAGE_BUCKET}', server returned status {e.code}: {body}", flush=True)
    except Exception as e:
        print(f"[STORAGE SERVICE] Failed to verify/create bucket: {str(e)}", flush=True)

def upload_rag_document(path: str, content: bytes, content_type: str) -> str:
    """
    Uploads raw document bytes to Supabase Storage bucket.
    Returns the stable relative storage path (e.g. 'knowledge-base/global/<uuid>.pdf').
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Supabase configuration is incomplete. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.")
        
    url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{settings.SUPABASE_STORAGE_BUCKET}/{path}"
    
    def _do_upload():
        req = urllib.request.Request(
            url,
            data=content,
            headers={
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                "Content-Type": content_type
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=15.0) as response:
            pass

    try:
        _do_upload()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        # Check if bucket is missing (HTTP 404 or 400 with "Bucket not found" error)
        is_bucket_missing = (e.code == 404) or (e.code == 400 and "Bucket not found" in body)
        if is_bucket_missing:
            # Try to create the bucket
            ensure_bucket_exists()
            # Retry upload
            try:
                _do_upload()
                return path
            except Exception as retry_err:
                raise ValueError(f"Supabase upload retry failed after creating bucket: {str(retry_err)}")
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

def download_rag_document(path: str) -> bytes:
    """
    Downloads the raw file bytes directly from private Supabase Storage.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Supabase configuration is incomplete. Please check Settings.")
        
    url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/authenticated/{settings.SUPABASE_STORAGE_BUCKET}/{path}"
    
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"
        },
        method="GET"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30.0) as response:
            return response.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        raise ValueError(f"Direct storage download failed with status {e.code}: {body}")
    except Exception as e:
        raise ValueError(f"Supabase Storage download connection failed: {str(e)}")
