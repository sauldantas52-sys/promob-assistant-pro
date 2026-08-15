-- O valor precisa ser confirmado antes de ser usado por políticas em outra migration.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'auditor';
