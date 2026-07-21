import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1784640360403 implements MigrationInterface {
  name = 'InitialMigration1784640360403';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "intern_info" ("id" SERIAL NOT NULL, "internshipStartDate" date NOT NULL, "internshipEndDate" date NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "internId" integer, "managerId" integer, "buddyId" integer, CONSTRAINT "REL_52eae608d9a7c72e687c54970c" UNIQUE ("internId"), CONSTRAINT "PK_0e63bc337fc63c4dd1667b7cb59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_status_enum" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tasks" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "description" text, "dueDate" date NOT NULL, "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "internId" integer, "managerId" integer, CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_status_enum" AS ENUM('PENDING', 'REVIEWED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reports" ("id" SERIAL NOT NULL, "content" text NOT NULL, "status" "public"."reports_status_enum" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "internId" integer, CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "feedback" ("id" SERIAL NOT NULL, "content" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "fromId" integer, "toId" integer, CONSTRAINT "PK_8389f9e087a57689cd5be8b2b13" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'MANAGER', 'BUDDY', 'INTERN')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "fullName" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL, "status" "public"."users_status_enum" NOT NULL DEFAULT 'ACTIVE', "department" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "activity" ("id" SERIAL NOT NULL, "actionType" character varying NOT NULL, "entityType" character varying NOT NULL, "entityId" integer NOT NULL, "description" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, CONSTRAINT "PK_24625a1d6b1b089c8ae206fe467" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "intern_info" ADD CONSTRAINT "FK_52eae608d9a7c72e687c54970ca" FOREIGN KEY ("internId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "intern_info" ADD CONSTRAINT "FK_12301af319a14485d645ded87a9" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "intern_info" ADD CONSTRAINT "FK_b9ea088d4caa9d06d49dbc662b6" FOREIGN KEY ("buddyId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_3f808edeaf0a6168eb88c0e9ffb" FOREIGN KEY ("internId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_6b5da75f1234fd80072b6e32a32" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_74e0aa5c968f39d4c8420bcdf1c" FOREIGN KEY ("internId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback" ADD CONSTRAINT "FK_d7fdfe519c14021e8b14f488744" FOREIGN KEY ("fromId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback" ADD CONSTRAINT "FK_6a4145799a13e473f03d3fdd02c" FOREIGN KEY ("toId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity" ADD CONSTRAINT "FK_3571467bcbe021f66e2bdce96ea" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activity" DROP CONSTRAINT "FK_3571467bcbe021f66e2bdce96ea"`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback" DROP CONSTRAINT "FK_6a4145799a13e473f03d3fdd02c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback" DROP CONSTRAINT "FK_d7fdfe519c14021e8b14f488744"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_74e0aa5c968f39d4c8420bcdf1c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_6b5da75f1234fd80072b6e32a32"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_3f808edeaf0a6168eb88c0e9ffb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "intern_info" DROP CONSTRAINT "FK_b9ea088d4caa9d06d49dbc662b6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "intern_info" DROP CONSTRAINT "FK_12301af319a14485d645ded87a9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "intern_info" DROP CONSTRAINT "FK_52eae608d9a7c72e687c54970ca"`,
    );
    await queryRunner.query(`DROP TABLE "activity"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TABLE "feedback"`);
    await queryRunner.query(`DROP TABLE "reports"`);
    await queryRunner.query(`DROP TYPE "public"."reports_status_enum"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
    await queryRunner.query(`DROP TABLE "intern_info"`);
  }
}
