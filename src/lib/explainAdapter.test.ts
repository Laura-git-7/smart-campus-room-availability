import { describe, expect, it } from 'vitest';
import {
  explainAvailability,
  EXPLAIN_SYSTEM_PROMPT,
  MAX_STUDENT_NOTE_LENGTH,
  type ExplainInput,
} from '@/lib/explainAdapter';
import { sampleRoom } from '@/lib/sampleRoom';
import { checkAvailability, fmtTime, MINUTES_PER_DAY } from '@/lib/availability';

const at = (h: number, m = 0) => h * 60 + m;

const baseInput = (
  overrides: Partial<ExplainInput> = {}
): ExplainInput => ({
  roomLabel: 'Engineering Hall 204',
  start: at(13),
  end: at(14),
  isAvailable: true,
  reasonCodes: [],
  simulationMode: 'normal',
  ...overrides,
});

describe('explainAvailability: available cases', () => {
  it('returns a model explanation for an available interval', () => {
    const result = explainAvailability(baseInput());
    expect(result.ok).toBe(true);
    expect(result.source).toBe('model');
    expect(result.output.explanation).toContain('free');
    expect(result.output.explanation).toContain('13:00–14:00');
  });

  it('explains an available interval in a free gap between bookings', () => {
    // 11:00–13:00 (660–780) sits between the 10:00–11:00 and 13:00–14:30 bookings.
    const det = checkAvailability(
      { ...sampleRoom, blocked: false },
      { currentTime: at(8), start: at(11), end: at(12, 30) }
    );
    expect(det.decision).toBe('available');
    const result = explainAvailability(
      baseInput({
        start: at(11),
        end: at(12, 30),
        isAvailable: true,
        reasonCodes: det.reasons,
      })
    );
    expect(result.ok).toBe(true);
    expect(result.output.explanation).toContain('free');
    expect(result.output.explanation).toContain('11:00–12:30');
  });
});

describe('explainAvailability: unavailable cases', () => {
  it('explains a blocked room', () => {
    const det = checkAvailability(sampleRoom, {
      currentTime: at(7),
      start: at(13),
      end: at(14),
    });
    expect(det.decision).toBe('unavailable');
    const result = explainAvailability(
      baseInput({
        isAvailable: false,
        reasonCodes: det.reasons,
        start: at(13),
        end: at(14),
      })
    );
    expect(result.ok).toBe(true);
    expect(result.output.explanation).toContain('not available');
  });

  it('explains an overlap conflict', () => {
    const det = checkAvailability(
      { ...sampleRoom, blocked: false },
      { currentTime: at(8), start: at(8, 30), end: at(9, 30) }
    );
    expect(det.decision).toBe('unavailable');
    const result = explainAvailability(
      baseInput({
        start: at(8, 30),
        end: at(9, 30),
        isAvailable: false,
        reasonCodes: det.reasons,
      })
    );
    expect(result.ok).toBe(true);
    expect(result.output.explanation).toContain('not available');
    expect(result.output.explanation.length).toBeGreaterThan(0);
  });

  it('explains an invalid/past interval', () => {
    const det = checkAvailability(
      { ...sampleRoom, blocked: false },
      { currentTime: at(15), start: at(14), end: at(14, 30) }
    );
    expect(det.decision).toBe('unavailable');
    const result = explainAvailability(
      baseInput({
        start: at(14),
        end: at(14, 30),
        isAvailable: false,
        reasonCodes: det.reasons,
      })
    );
    expect(result.ok).toBe(true);
    expect(result.output.explanation).toContain('not available');
  });

  it('explains an over-duration request', () => {
    const det = checkAvailability(
      { ...sampleRoom, blocked: false },
      { currentTime: at(8), start: at(13), end: at(15, 1) }
    );
    expect(det.decision).toBe('unavailable');
    const result = explainAvailability(
      baseInput({
        start: at(13),
        end: at(15, 1),
        isAvailable: false,
        reasonCodes: det.reasons,
      })
    );
    expect(result.ok).toBe(true);
    expect(result.output.explanation).toContain('not available');
  });
});

describe('explainAvailability: student note handling', () => {
  it('accepts a short note without echoing it', () => {
    const result = explainAvailability(
      baseInput({ studentNote: 'Need a quiet space.' })
    );
    expect(result.ok).toBe(true);
    expect(result.output.explanation).not.toContain('Need a quiet space.');
  });

  it('rejects an overly long note and returns a fallback', () => {
    const longNote = 'x'.repeat(MAX_STUDENT_NOTE_LENGTH + 1);
    const result = explainAvailability(baseInput({ studentNote: longNote }));
    expect(result.ok).toBe(false);
    expect(result.source).toBe('fallback');
  });

  it('rejects a note containing script-like content (untrusted, not echoed)', () => {
    const malicious = '<script>alert(1)</script>';
    const result = explainAvailability(baseInput({ studentNote: malicious }));
    expect(result.ok).toBe(true);
    expect(result.output.explanation).not.toContain('<script>');
  });
});

