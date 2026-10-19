import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calendarDateKey,
  bookingLabel12Hour,
  colombiaBookingInstant,
  bookingTimeInZone,
  bookingTimeLabel,
} from "../lib/booking-time.ts";

test("the same calendar selection books the same Colombia instant in every browser zone", () => {
  const original = process.env.TZ;
  try {
    for (const zone of [
      "Europe/Madrid",
      "America/Bogota",
      "America/Los_Angeles",
      "Asia/Tokyo",
      "UTC",
    ]) {
      process.env.TZ = zone;
      const key = calendarDateKey(new Date(2026, 9, 23));
      assert.equal(key, "2026-10-23", zone);
      assert.equal(
        colombiaBookingInstant(key, "10:00").toISOString(),
        "2026-10-23T15:00:00.000Z",
        zone
      );
    }
  } finally {
    if (original === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = original;
    }
  }
});

test("booking dates reject invalid or ambiguous legacy input instead of moving the session", () => {
  for (const [date, time] of [
    ["2026-02-30", "10:00"],
    ["2026-13-01", "10:00"],
    ["2026-10-23", "24:00"],
    ["2026-10-23", "10:60"],
    ["2026-10-22T22:00:00.000Z", "10:00"],
    ["", ""],
  ]) {
    assert.equal(colombiaBookingInstant(date, time), null);
  }
  assert.equal(
    colombiaBookingInstant("2028-02-29", "10:00").toISOString(),
    "2028-02-29T15:00:00.000Z"
  );
});

test("Madrid display uses the offset on the booking date, including the October clock change", () => {
  assert.equal(bookingTimeInZone("2026-10-23", "10:00", "Europe/Madrid").time, "17:00");
  assert.equal(bookingTimeInZone("2026-10-26", "10:00", "Europe/Madrid").time, "16:00");
  assert.equal(bookingTimeInZone("2026-03-27", "10:00", "Europe/Madrid").time, "16:00");
  assert.equal(bookingTimeInZone("2026-03-30", "10:00", "Europe/Madrid").time, "17:00");
});

test("display marks dates that cross midnight in the visitor's zone", () => {
  assert.equal(bookingTimeLabel("2026-10-23", "20:00", "Europe/Madrid"), "03:00 (día siguiente)");
  assert.equal(
    bookingTimeLabel("2026-10-23", "00:30", "America/Los_Angeles"),
    "22:30 (día anterior)"
  );
  assert.equal(bookingTimeLabel("2026-10-23", "00:00", "America/Bogota"), "00:00");
  assert.equal(bookingTimeLabel("2026-10-23", "24:00", "America/Bogota"), "00:00 (día siguiente)");
});

test("Colombia reservation day remains stable when its UTC instant is on the following day", () => {
  const date = colombiaBookingInstant("2026-12-31", "23:30");
  assert.equal(date.toISOString(), "2027-01-01T04:30:00.000Z");
  assert.equal(bookingTimeInZone("2026-12-31", "23:30", "America/Bogota").dayOffset, 0);
});

test("12-hour slot labels retain the next/previous day notes", () => {
  assert.equal(
    bookingLabel12Hour("23:00 - 00:30 (día siguiente)"),
    "11:00pm - 12:30am (día siguiente)"
  );
  assert.equal(bookingLabel12Hour("00:00 - 12:00"), "12:00am - 12:00pm");
});
