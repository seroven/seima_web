import { MigrationInterface, QueryRunner } from "typeorm";

export class QuotePhotosAndConsent1794800280619 implements MigrationInterface {
    name = 'QuotePhotosAndConsent1794800280619'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "fotos_count"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "fotos_urls"`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "fotos_ids" text array NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "consentimiento_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "consentimiento_en"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "fotos_ids"`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "fotos_urls" text array NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "fotos_count" integer NOT NULL DEFAULT '0'`);
    }

}
