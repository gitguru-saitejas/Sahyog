-- Sahyog 1.0 Database Extensions Setup
-- Author: Principal Database Architect
-- Purpose: Setup required extensions for UUID generation, fuzzy search, and pgvector embeddings.

-- Enable extension for generating UUIDv4 values natively in PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable extension for fuzzy string matching (Trigram search) for landmarks and search features
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable extension for vector embeddings storage and similarity search (Ollama/LangChain RAG)
CREATE EXTENSION IF NOT EXISTS vector;
