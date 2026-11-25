-- ============================================================
-- FEATURE — Classificação de Ativos & Insumos (catálogo escalável)
-- ============================================================
-- Adiciona campos de classificação à tabela `products` para organizar
-- o catálogo de forma eficiente e filtrável:
--   • classe        — família operacional (Fixadores, Escoramento, EPI…)
--   • criticidade   — impacto de suprimento (alta/media/baixa)
--   • subcategoria  — segundo nível hierárquico abaixo de `categoria`
--   • tags          — etiquetas livres (JSON string[]) p/ busca/filtro
--
-- Migração ADITIVA e IDEMPOTENTE (segura para re-rodar). MySQL 8.0+.
--
-- Aplicar em produção (senha colada no -p, SEM espaço):
--   docker exec -i suppley-mysql mysql -u suppley -p<SENHA> suppley_calc < drizzle/0030_add_classification_to_products.sql
-- ============================================================

-- classe
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'classe'
);
--> statement-breakpoint
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN classe VARCHAR(80) NULL AFTER categoria',
  'SELECT 1 /* products.classe já existe */');
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
-- criticidade
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'criticidade'
);
--> statement-breakpoint
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN criticidade ENUM(''alta'',''media'',''baixa'') NULL AFTER classe',
  'SELECT 1 /* products.criticidade já existe */');
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
-- subcategoria
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'subcategoria'
);
--> statement-breakpoint
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN subcategoria VARCHAR(120) NULL AFTER categoria',
  'SELECT 1 /* products.subcategoria já existe */');
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
-- tags (JSON string[])
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'tags'
);
--> statement-breakpoint
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN tags JSON NULL AFTER criticidade',
  'SELECT 1 /* products.tags já existe */');
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
