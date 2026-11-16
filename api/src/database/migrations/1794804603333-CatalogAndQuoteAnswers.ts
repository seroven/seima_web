import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Parametriza el cotizador en tablas (para poder filtrar en el panel):
 *  - Catálogo: services, questions, question_options, question_services.
 *  - Cada solicitud: quote_services (servicios que pidió) y quote_answers (una fila por respuesta) + quotes.notas.
 * Generada por TypeORM y completada a mano para NO perder datos:
 *  up:   carga el catálogo base (lo imprescindible para mover lo existente; `npm run seed:catalog` lo completa y lo actualiza),
 *        y pasa quotes.servicios / acabado / mueble_alto / estructura / ambientes a las tablas nuevas antes de borrar esas columnas.
 *  down: vuelve a armar esas columnas desde las tablas. Las respuestas a preguntas NUEVAS (baños, pintura, etc.) no tienen
 *        columna donde volver y se pierden al revertir.
 */
export class CatalogAndQuoteAnswers1794804603333 implements MigrationInterface {
    name = 'CatalogAndQuoteAnswers1794804603333'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "services" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "slug" character varying(40) NOT NULL, "nombre" character varying(80) NOT NULL, "icono" character varying(40) NOT NULL, "orden" integer NOT NULL DEFAULT '0', "activo" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_services_slug" ON "services" ("slug") `);
        await queryRunner.query(`CREATE TYPE "pregunta_tipo" AS ENUM('unica', 'multiple', 'numero')`);
        await queryRunner.query(`CREATE TABLE "questions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "slug" character varying(60) NOT NULL, "texto" character varying(160) NOT NULL, "etiqueta" character varying(60) NOT NULL, "tipo" "pregunta_tipo" NOT NULL, "min" integer, "max" integer, "orden" integer NOT NULL DEFAULT '0', "activo" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_08a6d4b0f49ff300bf3a0ca60ac" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_questions_slug" ON "questions" ("slug") `);
        await queryRunner.query(`CREATE TABLE "question_options" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "question_id" uuid NOT NULL, "slug" character varying(60) NOT NULL, "etiqueta" character varying(80) NOT NULL, "descripcion" character varying(160), "orden" integer NOT NULL DEFAULT '0', "activo" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_13be20e51c0738def32f00cf7d5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_question_options_slug" ON "question_options" ("question_id", "slug") `);
        await queryRunner.query(`CREATE TABLE "quote_answers" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "quote_id" uuid NOT NULL, "question_id" uuid NOT NULL, "option_id" uuid, "valor_numero" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "chk_quote_answers_valor" CHECK (("option_id" IS NOT NULL) <> ("valor_numero" IS NOT NULL)), CONSTRAINT "PK_c59c2b7857a260755653d706e8f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_quote_answers_filtro" ON "quote_answers" ("question_id", "option_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_quote_answers_numero" ON "quote_answers" ("quote_id", "question_id") WHERE "option_id" IS NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_quote_answers_opcion" ON "quote_answers" ("quote_id", "question_id", "option_id") WHERE "option_id" IS NOT NULL`);
        await queryRunner.query(`CREATE TABLE "question_services" ("question_id" uuid NOT NULL, "service_id" uuid NOT NULL, CONSTRAINT "PK_87946109f79a3fe909d451991fc" PRIMARY KEY ("question_id", "service_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8f0c0b6bf17b59e1e27d5d054b" ON "question_services" ("question_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_3bdbc1cff633c29d08588c4981" ON "question_services" ("service_id") `);
        await queryRunner.query(`CREATE TABLE "quote_services" ("quote_id" uuid NOT NULL, "service_id" uuid NOT NULL, CONSTRAINT "PK_46858941ca4008bfdf380180cf2" PRIMARY KEY ("quote_id", "service_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4fff8466abf12b5e3e1c9a904d" ON "quote_services" ("quote_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b1820eec47e85aa9e2d2d7d4cc" ON "quote_services" ("service_id") `);

