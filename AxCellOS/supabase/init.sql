-- Inicialização do banco AxCellOS
-- Criar schema e usuário admin

CREATE SCHEMA IF NOT EXISTS avelar_axcellos;

-- Criar usuário admin se não existir
DO $$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'supabase_admin') THEN

      CREATE ROLE supabase_admin LOGIN PASSWORD '77bfbc034480395c92c0e19d94cda932d2726dd87fd7b0c56e5e68ce68d99dcc';
   END IF;
END
$$;

-- Conceder permissões
GRANT ALL PRIVILEGES ON SCHEMA avelar_axcellos TO supabase_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA avelar_axcellos TO supabase_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA avelar_axcellos TO supabase_admin;

-- Permissões futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA avelar_axcellos GRANT ALL ON TABLES TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA avelar_axcellos GRANT ALL ON SEQUENCES TO supabase_admin;