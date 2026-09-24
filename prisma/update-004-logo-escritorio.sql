-- =====================================================================
-- Régua do Híbrido — ATUALIZAÇÃO 004: logo do escritório no PDF
--
-- Rode DEPOIS dos updates 002 e 003. Não apaga nenhum dado.
-- phpMyAdmin → clique no banco na coluna da esquerda → aba "SQL" → cole → Executar.
-- =====================================================================

-- AlterTable
ALTER TABLE `users` ADD COLUMN `logo` MEDIUMBLOB NULL,
    ADD COLUMN `logoAtualizadaEm` DATETIME(3) NULL,
    ADD COLUMN `logoMime` VARCHAR(20) NULL;

