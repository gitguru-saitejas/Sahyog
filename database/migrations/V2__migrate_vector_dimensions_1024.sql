BEGIN;

-- 1. Delete all existing document chunks (cannot convert 1536-d to 1024-d mathematically)
DELETE FROM document_chunks;

-- 2. Drop the existing HNSW index
DROP INDEX IF EXISTS idx_chunks_embedding_hnsw;

-- 3. Alter column type of embedding to vector(1024)
ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(1024);

-- 4. Recreate pgvector HNSW index for mxbai-embed-large Cosine similarity search
CREATE INDEX idx_chunks_embedding_hnsw 
ON document_chunks USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

COMMIT;
