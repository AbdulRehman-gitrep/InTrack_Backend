import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowOptionalInternDates1784653000000 implements MigrationInterface {
  name = 'AllowOptionalInternDates1784653000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "intern_info" ALTER COLUMN "internshipStartDate" DROP NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "intern_info" ALTER COLUMN "internshipEndDate" DROP NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "intern_info" ALTER COLUMN "internshipEndDate" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "intern_info" ALTER COLUMN "internshipStartDate" SET NOT NULL',
    );
  }
}
