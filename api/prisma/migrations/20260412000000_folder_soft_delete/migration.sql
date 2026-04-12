-- AlterTable: add soft-delete support to folders
ALTER TABLE "folders" ADD COLUMN "deletedAt" TIMESTAMP(3);
