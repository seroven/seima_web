import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Las fotos de las cotizaciones pasan de un arreglo (quotes.fotos_ids) a su propia tabla (quote_photos).
 * Generada por TypeORM y completada a mano para NO perder datos: copia las fotos existentes antes de borrar la
 * columna (up) y las vuelve a armar en el arreglo al revertir (down).
 */
export class QuotePhotosTable1794802570281 implements MigrationInterface {
    name = 'QuotePhotosTable1794802570281'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "quote_photos" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "quote_id" uuid NOT NULL, "cloudinary_id" character varying(255) NOT NULL, "orden" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5c065af994e25a2e356ee48c5cf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_quote_photos_orden" ON "quote_photos" ("quote_id", "orden") `);
        // Datos: cada elemento del arreglo pasa a ser una fila, conservando su posición como `orden` (0, 1, 2…)
        await queryRunner.query(`INSERT INTO "quote_photos" ("quote_id", "cloudinary_id", "orden") SELECT q."id", f."public_id", f."pos" - 1 FROM "quotes" q CROSS JOIN LATERAL unnest(q."fotos_ids") WITH ORDINALITY AS f("public_id", "pos")`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "fotos_ids"`);
        await queryRunner.query(`ALTER TABLE "quote_photos" ADD CONSTRAINT "FK_41b6d9fc1f7a6b1c282d1730309" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quote_photos" DROP CONSTRAINT "FK_41b6d9fc1f7a6b1c282d1730309"`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "fotos_ids" text array NOT NULL DEFAULT '{}'`);
        // Datos: se vuelven a juntar en el arreglo, en su orden
        await queryRunner.query(`UPDATE "quotes" q SET "fotos_ids" = COALESCE((SELECT array_agg(p."cloudinary_id" ORDER BY p."orden") FROM "quote_photos" p WHERE p."quote_id" = q."id"), '{}')`);
        await queryRunner.query(`DROP INDEX "uq_quote_photos_orden"`);
        await queryRunner.query(`DROP TABLE "quote_photos"`);
    }

}
