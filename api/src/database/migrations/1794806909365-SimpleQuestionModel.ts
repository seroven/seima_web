import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Simplifica el modelo del cotizador: TODO es "pregunta → opciones → respuesta".
 *  - questions: solo `unica` o `multiple` (sin `numero`, `min` ni `max`).
 *  - question_options: nuevo `tipo_entrada` (ninguna | texto | numero) y `entrada_ayuda`: una opción puede pedir un dato extra
 *    ("Otro" → ¿cuál?, "Sé el área" → m²). Los contadores pasan a ser opciones (1, 2, 3… "Más de N").
 *  - quote_answers: siempre una OPCIÓN (`option_id` obligatorio) + `valor` (texto, el dato extra). Sin `question_id`
 *    (sale de la opción) ni `valor_numero`.
 *  - quotes: sin `medidas_modo`, `largo`, `ancho`, `area_m2` (las medidas son una pregunta más).
 * Generada por TypeORM y completada a mano. ATENCIÓN, esta migración DESCARTA datos que ya no caben en el modelo (eran de
 * prueba): las respuestas numéricas (cantidad de ambientes/baños…), las preguntas de tipo `numero` y las medidas de las
 * cotizaciones. Las respuestas de opciones se conservan. Después, `seed:catalog` (que corre solo con migration:run) crea las
 * preguntas y opciones nuevas.
 */
export class SimpleQuestionModel1794806909365 implements MigrationInterface {
    name = 'SimpleQuestionModel1794806909365'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ---- Datos que ya no caben en el modelo nuevo ----
        await queryRunner.query(`DELETE FROM "quote_answers" WHERE "option_id" IS NULL`);
        await queryRunner.query(`DELETE FROM "questions" WHERE "tipo" = 'numero'`);

