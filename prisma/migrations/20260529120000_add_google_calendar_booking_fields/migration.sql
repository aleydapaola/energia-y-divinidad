ALTER TABLE "bookings"
ADD COLUMN "googleCalendarEventId" TEXT,
ADD COLUMN "googleCalendarSyncedAt" TIMESTAMP(3),
ADD COLUMN "googleCalendarSyncError" TEXT;
