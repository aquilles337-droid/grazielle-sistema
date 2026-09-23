-- =====================================================================
-- Régua do Híbrido — ATUALIZAÇÃO 002: assinaturas e pagamentos (Mercado Pago)
--
-- Para bancos que JÁ rodaram o setup-phpmyadmin.sql. Não apaga nenhum dado.
-- phpMyAdmin → clique no banco na coluna da esquerda → aba "SQL" → cole → Executar.
-- Rode UMA vez só (rodar de novo dá erro "Duplicate column"/"already exists").
-- =====================================================================

-- AlterTable
ALTER TABLE `users` ADD COLUMN `acessoAte` DATETIME(3) NULL,
    ADD COLUMN `telefone` VARCHAR(20) NULL,
    ADD COLUMN `trialUsadoEm` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `assinaturas` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `plano` ENUM('MENSAL', 'ANUAL') NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDENTE', 'ATIVA', 'PAUSADA', 'CANCELADA') NOT NULL DEFAULT 'PENDENTE',
    `mpPreapprovalId` VARCHAR(64) NULL,
    `emailPagador` VARCHAR(191) NULL,
    `trialDias` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `assinaturas_mpPreapprovalId_key`(`mpPreapprovalId`),
    INDEX `assinaturas_userId_status_idx`(`userId`, `status`),
    INDEX `assinaturas_emailPagador_idx`(`emailPagador`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pagamentos` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `assinaturaId` VARCHAR(191) NULL,
    `plano` ENUM('MENSAL', 'ANUAL') NOT NULL,
    `metodo` ENUM('CARTAO', 'PIX') NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDENTE', 'APROVADO', 'RECUSADO', 'CANCELADO', 'EXPIRADO', 'ESTORNADO') NOT NULL DEFAULT 'PENDENTE',
    `mpPaymentId` VARCHAR(64) NULL,
    `pixQrCode` TEXT NULL,
    `pixQrBase64` MEDIUMTEXT NULL,
    `pixExpiraEm` DATETIME(3) NULL,
    `aprovadoEm` DATETIME(3) NULL,
    `acessoDe` DATETIME(3) NULL,
    `acessoAte` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pagamentos_mpPaymentId_key`(`mpPaymentId`),
    INDEX `pagamentos_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `pagamentos_assinaturaId_idx`(`assinaturaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `assinaturas` ADD CONSTRAINT `assinaturas_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagamentos` ADD CONSTRAINT `pagamentos_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagamentos` ADD CONSTRAINT `pagamentos_assinaturaId_fkey` FOREIGN KEY (`assinaturaId`) REFERENCES `assinaturas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

