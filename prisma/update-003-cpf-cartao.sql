-- =====================================================================
-- Régua do Híbrido — ATUALIZAÇÃO 003: CPF do titular do cartão (checkout no site)
--
-- Rode DEPOIS do update-002-assinaturas.sql. Não apaga nenhum dado.
-- phpMyAdmin → clique no banco na coluna da esquerda → aba "SQL" → cole → Executar.
-- =====================================================================

-- AlterTable
ALTER TABLE `assinaturas` ADD COLUMN `docPagador` VARCHAR(20) NULL;

-- CreateIndex
CREATE INDEX `assinaturas_docPagador_idx` ON `assinaturas`(`docPagador`);

