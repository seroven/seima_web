import { MigrationInterface, QueryRunner } from "typeorm";

export class Inicial1794796037253 implements MigrationInterface {
    name = 'Inicial1794796037253'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "slug" character varying(60) NOT NULL, "nombre" character varying(80) NOT NULL, "orden" integer NOT NULL DEFAULT '0', "activo" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_420d9f679d41281f282f5bc7d09" UNIQUE ("slug"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."tipo_cliente" AS ENUM('persona', 'empresa')`);
        await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "slug" character varying(120) NOT NULL, "titulo" character varying(160) NOT NULL, "descripcion" text NOT NULL, "categoria_id" uuid NOT NULL, "distrito" character varying(100), "area_m2" numeric(8,2), "dias" integer, "servicios" text array NOT NULL DEFAULT '{}', "destacado" boolean NOT NULL DEFAULT false, "cliente" "public"."tipo_cliente" NOT NULL DEFAULT 'persona', "publicado" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_96e045ab8b0271e5f5a91eae1ee" UNIQUE ("slug"), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_projects_publicado_destacado" ON "projects" ("publicado", "destacado") `);
        await queryRunner.query(`CREATE TYPE "public"."quote_cliente" AS ENUM('persona', 'empresa')`);
        await queryRunner.query(`CREATE TYPE "public"."quote_medidas_modo" AS ENUM('lxa', 'm2', 'nose')`);
        await queryRunner.query(`CREATE TYPE "public"."quote_estado" AS ENUM('nueva', 'contactada', 'cerrada', 'descartada')`);
        await queryRunner.query(`CREATE TABLE "quotes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "cliente" "public"."quote_cliente" NOT NULL, "servicios" text array NOT NULL, "medidas_modo" "public"."quote_medidas_modo" NOT NULL DEFAULT 'nose', "largo" numeric(8,2), "ancho" numeric(8,2), "area_m2" numeric(10,2), "acabado" character varying(40), "mueble_alto" character varying(10), "estructura" character varying(10), "ambientes" integer, "distrito" character varying(120) NOT NULL, "plazo" character varying(20) NOT NULL, "fotos_count" integer NOT NULL DEFAULT '0', "fotos_urls" text array NOT NULL DEFAULT '{}', "nombre" character varying(120) NOT NULL, "whatsapp" character varying(9) NOT NULL, "razon_social" character varying(160), "ruc" character varying(11), "proyecto_id" uuid, "mensaje" text NOT NULL, "estado" "public"."quote_estado" NOT NULL DEFAULT 'nueva', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_99a0e8bcbcd8719d3a41f23c263" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_quotes_estado_creada" ON "quotes" ("estado", "created_at") `);
        await queryRunner.query(`CREATE TYPE "public"."etapa_foto" AS ENUM('antes', 'durante', 'despues')`);
        await queryRunner.query(`CREATE TABLE "project_photos" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "project_id" uuid NOT NULL, "etapa" "public"."etapa_foto" NOT NULL, "cloudinary_id" character varying(255) NOT NULL, "orden" integer NOT NULL DEFAULT '0', "es_principal" boolean NOT NULL DEFAULT false, "pie" character varying(255), "ancho" integer, "alto" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e718918bd7e6c6c8336df3a6154" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_project_photos_principal" ON "project_photos" ("project_id", "etapa") WHERE "es_principal" = true`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_project_photos_orden" ON "project_photos" ("project_id", "etapa", "orden") `);
        await queryRunner.query(`CREATE TYPE "public"."admin_rol" AS ENUM('admin')`);
        await queryRunner.query(`CREATE TABLE "admin_users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying(255) NOT NULL, "password_hash" character varying(100) NOT NULL, "nombre" character varying(120) NOT NULL, "rol" "public"."admin_rol" NOT NULL DEFAULT 'admin', "activo" boolean NOT NULL DEFAULT true, "ultimo_acceso" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_dcd0c8a4b10af9c986e510b9ecc" UNIQUE ("email"), CONSTRAINT "PK_06744d221bb6145dc61e5dc441d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_7440a44d6fa141998c894e53549" FOREIGN KEY ("categoria_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD CONSTRAINT "FK_5d9884985dc62d687f8a5b0fda9" FOREIGN KEY ("proyecto_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_photos" ADD CONSTRAINT "FK_8471db30986ba58c7bac86ee6d8" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project_photos" DROP CONSTRAINT "FK_8471db30986ba58c7bac86ee6d8"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP CONSTRAINT "FK_5d9884985dc62d687f8a5b0fda9"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_7440a44d6fa141998c894e53549"`);
        await queryRunner.query(`DROP TABLE "admin_users"`);
        await queryRunner.query(`DROP TYPE "public"."admin_rol"`);
        await queryRunner.query(`DROP INDEX "public"."uq_project_photos_orden"`);
        await queryRunner.query(`DROP INDEX "public"."uq_project_photos_principal"`);
        await queryRunner.query(`DROP TABLE "project_photos"`);
        await queryRunner.query(`DROP TYPE "public"."etapa_foto"`);
        await queryRunner.query(`DROP INDEX "public"."idx_quotes_estado_creada"`);
        await queryRunner.query(`DROP TABLE "quotes"`);
        await queryRunner.query(`DROP TYPE "public"."quote_estado"`);
        await queryRunner.query(`DROP TYPE "public"."quote_medidas_modo"`);
        await queryRunner.query(`DROP TYPE "public"."quote_cliente"`);
        await queryRunner.query(`DROP INDEX "public"."idx_projects_publicado_destacado"`);
        await queryRunner.query(`DROP TABLE "projects"`);
        await queryRunner.query(`DROP TYPE "public"."tipo_cliente"`);
        await queryRunner.query(`DROP TABLE "categories"`);
    }

}
