import { MigrationInterface, QueryRunner } from "typeorm";

export class Analytics1795360421478 implements MigrationInterface {
    name = 'Analytics1795360421478'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "visits" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tipo" character varying(12) NOT NULL, "ruta" character varying(200) NOT NULL, "proyecto_slug" character varying(120), "visitante" character varying(32) NOT NULL, "origen" character varying(60) NOT NULL, "pais" character varying(2), "ciudad" character varying(80), "dispositivo" character varying(10) NOT NULL, CONSTRAINT "PK_0b0b322289a41015c6ea4e8bf30" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_visits_proyecto_creado" ON "visits" ("proyecto_slug", "created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_visits_creado" ON "visits" ("created_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "seima"."idx_visits_creado"`);
        await queryRunner.query(`DROP INDEX "seima"."idx_visits_proyecto_creado"`);
        await queryRunner.query(`DROP TABLE "visits"`);
    }

}
