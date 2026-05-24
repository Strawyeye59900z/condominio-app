-- CreateEnum
CREATE TYPE "StatusFacial" AS ENUM ('PENDENTE', 'REGISTRADO');

-- CreateEnum
CREATE TYPE "TipoEncomenda" AS ENUM ('CAIXA', 'ENVELOPE', 'SACOLA');

-- CreateEnum
CREATE TYPE "StatusEncomenda" AS ENUM ('PENDENTE', 'RETIRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "WhatsappStatus" AS ENUM ('PENDENTE', 'ENVIADA', 'FALHOU');

-- CreateEnum
CREATE TYPE "Espaco" AS ENUM ('QUADRA', 'CHURRASQUEIRA', 'SALAO_FESTAS');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funcionarios" (
    "id" TEXT NOT NULL,
    "login_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "foto_url" TEXT,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funcionarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apartamentos" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_provisional" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apartamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moradores" (
    "id" TEXT NOT NULL,
    "apartamento_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "foto_url" TEXT,
    "foto_drive_id" TEXT,
    "status_facial" "StatusFacial" NOT NULL DEFAULT 'PENDENTE',
    "consent_lgpd_at" TIMESTAMP(3),
    "consent_lgpd_ip" TEXT,
    "is_admin_ap" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moradores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encomendas" (
    "id" TEXT NOT NULL,
    "apartamento_id" TEXT NOT NULL,
    "morador_id" TEXT NOT NULL,
    "tipo" "TipoEncomenda" NOT NULL,
    "recebida_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recebida_por" TEXT NOT NULL,
    "retirada_em" TIMESTAMP(3),
    "retirada_por" TEXT,
    "status" "StatusEncomenda" NOT NULL DEFAULT 'PENDENTE',
    "whatsapp_status" "WhatsappStatus" NOT NULL DEFAULT 'PENDENTE',
    "whatsapp_error" TEXT,
    "editavel_ate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encomendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas" (
    "id" TEXT NOT NULL,
    "apartamento_id" TEXT NOT NULL,
    "morador_id" TEXT NOT NULL,
    "espaco" "Espaco" NOT NULL,
    "data" DATE NOT NULL,
    "hora_inicio" INTEGER,
    "duracao_horas" INTEGER,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelada_em" TIMESTAMP(3),
    "cancelada_por" TEXT,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "target_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "funcionarios_login_id_key" ON "funcionarios"("login_id");

-- CreateIndex
CREATE UNIQUE INDEX "apartamentos_numero_key" ON "apartamentos"("numero");

-- CreateIndex
CREATE INDEX "moradores_status_facial_created_at_idx" ON "moradores"("status_facial", "created_at");

-- CreateIndex
CREATE INDEX "moradores_apartamento_id_idx" ON "moradores"("apartamento_id");

-- CreateIndex
CREATE INDEX "encomendas_apartamento_id_status_idx" ON "encomendas"("apartamento_id", "status");

-- CreateIndex
CREATE INDEX "encomendas_status_recebida_em_idx" ON "encomendas"("status", "recebida_em");

-- CreateIndex
CREATE INDEX "reservas_espaco_data_idx" ON "reservas"("espaco", "data");

-- CreateIndex
CREATE INDEX "reservas_apartamento_id_data_idx" ON "reservas"("apartamento_id", "data");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_type_actor_id_created_at_idx" ON "audit_logs"("actor_type", "actor_id", "created_at");

-- AddForeignKey
ALTER TABLE "moradores" ADD CONSTRAINT "moradores_apartamento_id_fkey" FOREIGN KEY ("apartamento_id") REFERENCES "apartamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encomendas" ADD CONSTRAINT "encomendas_apartamento_id_fkey" FOREIGN KEY ("apartamento_id") REFERENCES "apartamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encomendas" ADD CONSTRAINT "encomendas_morador_id_fkey" FOREIGN KEY ("morador_id") REFERENCES "moradores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encomendas" ADD CONSTRAINT "encomendas_recebida_por_fkey" FOREIGN KEY ("recebida_por") REFERENCES "funcionarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encomendas" ADD CONSTRAINT "encomendas_retirada_por_fkey" FOREIGN KEY ("retirada_por") REFERENCES "moradores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_apartamento_id_fkey" FOREIGN KEY ("apartamento_id") REFERENCES "apartamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_morador_id_fkey" FOREIGN KEY ("morador_id") REFERENCES "moradores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
