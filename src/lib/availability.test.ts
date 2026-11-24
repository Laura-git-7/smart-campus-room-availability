import { describe, expect, it } from 'vitest';
import {
  checkAvailability,
  fmtTime,
  parseTime,
  requestedDuration,
  timeInputToMinutes,
  MAX_DURATION,
  MINUTES_PER_DAY,
  type Room,
} from '@/lib/availability';
import { sampleRoom } from '@/lib/sampleRoom';

const at = (hours: number, minutes = 0) => hours * 60 + minutes;

const openRoom: Room = {
  id: 'test-room',
  name: 'Test Room',
  building: 'Test Building',
  capacity: 10,
  blocked: false,
  bookings: [
    { id: 'b1', title: 'Morning Class', start: at(10), end: at(11), organizer: 'Prof. A' },
    { id: 'b2', title: 'Late Meeting', start: at(11, 30), end: at(12, 30), organizer: 'Prof. B' },
  ],
};

const check = (room: Room, currentTime: number, start: number, end: number) =>
  checkAvailability(room, { currentTime, start, end });

describe('AC1: interval bounds and ordering', () => {
  it('accepts a future interval inside the day', () => {
    expect(check(openRoom, at(9), at(13), at(14))).toEqual({ decision: 'available', reasons: [] });
  });

  it('rejects a start before 00:00', () => {
    expect(check(openRoom, -10, -5, 60).reasons).toEqual(['Start time cannot be before 00:00.']);
  });

  it('rejects an end after 24:00', () => {
    expect(check(openRoom, at(12), at(23), MINUTES_PER_DAY + 1).reasons).toEqual([
      'End time cannot be after 24:00.',
    ]);
  });

  it('accepts an interval ending exactly at 24:00', () => {
    expect(check(openRoom, at(12), at(23), MINUTES_PER_DAY).decision).toBe('available');
  });

  it('rejects equal start and end', () => {
    expect(check(openRoom, at(9), at(13), at(13)).reasons).toEqual([
      'Start time must be earlier than end time.',
    ]);
  });

  it('rejects an end earlier than the start', () => {
    expect(check(openRoom, at(9), at(14), at(13)).reasons).toEqual([
      'Start time must be earlier than end time.',
    ]);
  });

  it('explains an end of 12:00 AM after a later start', () => {
    expect(check(openRoom, at(9), at(23), 0).reasons).toEqual([
      'End is 12:00 AM, which is read as 00:00 (start of day), so it comes before your start time. The end time must be before 12:00 AM — use an earlier time, such as 11:59 PM.',
    ]);
  });

  it('rejects a start equal to the current time', () => {
    expect(check(openRoom, at(13), at(13), at(14)).reasons).toEqual([
      'Start time must be strictly after the current time.',
    ]);
  });

  it('rejects a start before the current time', () => {
    expect(check(openRoom, at(13), at(12, 30), at(13, 30)).reasons).toEqual([
      'Start time must be strictly after the current time.',
    ]);
  });

  it('accepts a start one minute after the current time', () => {
    expect(check(openRoom, at(13), at(13, 1), at(13, 30)).decision).toBe('available');
  });

  it('rejects a start at 00:00 when the current time is also 00:00', () => {
    expect(check(openRoom, 0, 0, 60).reasons).toEqual([
      'Start time must be strictly after the current time.',
    ]);
  });

  it('skips the overlap check when the interval itself is malformed', () => {
    expect(check(openRoom, at(9), at(10, 30), at(10, 15)).reasons).toEqual([
      'Start time must be earlier than end time.',
    ]);
  });
});

describe('AC2: maximum duration', () => {
  it(`accepts an interval of exactly ${MAX_DURATION} minutes`, () => {
    expect(check(openRoom, at(9), at(13), at(13) + MAX_DURATION).decision).toBe('available');
  });

  it(`rejects an interval of ${MAX_DURATION + 1} minutes`, () => {
    expect(check(openRoom, at(9), at(13), at(13) + MAX_DURATION + 1).reasons).toEqual([
      `Requested duration is ${MAX_DURATION + 1} min; the maximum allowed is ${MAX_DURATION} min.`,
    ]);
  });
});