        await queryRunner.query(`ALTER TABLE "quote_answers" DROP CONSTRAINT "FK_27b988c73546b862582b92d4179"`);
        await queryRunner.query(`DROP INDEX "idx_quote_answers_filtro"`);
        await queryRunner.query(`DROP INDEX "uq_quote_answers_numero"`);
        await queryRunner.query(`DROP INDEX "uq_quote_answers_opcion"`);
        await queryRunner.query(`ALTER TABLE "quote_answers" DROP CONSTRAINT "chk_quote_answers_valor"`);
        await queryRunner.query(`ALTER TABLE "questions" DROP COLUMN "min"`);
        await queryRunner.query(`ALTER TABLE "questions" DROP COLUMN "max"`);
        await queryRunner.query(`ALTER TABLE "quote_answers" DROP COLUMN "question_id"`);
        await queryRunner.query(`ALTER TABLE "quote_answers" DROP COLUMN "valor_numero"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "medidas_modo"`);
        await queryRunner.query(`DROP TYPE "quote_medidas_modo"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "largo"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "ancho"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "area_m2"`);
        await queryRunner.query(`CREATE TYPE "opcion_entrada" AS ENUM('ninguna', 'texto', 'numero')`);
        await queryRunner.query(`ALTER TABLE "question_options" ADD "tipo_entrada" "opcion_entrada" NOT NULL DEFAULT 'ninguna'`);
        await queryRunner.query(`ALTER TABLE "question_options" ADD "entrada_ayuda" character varying(60)`);
        await queryRunner.query(`ALTER TABLE "quote_answers" ADD "valor" text`);
        await queryRunner.query(`ALTER TYPE "pregunta_tipo" RENAME TO "pregunta_tipo_old"`);
        await queryRunner.query(`CREATE TYPE "pregunta_tipo" AS ENUM('unica', 'multiple')`);
        await queryRunner.query(`ALTER TABLE "questions" ALTER COLUMN "tipo" TYPE "pregunta_tipo" USING "tipo"::"text"::"pregunta_tipo"`);
        await queryRunner.query(`DROP TYPE "pregunta_tipo_old"`);
        await queryRunner.query(`ALTER TABLE "quote_answers" DROP CONSTRAINT "FK_a86e0e66fb8ec4c2cc317636e48"`);
        await queryRunner.query(`ALTER TABLE "quote_answers" ALTER COLUMN "option_id" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "idx_quote_answers_opcion" ON "quote_answers" ("option_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_quote_answers_opcion" ON "quote_answers" ("quote_id", "option_id") `);
        await queryRunner.query(`ALTER TABLE "quote_answers" ADD CONSTRAINT "FK_a86e0e66fb8ec4c2cc317636e48" FOREIGN KEY ("option_id") REFERENCES "question_options"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quote_answers" DROP CONSTRAINT "FK_a86e0e66fb8ec4c2cc317636e48"`);
        await queryRunner.query(`DROP INDEX "uq_quote_answers_opcion"`);
        await queryRunner.query(`DROP INDEX "idx_quote_answers_opcion"`);
        await queryRunner.query(`ALTER TABLE "quote_answers" ALTER COLUMN "option_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "quote_answers" ADD CONSTRAINT "FK_a86e0e66fb8ec4c2cc317636e48" FOREIGN KEY ("option_id") REFERENCES "question_options"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        // Las preguntas con tipo `numero` ya no existen: al volver solo hay `unica` y `multiple` (el enum antiguo los admite)
        await queryRunner.query(`CREATE TYPE "pregunta_tipo_old" AS ENUM('unica', 'multiple', 'numero')`);
        await queryRunner.query(`ALTER TABLE "questions" ALTER COLUMN "tipo" TYPE "pregunta_tipo_old" USING "tipo"::"text"::"pregunta_tipo_old"`);
        await queryRunner.query(`DROP TYPE "pregunta_tipo"`);
        await queryRunner.query(`ALTER TYPE "pregunta_tipo_old" RENAME TO "pregunta_tipo"`);
        await queryRunner.query(`ALTER TABLE "quote_answers" DROP COLUMN "valor"`);
        await queryRunner.query(`ALTER TABLE "question_options" DROP COLUMN "entrada_ayuda"`);
        await queryRunner.query(`ALTER TABLE "question_options" DROP COLUMN "tipo_entrada"`);
        await queryRunner.query(`DROP TYPE "opcion_entrada"`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "area_m2" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "ancho" numeric(8,2)`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "largo" numeric(8,2)`);
        await queryRunner.query(`CREATE TYPE "quote_medidas_modo" AS ENUM('lxa', 'm2', 'nose')`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "medidas_modo" "quote_medidas_modo" NOT NULL DEFAULT 'nose'`);
        await queryRunner.query(`ALTER TABLE "quote_answers" ADD "valor_numero" integer`);
        // question_id: se vuelve a calcular desde la opción de cada respuesta
        await queryRunner.query(`ALTER TABLE "quote_answers" ADD "question_id" uuid`);
        await queryRunner.query(`UPDATE "quote_answers" a SET "question_id" = o."question_id" FROM "question_options" o WHERE o."id" = a."option_id"`);
        await queryRunner.query(`ALTER TABLE "quote_answers" ALTER COLUMN "question_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "questions" ADD "max" integer`);
        await queryRunner.query(`ALTER TABLE "questions" ADD "min" integer`);
        await queryRunner.query(`ALTER TABLE "quote_answers" ADD CONSTRAINT "chk_quote_answers_valor" CHECK (((option_id IS NOT NULL) <> (valor_numero IS NOT NULL)))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_quote_answers_opcion" ON "quote_answers" ("quote_id", "question_id", "option_id") WHERE (option_id IS NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_quote_answers_numero" ON "quote_answers" ("quote_id", "question_id") WHERE (option_id IS NULL)`);
        await queryRunner.query(`CREATE INDEX "idx_quote_answers_filtro" ON "quote_answers" ("question_id", "option_id") `);
        await queryRunner.query(`ALTER TABLE "quote_answers" ADD CONSTRAINT "FK_27b988c73546b862582b92d4179" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

}
