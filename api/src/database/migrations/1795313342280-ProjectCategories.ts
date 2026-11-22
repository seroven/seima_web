import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Una obra puede tener varios tipos de trabajo (cocina + melamina).
 * `projects.categoria_id` pasa a la tabla de unión `project_categories`.
 * Generada por TypeORM y completada a mano para MOVER los datos (y devolverlos en el down).
 */
export class ProjectCategories1795313342280 implements MigrationInterface {
    name = 'ProjectCategories1795313342280'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "project_categories" ("project_id" uuid NOT NULL, "category_id" uuid NOT NULL, CONSTRAINT "PK_22678ac55b543b00a6eeb3f92ca" PRIMARY KEY ("project_id", "category_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3a55961fc2a7ee7e324844cb2f" ON "project_categories" ("project_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_678d720a87c534b1043688d8d9" ON "project_categories" ("category_id") `);
        // Cada obra conserva la categoría que ya tenía.
        await queryRunner.query(`INSERT INTO "project_categories" ("project_id", "category_id") SELECT "id", "categoria_id" FROM "projects"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_7440a44d6fa141998c894e53549"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "categoria_id"`);
        await queryRunner.query(`ALTER TABLE "project_categories" ADD CONSTRAINT "FK_3a55961fc2a7ee7e324844cb2f9" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "project_categories" ADD CONSTRAINT "FK_678d720a87c534b1043688d8d96" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project_categories" DROP CONSTRAINT "FK_678d720a87c534b1043688d8d96"`);
        await queryRunner.query(`ALTER TABLE "project_categories" DROP CONSTRAINT "FK_3a55961fc2a7ee7e324844cb2f9"`);
        // La columna vuelve como nullable, se rellena con la categoría principal de cada obra y recién entonces es obligatoria.
        await queryRunner.query(`ALTER TABLE "projects" ADD "categoria_id" uuid`);
        await queryRunner.query(`UPDATE "projects" p SET "categoria_id" = COALESCE(
            (SELECT pc."category_id" FROM "project_categories" pc INNER JOIN "categories" c ON c."id" = pc."category_id"
              WHERE pc."project_id" = p."id" ORDER BY c."orden", c."nombre" LIMIT 1),
            (SELECT "id" FROM "categories" ORDER BY "orden", "nombre" LIMIT 1))`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "categoria_id" SET NOT NULL`);
        await queryRunner.query(`DROP INDEX "IDX_678d720a87c534b1043688d8d9"`);
        await queryRunner.query(`DROP INDEX "IDX_3a55961fc2a7ee7e324844cb2f"`);
        await queryRunner.query(`DROP TABLE "project_categories"`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_7440a44d6fa141998c894e53549" FOREIGN KEY ("categoria_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

}