describe('AC3: room block check', () => {
  it('rejects every interval in a blocked room and names the reason', () => {
    const room = { ...openRoom, blocked: true, blockReason: 'Maintenance' };
    expect(check(room, at(9), at(13), at(14)).reasons).toEqual([
      'Room is blocked — Maintenance; no bookings can be checked.',
    ]);
  });

  it('uses a generic block message when no reason is given', () => {
    const room = { ...openRoom, blocked: true };
    expect(check(room, at(9), at(13), at(14)).reasons).toEqual([
      'Room is blocked; no bookings can be checked.',
    ]);
  });

  it('does not report booking conflicts for a blocked room', () => {
    const room = { ...openRoom, blocked: true };
    expect(check(room, at(9), at(10), at(10, 30)).reasons).toHaveLength(1);
  });

  it('sample room is available for a free slot when it is not blocked', () => {
    expect(check(sampleRoom, at(7), at(11), at(12)).decision).toBe('available');
  });

  it('sample room becomes unavailable for the same slot when blocked', () => {
    const blockedRoom = { ...sampleRoom, blocked: true };
    expect(check(blockedRoom, at(7), at(11), at(12)).decision).toBe('unavailable');
  });
});

describe('AC4: overlap conflict detection', () => {
  it('allows an interval that ends exactly when a booking starts', () => {
    expect(check(openRoom, at(8), at(9), at(10)).decision).toBe('available');
  });

  it('allows an interval that starts exactly when a booking ends', () => {
    expect(check(openRoom, at(9), at(12, 30), at(13)).decision).toBe('available');
  });

  it('flags an interval fully inside a booking', () => {
    expect(check(openRoom, at(9), at(10, 15), at(10, 45)).reasons).toEqual([
      'Overlaps with existing booking: 10:00–11:00.',
    ]);
  });

  it('flags an interval that starts inside a booking', () => {
    expect(check(openRoom, at(9), at(9, 30), at(10, 30)).reasons).toEqual([
      'Overlaps with existing booking: 10:00–11:00.',
    ]);
  });

  it('flags an interval that ends inside a booking', () => {
    expect(check(openRoom, at(9), at(10, 30), at(11, 30)).reasons).toEqual([
      'Overlaps with existing booking: 10:00–11:00.',
    ]);
  });

  it('flags an interval that wraps around a booking', () => {
    expect(check(openRoom, at(9), at(9, 30), at(11, 30)).reasons).toEqual([
      'Overlaps with existing booking: 10:00–11:00.',
    ]);
  });

  it('lists every overlapping booking in order', () => {
    expect(check(openRoom, at(9), at(10), at(12)).reasons).toEqual([
      'Overlaps with existing bookings: 10:00–11:00, 11:30–12:30.',
    ]);
  });

  it('ignores bookings that do not overlap', () => {
    expect(check(openRoom, at(9), at(13), at(14)).decision).toBe('available');
  });
});

describe('AC5: rule checks are pure', () => {
  it('does not change the room or its bookings', () => {
    const snapshot = structuredClone(openRoom);
    check(openRoom, at(9), at(10, 15), at(10, 45));
    expect(openRoom).toEqual(snapshot);
  });

  it('returns the same result for the same input', () => {
    expect(check(openRoom, at(9), at(10, 15), at(10, 45))).toEqual(
      check(openRoom, at(9), at(10, 15), at(10, 45))
    );
  });
});

describe('result contract', () => {
  it('is available exactly when no reasons are reported', () => {
    const cases: Array<[number, number, number]> = [
      [at(9), at(13), at(14)],
      [at(9), at(10, 15), at(10, 45)],
      [at(9), at(14), at(13)],
      [at(9), at(13), at(13) + MAX_DURATION + 1],
    ];
    for (const [currentTime, start, end] of cases) {
      const result = check(openRoom, currentTime, start, end);
      expect(result.decision === 'available').toBe(result.reasons.length === 0);
    }
  });
});

