-- Cria database adicional para a Evolution API.
-- Executado pelo postgres oficial UMA VEZ, no primeiro boot do container,
-- ANTES da app subir (docker-entrypoint-initdb.d).
-- Idempotente via dollar-quote + EXISTS check.

SELECT 'CREATE DATABASE evolution OWNER ' || current_user
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'evolution')\gexec
