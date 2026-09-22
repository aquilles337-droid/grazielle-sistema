-- =====================================================================
-- Régua do Híbrido — criação do banco via phpMyAdmin
--
-- Como usar: phpMyAdmin → selecione o banco (u123456789_...) na lateral
-- → aba "SQL" → cole TODO este arquivo → "Executar".
--
-- Antes de executar, troque no final do arquivo:
--   'SEU-EMAIL@DOMINIO.COM.BR' e 'Seu Nome'
-- A senha provisória do admin foi informada separadamente (não fica no repositório).
-- Troque-a no primeiro acesso em "Minha conta".
--
-- Gerado a partir de prisma/schema.prisma — se o schema mudar, este
-- arquivo precisa ser regenerado:
--   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
-- =====================================================================

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(120) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(100) NOT NULL,
    `role` ENUM('ADMIN', 'ACCOUNTANT') NOT NULL DEFAULT 'ACCOUNTANT',
    `escritorio` VARCHAR(160) NULL,
    `crc` VARCHAR(30) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `companies` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(160) NOT NULL,
    `cnpj` VARCHAR(14) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `companies_userId_idx`(`userId`),
    UNIQUE INDEX `companies_userId_cnpj_key`(`userId`, `cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `simulations` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `inputs` JSON NOT NULL,
    `resultado` JSON NOT NULL,
    `veredito` ENUM('OPTAR', 'LIMITROFE', 'NEGOCIAR', 'MANTER') NOT NULL,
    `titulo` VARCHAR(160) NULL,
    `data` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `simulations_companyId_data_idx`(`companyId`, `data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(120) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(20) NOT NULL,
    `crc` VARCHAR(30) NOT NULL,
    `status` ENUM('NOVO', 'CONTATADO', 'CONVERTIDO', 'DESCARTADO') NOT NULL DEFAULT 'NOVO',
    `origem` VARCHAR(60) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `leads_email_idx`(`email`),
    INDEX `leads_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `companies` ADD CONSTRAINT `companies_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `simulations` ADD CONSTRAINT `simulations_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- =====================================================================
-- Usuário ADMIN inicial
-- =====================================================================
INSERT INTO `users` (`id`, `nome`, `email`, `senha`, `role`, `ativo`, `createdAt`, `updatedAt`)
VALUES (
  UUID(),
  'Seu Nome',
  LOWER('SEU-EMAIL@DOMINIO.COM.BR'),
  '$2b$12$TRu5zqdq5IieoC3XFaTdG.fofdRd4nSYWObGt9.Y3zP2OJgHZ5r0K',
  'ADMIN',
  true,
  NOW(3),
  NOW(3)
);