        // ---- Datos: catálogo base (lo necesario para mover las solicitudes existentes) ----
        await queryRunner.query(`INSERT INTO "services" ("slug", "nombre", "icono", "orden") VALUES ('cocina', 'Cocina', 'cocinas', 0), ('bano', 'Baño', 'banos', 1), ('departamento', 'Departamento completo', 'departamentos', 2), ('divisiones', 'Divisiones y cuartos', 'divisiones', 3), ('techo', 'Techo en drywall', 'techos', 4), ('enchapado', 'Enchapado', 'enchapado', 5), ('electricidad', 'Electricidad', 'electricidad', 6), ('melamina', 'Muebles de melamina', 'melamina', 7), ('pintura', 'Pintura', 'remodelaciones', 8), ('local', 'Local comercial', 'locales', 9)`);
        await queryRunner.query(`INSERT INTO "questions" ("slug", "texto", "etiqueta", "tipo", "min", "max", "orden") VALUES ('acabado', 'Nivel de acabado', 'Acabado', 'unica', NULL, NULL, 0), ('mueble-alto', '¿Quieres mueble alto?', 'Mueble alto', 'unica', NULL, NULL, 1), ('estructura', '¿Ya hay estructura o es desde cero?', 'Estructura', 'unica', NULL, NULL, 2), ('ambientes', '¿Cuántos ambientes?', 'Ambientes', 'numero', 1, 10, 3)`);
        await queryRunner.query(`INSERT INTO "question_options" ("question_id", "slug", "etiqueta", "descripcion", "orden") SELECT q."id", o."slug", o."etiqueta", o."descripcion", o."orden" FROM (VALUES ('acabado', 'estandar', 'Estándar', 'Buen acabado, el más usado', 0), ('acabado', 'corte45', 'Corte 45° + resina', 'Bordes a inglete y resina', 1), ('acabado', 'granito', 'Granito o formato grande', 'Piezas grandes, más premium', 2), ('acabado', 'recomiendame', 'Recomiéndame', 'Que ustedes me aconsejen', 3), ('mueble-alto', 'si', 'Sí', NULL, 0), ('mueble-alto', 'no', 'No', NULL, 1), ('mueble-alto', 'nose', 'No sé', NULL, 2), ('estructura', 'hay', 'Ya hay estructura', NULL, 0), ('estructura', 'cero', 'Desde cero', NULL, 1)) AS o("pregunta", "slug", "etiqueta", "descripcion", "orden") JOIN "questions" q ON q."slug" = o."pregunta"`);
        await queryRunner.query(`INSERT INTO "question_services" ("question_id", "service_id") SELECT q."id", s."id" FROM (VALUES ('acabado', 'cocina'), ('acabado', 'bano'), ('acabado', 'enchapado'), ('acabado', 'departamento'), ('mueble-alto', 'cocina'), ('estructura', 'cocina'), ('ambientes', 'departamento')) AS m("pregunta", "servicio") JOIN "questions" q ON q."slug" = m."pregunta" JOIN "services" s ON s."slug" = m."servicio"`);

