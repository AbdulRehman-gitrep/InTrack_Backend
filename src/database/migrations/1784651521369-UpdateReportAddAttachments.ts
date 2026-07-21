import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateReportAddAttachments1784651521369 implements MigrationInterface {
  name = 'UpdateReportAddAttachments1784651521369';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "report_attachments" ("id" SERIAL NOT NULL, "fileName" character varying NOT NULL, "fileUrl" character varying NOT NULL, "fileType" character varying NOT NULL, "publicId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "reportId" integer, CONSTRAINT "PK_6ba5abf9d442cf6861793b468b0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN "content"`);
    await queryRunner.query(
      `ALTER TABLE "reports" ADD "title" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD "description" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_attachments" ADD CONSTRAINT "FK_2b278bafc2c3fb044d465171c34" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "report_attachments" DROP CONSTRAINT "FK_2b278bafc2c3fb044d465171c34"`,
    );
    await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN "description"`);
    await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN "title"`);
    await queryRunner.query(
      `ALTER TABLE "reports" ADD "content" text NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE "report_attachments"`);
  }
}