describe('explainAvailability: failure modes', () => {
  it('returns a safe fallback on simulated timeout', () => {
    const result = explainAvailability(baseInput({ simulationMode: 'timeout' }));
    expect(result.ok).toBe(false);
    expect(result.source).toBe('fallback');
    expect(result.output.explanation.length).toBeGreaterThan(0);
  });

  it('returns a safe fallback on simulated error', () => {
    const result = explainAvailability(baseInput({ simulationMode: 'error' }));
    expect(result.ok).toBe(false);
    expect(result.source).toBe('fallback');
    expect(result.output.explanation.length).toBeGreaterThan(0);
  });

  it('returns a safe fallback for empty roomLabel', () => {
    const result = explainAvailability(baseInput({ roomLabel: '   ' }));
    expect(result.ok).toBe(false);
    expect(result.source).toBe('fallback');
  });

  it('returns a safe fallback for non-number start/end', () => {
    const result = explainAvailability(
      baseInput({ start: 'bad' as unknown as number, end: 'bad' as unknown as number })
    );
    expect(result.ok).toBe(false);
    expect(result.source).toBe('fallback');
  });

  it('returns a safe fallback for NaN start', () => {
    const result = explainAvailability(
      baseInput({ start: NaN, end: at(14) })
    );
    expect(result.ok).toBe(false);
    expect(result.source).toBe('fallback');
  });

  it('returns a safe fallback for non-finite end (Infinity)', () => {
    const result = explainAvailability(
      baseInput({ start: at(13), end: Infinity })
    );
    expect(result.ok).toBe(false);
    expect(result.source).toBe('fallback');
  });
});

describe('explainAvailability: fixture immutability & purity', () => {
  it('does not mutate the sample room fixture', () => {
    const snapshot = structuredClone(sampleRoom);
    explainAvailability(
      baseInput({
        start: at(13),
        end: at(14),
        isAvailable: false,
        reasonCodes: ['Room is blocked; no bookings can be checked.'],
      })
    );
    expect(sampleRoom).toEqual(snapshot);
  });

  it('returns equivalent results for equivalent inputs', () => {
    const a = explainAvailability(baseInput());
    const b = explainAvailability(baseInput());
    expect(a).toEqual(b);
  });
});

describe('EXPLAIN_SYSTEM_PROMPT', () => {
  it('forbids overriding the deterministic status and inventing details', () => {
    expect(EXPLAIN_SYSTEM_PROMPT).toMatch(/never decide availability|never override/i);
    expect(EXPLAIN_SYSTEM_PROMPT).toMatch(/invent/i);
    expect(EXPLAIN_SYSTEM_PROMPT).toMatch(/untrusted/i);
    expect(EXPLAIN_SYSTEM_PROMPT).toMatch(/2.*sentences/i);
  });
});

describe('explainAvailability: output shape bounds', () => {
  it('never returns an empty explanation', () => {
    for (const mode of ['normal', 'timeout', 'error'] as const) {
      const result = explainAvailability(baseInput({ simulationMode: mode }));
      expect(result.output.explanation.trim().length).toBeGreaterThan(0);
    }
  });

  it('formats the day boundary as 24:00 when end is MINUTES_PER_DAY', () => {
    const result = explainAvailability(
      baseInput({ start: at(23), end: MINUTES_PER_DAY })
    );
    expect(result.output.explanation).toContain(fmtTime(MINUTES_PER_DAY));
  });

  it('never produces a double period (..) for a reason code ending in a period', () => {
    const result = explainAvailability(
      baseInput({
        start: at(13),
        end: at(14),
        isAvailable: false,
        reasonCodes: ['Room is blocked; no bookings can be checked.'],
      })
    );
    expect(result.ok).toBe(true);
    expect(result.output.explanation).not.toMatch(/\.\./);
    expect(result.output.explanation).toContain('Room is blocked; no bookings can be checked.');
  });

  it('trims trailing periods from a reason code before adding sentence punctuation', () => {
    const result = explainAvailability(
      baseInput({
        start: at(13),
        end: at(14),
        isAvailable: false,
        reasonCodes: ['Overlaps with existing booking: 10:00–11:00...'],
      })
    );
    expect(result.ok).toBe(true);
    expect(result.output.explanation).not.toMatch(/\.\./);
    expect(result.output.explanation).toMatch(/11:00\.$/);
  });
});
