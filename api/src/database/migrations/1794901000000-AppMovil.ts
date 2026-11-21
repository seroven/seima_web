import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Base de la app de Luis: fotos y videos en `project_media`, estado del proyecto, sesión larga y tokens de Firebase.
 * Escrita a mano (no un drop/create) para no perder proyectos, fotos ni el usuario administrador.
 * Las fotos que ya eran principales de antes/después pasan a ser también la portada.
 */
export class AppMovil1794901000000 implements MigrationInterface {
    name = 'AppMovil1794901000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "estado_proyecto" AS ENUM('borrador', 'publicado', 'oculto')`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "estado" "estado_proyecto"`);
        await queryRunner.query(`UPDATE "projects" SET "estado" = CASE WHEN "publicado" THEN 'publicado'::"estado_proyecto" ELSE 'borrador'::"estado_proyecto" END`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "estado" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "estado" SET DEFAULT 'borrador'`);
        await queryRunner.query(`DROP INDEX "idx_projects_publicado_destacado"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "publicado"`);
        await queryRunner.query(`CREATE INDEX "idx_projects_estado_destacado" ON "projects" ("estado", "destacado") `);

        await queryRunner.query(`ALTER TABLE "project_photos" RENAME TO "project_media"`);
        await queryRunner.query(`ALTER INDEX "uq_project_photos_orden" RENAME TO "uq_project_media_orden"`);
        await queryRunner.query(`ALTER INDEX "uq_project_photos_principal" RENAME TO "uq_project_media_principal"`);
        await queryRunner.query(`CREATE TYPE "tipo_medio" AS ENUM('foto', 'video')`);
        await queryRunner.query(`CREATE TYPE "estado_medio" AS ENUM('subiendo', 'listo')`);
        await queryRunner.query(`ALTER TABLE "project_media" ADD "tipo" "tipo_medio" NOT NULL DEFAULT 'foto'`);
        await queryRunner.query(`ALTER TABLE "project_media" ADD "duracion_ms" integer`);
        await queryRunner.query(`ALTER TABLE "project_media" ADD "estado" "estado_medio" NOT NULL DEFAULT 'listo'`);
        await queryRunner.query(`ALTER TABLE "project_media" ADD "es_portada" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`UPDATE "project_media" SET "es_portada" = true WHERE "es_principal" = true AND "etapa" IN ('antes', 'despues')`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_project_media_portada" ON "project_media" ("project_id", "etapa") WHERE "es_portada" = true`);
        await queryRunner.query(`ALTER TABLE "project_media" DROP CONSTRAINT "FK_8471db30986ba58c7bac86ee6d8"`);
        await queryRunner.query(`ALTER TABLE "project_media" ADD CONSTRAINT "FK_47b1c749ffaec9c37b649e1fa8d" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "admin_users" ADD "usuario" character varying(40)`);
        await queryRunner.query(`UPDATE "admin_users" SET "usuario" = lower(split_part("email", '@', 1)) WHERE "email" IS NOT NULL AND "usuario" IS NULL`);
        await queryRunner.query(`UPDATE "admin_users" SET "usuario" = 'admin' WHERE "usuario" IS NULL`);
        await queryRunner.query(`ALTER TABLE "admin_users" ALTER COLUMN "usuario" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "admin_users" ADD CONSTRAINT "UQ_admin_users_usuario" UNIQUE ("usuario")`);
        await queryRunner.query(`ALTER TABLE "admin_users" ALTER COLUMN "email" DROP NOT NULL`);

        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "token_hash" character varying(64) NOT NULL, "user_id" uuid NOT NULL, "familia" uuid NOT NULL, "dispositivo" character varying(120), "vence" TIMESTAMP WITH TIME ZONE NOT NULL, "revocado" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_refresh_tokens_hash" UNIQUE ("token_hash"), CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_refresh_tokens_familia" ON "refresh_tokens" ("familia") `);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        await queryRunner.query(`CREATE TABLE "device_tokens" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "token" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_device_tokens_token" UNIQUE ("token"), CONSTRAINT "PK_device_tokens" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_device_tokens_user" ON "device_tokens" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "device_tokens" ADD CONSTRAINT "FK_17e1f528b993c6d55def4cf5bea" FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "device_tokens" DROP CONSTRAINT "FK_17e1f528b993c6d55def4cf5bea"`);
        await queryRunner.query(`DROP INDEX "idx_device_tokens_user"`);
        await queryRunner.query(`DROP TABLE "device_tokens"`);

        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`);
        await queryRunner.query(`DROP INDEX "idx_refresh_tokens_familia"`);
        await queryRunner.query(`DROP INDEX "idx_refresh_tokens_user"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);

        await queryRunner.query(`UPDATE "admin_users" SET "email" = "usuario" || '@seima.local' WHERE "email" IS NULL`);
        await queryRunner.query(`ALTER TABLE "admin_users" ALTER COLUMN "email" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "admin_users" DROP CONSTRAINT "UQ_admin_users_usuario"`);
        await queryRunner.query(`ALTER TABLE "admin_users" DROP COLUMN "usuario"`);

        await queryRunner.query(`DROP INDEX "uq_project_media_portada"`);
        await queryRunner.query(`ALTER TABLE "project_media" DROP COLUMN "es_portada"`);
        await queryRunner.query(`ALTER TABLE "project_media" DROP COLUMN "estado"`);
        await queryRunner.query(`ALTER TABLE "project_media" DROP COLUMN "duracion_ms"`);
        await queryRunner.query(`ALTER TABLE "project_media" DROP COLUMN "tipo"`);
        await queryRunner.query(`DROP TYPE "estado_medio"`);
        await queryRunner.query(`DROP TYPE "tipo_medio"`);
        await queryRunner.query(`ALTER TABLE "project_media" DROP CONSTRAINT "FK_47b1c749ffaec9c37b649e1fa8d"`);
        await queryRunner.query(`ALTER TABLE "project_media" ADD CONSTRAINT "FK_8471db30986ba58c7bac86ee6d8" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER INDEX "uq_project_media_principal" RENAME TO "uq_project_photos_principal"`);
        await queryRunner.query(`ALTER INDEX "uq_project_media_orden" RENAME TO "uq_project_photos_orden"`);
        await queryRunner.query(`ALTER TABLE "project_media" RENAME TO "project_photos"`);

        await queryRunner.query(`ALTER TABLE "projects" ADD "publicado" boolean`);
        await queryRunner.query(`UPDATE "projects" SET "publicado" = ("estado" = 'publicado')`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "publicado" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "publicado" SET DEFAULT true`);
        await queryRunner.query(`DROP INDEX "idx_projects_estado_destacado"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "estado"`);
        await queryRunner.query(`DROP TYPE "estado_proyecto"`);
        await queryRunner.query(`CREATE INDEX "idx_projects_publicado_destacado" ON "projects" ("publicado", "destacado") `);
    }
}
