-- ============================================================
-- FIX — Widen product-name columns (VARCHAR 255 → 1024)
-- ============================================================
-- Causa: nomes de produto traduzidos vêm com specs completas
-- (ex.: escora ~263 chars) e estouravam VARCHAR(255), gerando
-- "Data too long for column 'productName'" ao salvar a proforma.
--
-- Migração ADITIVA e IDEMPOTENTE (segura para re-rodar).
-- Compatível com MySQL 8.0+. As colunas NÃO são indexadas,
-- então não há risco de limite de índice do InnoDB.
--
-- Aplicar em produção (senha colada no -p, SEM espaço):
--   docker exec -i suppley-mysql mysql -u suppley -p<SENHA> suppley_calc < drizzle/0028_widen_product_name_columns.sql
-- ============================================================

-- 1) proforma_items.productName → VARCHAR(1024) (só altera se ainda for menor)
SET @len := (
  SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'proforma_items'
    AND COLUMN_NAME = 'productName'
);
--> statement-breakpoint
SET @ddl := IF(@len IS NOT NULL AND @len < 1024,
  'ALTER TABLE proforma_items MODIFY COLUMN productName VARCHAR(1024) NOT NULL',
  'SELECT 1 /* proforma_items.productName já está >= 1024 (ou tabela ausente) */');
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
-- 2) products.name → VARCHAR(1024) (destino da distribuição da proforma)
SET @len2 := (
  SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'name'
);
--> statement-breakpoint
SET @ddl2 := IF(@len2 IS NOT NULL AND @len2 < 1024,
  'ALTER TABLE products MODIFY COLUMN name VARCHAR(1024) NOT NULL',
  'SELECT 1 /* products.name já está >= 1024 (ou tabela ausente) */');
--> statement-breakpoint
PREPARE stmt2 FROM @ddl2;
--> statement-breakpoint
EXECUTE stmt2;
--> statement-breakpoint
DEALLOCATE PREPARE stmt2;
