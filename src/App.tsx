import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  DoorClosed,
  Users,
  MapPin,
  CalendarClock,
  Lock,
  Info,
  Sparkles,
} from 'lucide-react';
import { sampleRoom } from '@/lib/sampleRoom';
import {
  checkAvailability,
  fmtTime,
  requestedDuration,
  timeInputToMinutes,
  type Room,
  MINUTES_PER_DAY,
  MAX_DURATION,
} from '@/lib/availability';
import {
  explainAvailability,
  MAX_STUDENT_NOTE_LENGTH,
  type ExplainSimulationMode,
  type ExplainResult,
} from '@/lib/explainAdapter';

const App: React.FC = () => {
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  // Derived copy: the sampleRoom fixture itself is never mutated (AC5).
  const room = useMemo<Room>(
    () => ({
      ...sampleRoom,
      blocked: isBlocked,
      blockReason: isBlocked ? 'Maintenance' : undefined,
    }),
    [isBlocked]
  );

  const [currentStr, setCurrentStr] = useState<string>('13:00');
  const [startStr, setStartStr] = useState<string>('14:30');
  const [endStr, setEndStr] = useState<string>('15:30');

  const currentTime = timeInputToMinutes(currentStr);
  const start = timeInputToMinutes(startStr);
  const end = timeInputToMinutes(endStr);

  const result = useMemo(
    () => checkAvailability(room, { currentTime, start, end }),
    [room, currentTime, start, end]
  );

  const duration = requestedDuration(start, end);
  const durationStr = duration > 0 ? `${duration} min` : '—';

  // --- Explain feature ---
  const [studentNote, setStudentNote] = useState<string>('');
  const [simMode, setSimMode] = useState<ExplainSimulationMode>('normal');
  const [explainResult, setExplainResult] = useState<ExplainResult | null>(null);

  // Clear stale explanations whenever the interval inputs change.
  const intervalKey = `${currentTime}|${start}|${end}`;
  const [lastIntervalKey, setLastIntervalKey] = useState<string>(intervalKey);
  if (intervalKey !== lastIntervalKey) {
    setLastIntervalKey(intervalKey);
    if (explainResult !== null) setExplainResult(null);
  }

  const handleExplain = () => {
    const res = explainAvailability({
      roomLabel: `${room.building} ${room.name}`,
      start,
      end,
      isAvailable: result.decision === 'available',
      reasonCodes: result.reasons,
      studentNote: studentNote.trim().length > 0 ? studentNote.trim() : undefined,
      simulationMode: simMode,
    });
    setExplainResult(res);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
              <CalendarClock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Smart Campus Room Availability
              </h1>
              <p className="text-sm text-slate-500">
                Check whether a selected room is free for a time interval.
              </p>
            </div>
          </div>
        </header>

        {/* Room card */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-teal-600" />
                <span className="text-sm font-medium text-slate-500">{room.building}</span>
              </div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">{room.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-4 w-4" /> {room.capacity} seats
                </span>
                <span className="inline-flex items-center gap-1">
                  <DoorClosed className="h-4 w-4" /> Room {room.id.toUpperCase()}
                </span>
              </div>
            </div>

            <span
              className={
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ' +
                (room.blocked
                  ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                  : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200')
              }
            >
              {room.blocked ? (
                <>
                  <Lock className="h-3.5 w-3.5" /> Blocked
                  {room.blockReason ? ` · ${room.blockReason}` : ''}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Active
                </>
              )}
            </span>
          </div>
        </section>

        {/* Checker */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Check an interval
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-700">
                <Clock className="h-4 w-4 text-slate-400" /> Current time
              </span>
              <input
                type="time"
                value={fmtTime(currentTime)}
                onChange={(e) => setCurrentStr(e.target.value || '00:00')}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
              <span className="text-xs text-slate-400">
                The reference “now” for the check.
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">Start</span>
              <input
                type="time"
                value={fmtTime(start)}
                onChange={(e) => setStartStr(e.target.value || '00:00')}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
              <span className="text-xs text-slate-400">
                Must be after current time.
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">End</span>
              <input
                type="time"
                value={fmtTime(end)}
                onChange={(e) => setEndStr(e.target.value || '00:00')}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
              <span className="text-xs text-slate-400">
                Max duration {MAX_DURATION} min. Up to {fmtTime(MINUTES_PER_DAY)}.
              </span>
            </label>
          </div>

          <label className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={isBlocked}
              onChange={(e) => setIsBlocked(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Room blocked (maintenance)
          </label>
          
          {/* Live meta */}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-500">
            <span>Requested duration: <strong className="text-slate-700">{durationStr}</strong></span>
            <span>Day boundary: <strong className="text-slate-700">00:00–24:00</strong></span>
          </div>

          {/* Decision banner */}
          <div
            className={
              'mt-5 flex items-start gap-3 rounded-xl p-4 ' +
              (result.decision === 'available'
                ? 'bg-emerald-50 ring-1 ring-emerald-200'
                : 'bg-amber-50 ring-1 ring-amber-200')
            }
          >
            {result.decision === 'available' ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            )}
            <div className="min-w-0">
              <p
                className={
                  'text-sm font-semibold ' +
                  (result.decision === 'available' ? 'text-emerald-800' : 'text-amber-800')
                }
              >
                {result.decision === 'available'
                  ? 'Available — this interval can be booked.'
                  : 'Unavailable — this interval cannot be booked right now.'}
              </p>
              {result.reasons.length > 0 ? (
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-amber-800/90">
                  {result.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-emerald-800/90">
                  No conflicts, within bounds, and under the {MAX_DURATION}-minute limit.
                </p>
              )}
            </div>
          </div>

          <p className="mt-3 inline-flex items-start gap-1.5 text-xs text-slate-400">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            This tool only checks availability. It does not create or confirm bookings, and it never changes existing booking data.
          </p>

          {/* Explain availability */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Sparkles className="h-4 w-4 text-teal-600" /> Explain availability
              </h4>
              <span className="text-xs text-slate-400">Optional · informational only</span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-700">Student note (optional)</span>
                <input
                  type="text"
                  maxLength={MAX_STUDENT_NOTE_LENGTH}
                  value={studentNote}
                  onChange={(e) => setStudentNote(e.target.value.slice(0, MAX_STUDENT_NOTE_LENGTH))}
                  placeholder="e.g. need a quiet space"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
                <span className="text-xs text-slate-400">
                  {studentNote.length}/{MAX_STUDENT_NOTE_LENGTH} chars. Never shared externally.
                </span>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-700">Demo simulation mode</span>
                <select
                  value={simMode}
                  onChange={(e) => setSimMode(e.target.value as ExplainSimulationMode)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="normal">Normal</option>
                  <option value="timeout">Timeout</option>
                  <option value="error">Error</option>
                </select>
                <span className="text-xs text-slate-400">
                  Simulates LLM failure cases for testing fallbacks.
                </span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleExplain}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            >
              <Sparkles className="h-4 w-4" />
              Explain availability
            </button>

            {explainResult && (
              <div
                className={
                  'mt-4 flex items-start gap-3 rounded-xl p-4 ' +
                  (explainResult.source === 'model'
                    ? 'bg-sky-50 ring-1 ring-sky-200'
                    : 'bg-slate-50 ring-1 ring-slate-200')
                }
              >
                <Info
                  className={
                    'mt-0.5 h-5 w-5 flex-shrink-0 ' +
                    (explainResult.source === 'model' ? 'text-sky-600' : 'text-slate-500')
                  }
                />
                <div className="min-w-0">
                  <p
                    className={
                      'text-xs font-semibold uppercase tracking-wide ' +
                      (explainResult.source === 'model' ? 'text-sky-700' : 'text-slate-500')
                    }
                  >
                    {explainResult.source === 'model'
                      ? 'Informational explanation'
                      : 'Informational explanation · fallback'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{explainResult.output.explanation}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    This is an informational explanation only. The confirmed availability status above is the authoritative result.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Today's bookings */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Existing bookings today
            </h3>
            <span className="text-xs text-slate-400">{room.bookings.length} scheduled</span>
          </div>

          {room.bookings.length === 0 ? (
            <p className="text-sm text-slate-500">No bookings on record.</p>
          ) : (
            <>
              {/* Timeline strip */}
              <div className="mb-4 hidden h-8 w-full overflow-hidden rounded-lg bg-slate-100 sm:block">
                <div className="relative h-full w-full">
                  {room.bookings.map((b) => {
                    const leftPct = (b.start / MINUTES_PER_DAY) * 100;
                    const widthPct = ((b.end - b.start) / MINUTES_PER_DAY) * 100;
                    return (
                      <div
                        key={b.id}
                        title={`${b.title} · ${fmtTime(b.start)}–${fmtTime(b.end)}`}
                        className="absolute top-0 h-full rounded bg-teal-500/80"
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      />
                    );
                  })}
                  {/* Hour ticks */}
                  {Array.from({ length: 25 }).map((_, h) => (
                    <div
                      key={h}
                      className="absolute top-0 h-full w-px bg-slate-200"
                      style={{ left: `${(h / 24) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="mb-3 hidden justify-between text-[10px] text-slate-400 sm:flex">
                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
              </div>

              <ul className="divide-y divide-slate-100">
                {room.bookings.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{b.title}</p>
                      <p className="text-xs text-slate-500">by {b.organizer}</p>
                    </div>
                    <span className="flex-shrink-0 rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
                      {fmtTime(b.start)}–{fmtTime(b.end)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default App;