describe('time parsing and formatting', () => {
  it('formats minutes as zero-padded HH:MM', () => {
    expect(fmtTime(0)).toBe('00:00');
    expect(fmtTime(545)).toBe('09:05');
    expect(fmtTime(1439)).toBe('23:59');
  });

  it('clamps out-of-range minutes and rounds fractions when formatting', () => {
    expect(fmtTime(-30)).toBe('00:00');
    expect(fmtTime(90.4)).toBe('01:30');
  });

  it('parses valid HH:MM strings, including trimmed and single-digit hours', () => {
    expect(parseTime('00:00')).toBe(0);
    expect(parseTime('23:59')).toBe(1439);
    expect(parseTime('9:05')).toBe(545);
    expect(parseTime(' 07:30 ')).toBe(450);
  });

  it('rejects malformed or out-of-range strings', () => {
    for (const value of ['24:00', '12:60', 'abc', '', '1:5', '08:00:00']) {
      expect(parseTime(value)).toBeNull();
    }
  });

  it('reads time input values as minutes and treats unreadable input as 00:00', () => {
    expect(timeInputToMinutes('14:30')).toBe(870);
    expect(timeInputToMinutes('')).toBe(0);
    expect(timeInputToMinutes('bad')).toBe(0);
  });

  it('measures the duration of forward intervals only', () => {
    expect(requestedDuration(600, 660)).toBe(60);
    expect(requestedDuration(660, 600)).toBe(0);
    expect(requestedDuration(600, 600)).toBe(0);
  });
});

describe('sample fixture', () => {
  it('has well-formed bookings inside the day', () => {
    for (const booking of sampleRoom.bookings) {
      expect(booking.start).toBeGreaterThanOrEqual(0);
      expect(booking.start).toBeLessThan(booking.end);
      expect(booking.end).toBeLessThanOrEqual(MINUTES_PER_DAY);
    }
  });
});



describe('regression: past time, reversed interval, duration, blocked room, overlap, endpoints, fixtures', () => {
  it('AC1 rejects a past start even when the slot is otherwise free', () => {
    expect(check(openRoom, at(15), at(14), at(14, 30)).reasons).toEqual([
      'Start time must be strictly after the current time.',
    ]);
  });

  it('AC1 reports only the ordering error for a reversed interval that would also overlap', () => {
    expect(check(openRoom, at(9), at(11, 30), at(10, 30)).reasons).toEqual([
      'Start time must be earlier than end time.',
    ]);
  });

  it('AC2 rejects 121 minutes on an otherwise free slot', () => {
    expect(check(openRoom, at(9), at(13), at(15, 1)).reasons).toEqual([
      'Requested duration is 121 min; the maximum allowed is 120 min.',
    ]);
  });

  it('AC3 reports only the block when a blocked room also has a booking in the interval', () => {
    const room = { ...openRoom, blocked: true, blockReason: 'Power outage' };
    expect(check(room, at(9), at(10, 15), at(10, 45)).reasons).toEqual([
      'Room is blocked — Power outage; no bookings can be checked.',
    ]);
  });

  it('AC4 flags a partial overlap with one booking', () => {
    expect(check(openRoom, at(9), at(10, 30), at(11, 30)).decision).toBe('unavailable');
  });

  it('AC4 allows an interval that touches two neighbouring bookings at both ends', () => {
    expect(check(openRoom, at(9), at(11), at(11, 30)).decision).toBe('available');
  });

  it('AC4 allows an interval that begins exactly when the previous booking ends', () => {
    expect(check(openRoom, at(9), at(11), at(11, 15)).decision).toBe('available');
  });

  it('keeps the sample fixture unchanged after running checks against it', () => {
    const snapshot = structuredClone(sampleRoom);
    const intervals: Array<[number, number, number]> = [
      [at(8), at(9), at(10)],
      [at(8), at(10, 15), at(10, 45)],
      [at(8), at(14), at(13)],
      [at(8), at(13), at(15, 1)],
    ];
    for (const [currentTime, start, end] of intervals) {
      check(sampleRoom, currentTime, start, end);
    }
    expect(sampleRoom).toEqual(snapshot);
  });
});
