CREATE TABLE IF NOT EXISTS public._staging_cadastro_check (
  cadastro_legado integer PRIMARY KEY,
  nome text NOT NULL,
  nascimento date
);
