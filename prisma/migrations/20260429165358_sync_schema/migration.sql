/*
  Warnings:

  - You are about to drop the column `cover_url` on the `groups` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "invite_code" TEXT NOT NULL,
    "qr_code_url" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_groups" ("created_at", "created_by", "id", "invite_code", "name", "qr_code_url") SELECT "created_at", "created_by", "id", "invite_code", "name", "qr_code_url" FROM "groups";
DROP TABLE "groups";
ALTER TABLE "new_groups" RENAME TO "groups";
CREATE UNIQUE INDEX "groups_invite_code_key" ON "groups"("invite_code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
