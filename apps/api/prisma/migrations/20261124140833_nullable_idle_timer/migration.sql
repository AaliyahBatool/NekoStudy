-- AlterTable
ALTER TABLE "room_timers" ALTER COLUMN "started_at" DROP NOT NULL,
ALTER COLUMN "duration_ms" DROP NOT NULL;
