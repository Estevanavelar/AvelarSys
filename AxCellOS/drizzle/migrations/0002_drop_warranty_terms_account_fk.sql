-- Remove FK que causa erro 500 ao criar termo (account_id do token pode não existir em users ainda)
ALTER TABLE "warranty_terms" DROP CONSTRAINT IF EXISTS "warranty_terms_account_id_users_id_fk";