        // ---- Datos: lo que ya estaba guardado en quotes pasa a las tablas nuevas ----
        await queryRunner.query(`INSERT INTO "quote_services" ("quote_id", "service_id") SELECT DISTINCT q."id", s."id" FROM "quotes" q CROSS JOIN LATERAL unnest(q."servicios") AS u("slug") JOIN "services" s ON s."slug" = u."slug"`);
        await queryRunner.query(`INSERT INTO "quote_answers" ("quote_id", "question_id", "option_id") SELECT q."id", p."id", o."id" FROM "quotes" q JOIN "questions" p ON p."slug" = 'acabado' JOIN "question_options" o ON o."question_id" = p."id" AND o."slug" = q."acabado"`);
        await queryRunner.query(`INSERT INTO "quote_answers" ("quote_id", "question_id", "option_id") SELECT q."id", p."id", o."id" FROM "quotes" q JOIN "questions" p ON p."slug" = 'mueble-alto' JOIN "question_options" o ON o."question_id" = p."id" AND o."slug" = q."mueble_alto"`);
        await queryRunner.query(`INSERT INTO "quote_answers" ("quote_id", "question_id", "option_id") SELECT q."id", p."id", o."id" FROM "quotes" q JOIN "questions" p ON p."slug" = 'estructura' JOIN "question_options" o ON o."question_id" = p."id" AND o."slug" = q."estructura"`);
        await queryRunner.query(`INSERT INTO "quote_answers" ("quote_id", "question_id", "valor_numero") SELECT q."id", p."id", q."ambientes" FROM "quotes" q JOIN "questions" p ON p."slug" = 'ambientes' WHERE q."ambientes" IS NOT NULL`);

        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "servicios"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "acabado"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "mueble_alto"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "estructura"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "ambientes"`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "notas" text`);
        await queryRunner.query(`ALTER TABLE "question_options" ADD CONSTRAINT "FK_f0b7aaabd3f88e700daf0fe681c" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quote_answers" ADD CONSTRAINT "FK_7abbeadab5f68ff24e44dd54e20" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quote_answers" ADD CONSTRAINT "FK_27b988c73546b862582b92d4179" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quote_answers" ADD CONSTRAINT "FK_a86e0e66fb8ec4c2cc317636e48" FOREIGN KEY ("option_id") REFERENCES "question_options"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "question_services" ADD CONSTRAINT "FK_8f0c0b6bf17b59e1e27d5d054bf" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "question_services" ADD CONSTRAINT "FK_3bdbc1cff633c29d08588c49812" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "quote_services" ADD CONSTRAINT "FK_4fff8466abf12b5e3e1c9a904d8" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "quote_services" ADD CONSTRAINT "FK_b1820eec47e85aa9e2d2d7d4cc9" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quote_services" DROP CONSTRAINT "FK_b1820eec47e85aa9e2d2d7d4cc9"`);
        await queryRunner.query(`ALTER TABLE "quote_services" DROP CONSTRAINT "FK_4fff8466abf12b5e3e1c9a904d8"`);
        await queryRunner.query(`ALTER TABLE "question_services" DROP CONSTRAINT "FK_3bdbc1cff633c29d08588c49812"`);
        await queryRunner.query(`ALTER TABLE "question_services" DROP CONSTRAINT "FK_8f0c0b6bf17b59e1e27d5d054bf"`);
        await queryRunner.query(`ALTER TABLE "quote_answers" DROP CONSTRAINT "FK_a86e0e66fb8ec4c2cc317636e48"`);
        await queryRunner.query(`ALTER TABLE "quote_answers" DROP CONSTRAINT "FK_27b988c73546b862582b92d4179"`);
        await queryRunner.query(`ALTER TABLE "quote_answers" DROP CONSTRAINT "FK_7abbeadab5f68ff24e44dd54e20"`);
        await queryRunner.query(`ALTER TABLE "question_options" DROP CONSTRAINT "FK_f0b7aaabd3f88e700daf0fe681c"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "notas"`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "ambientes" integer`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "estructura" character varying(10)`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "mueble_alto" character varying(10)`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "acabado" character varying(40)`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "servicios" text array NOT NULL DEFAULT '{}'`);

        // ---- Datos: se vuelven a armar las columnas desde las tablas ----
        await queryRunner.query(`UPDATE "quotes" q SET "servicios" = COALESCE((SELECT array_agg(s."slug" ORDER BY s."orden") FROM "quote_services" qs JOIN "services" s ON s."id" = qs."service_id" WHERE qs."quote_id" = q."id"), '{}')`);
        await queryRunner.query(`ALTER TABLE "quotes" ALTER COLUMN "servicios" DROP DEFAULT`);
        await queryRunner.query(`UPDATE "quotes" q SET "acabado" = (SELECT o."slug" FROM "quote_answers" a JOIN "questions" p ON p."id" = a."question_id" AND p."slug" = 'acabado' JOIN "question_options" o ON o."id" = a."option_id" WHERE a."quote_id" = q."id" LIMIT 1)`);
        await queryRunner.query(`UPDATE "quotes" q SET "mueble_alto" = (SELECT o."slug" FROM "quote_answers" a JOIN "questions" p ON p."id" = a."question_id" AND p."slug" = 'mueble-alto' JOIN "question_options" o ON o."id" = a."option_id" WHERE a."quote_id" = q."id" LIMIT 1)`);
        await queryRunner.query(`UPDATE "quotes" q SET "estructura" = (SELECT o."slug" FROM "quote_answers" a JOIN "questions" p ON p."id" = a."question_id" AND p."slug" = 'estructura' JOIN "question_options" o ON o."id" = a."option_id" WHERE a."quote_id" = q."id" LIMIT 1)`);
        await queryRunner.query(`UPDATE "quotes" q SET "ambientes" = (SELECT a."valor_numero" FROM "quote_answers" a JOIN "questions" p ON p."id" = a."question_id" AND p."slug" = 'ambientes' WHERE a."quote_id" = q."id" LIMIT 1)`);

        await queryRunner.query(`DROP INDEX "IDX_b1820eec47e85aa9e2d2d7d4cc"`);
        await queryRunner.query(`DROP INDEX "IDX_4fff8466abf12b5e3e1c9a904d"`);
        await queryRunner.query(`DROP TABLE "quote_services"`);
        await queryRunner.query(`DROP INDEX "IDX_3bdbc1cff633c29d08588c4981"`);
        await queryRunner.query(`DROP INDEX "IDX_8f0c0b6bf17b59e1e27d5d054b"`);
        await queryRunner.query(`DROP TABLE "question_services"`);
        await queryRunner.query(`DROP INDEX "uq_quote_answers_opcion"`);
        await queryRunner.query(`DROP INDEX "uq_quote_answers_numero"`);
        await queryRunner.query(`DROP INDEX "idx_quote_answers_filtro"`);
        await queryRunner.query(`DROP TABLE "quote_answers"`);
        await queryRunner.query(`DROP INDEX "uq_question_options_slug"`);
        await queryRunner.query(`DROP TABLE "question_options"`);
        await queryRunner.query(`DROP INDEX "uq_questions_slug"`);
        await queryRunner.query(`DROP TABLE "questions"`);
        await queryRunner.query(`DROP TYPE "pregunta_tipo"`);
        await queryRunner.query(`DROP INDEX "uq_services_slug"`);
        await queryRunner.query(`DROP TABLE "services"`);
    }

}
