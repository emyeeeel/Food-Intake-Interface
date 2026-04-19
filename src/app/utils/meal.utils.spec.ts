import { Meal } from '../models/meal.model';
import { MealAssignment } from '../models/meal-assignment.mode';
import {
  MEAL_TIME_LETTER,
  toISODate,
  compactDate,
  getMealMode,
  getMealCode,
  getSlotKey,
  formatDayLabel,
  formatOpenDateLabel,
  isAssignmentForToday,
} from './meal.utils';

// Minimal Meal fixture builder — only fields the utils touch.
function meal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 1,
    meal_name: 'Test',
    meal_time: '午餐',
    day_cycle: 1,
    ingredients: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function assignment(overrides: Partial<MealAssignment> = {}): MealAssignment {
  return {
    id: 1,
    patient: null,
    ltc_patient: 7,
    meal: 100,
    patient_detail: null,
    ltc_patient_detail: null,
    meal_detail: meal(),
    patient_identifier: 'k503-1',
    meal_type: '午餐',
    day_cycle: '1',
    meal_name: 'Test',
    ...overrides,
  };
}

describe('MEAL_TIME_LETTER', () => {
  it('maps known meal times', () => {
    expect(MEAL_TIME_LETTER['午餐']).toBe('L');
    expect(MEAL_TIME_LETTER['晚餐']).toBe('D');
    expect(MEAL_TIME_LETTER['點心']).toBe('S');
  });
});

describe('toISODate', () => {
  it('formats local date as YYYY-MM-DD', () => {
    const d = new Date(2026, 3, 19); // April 19 (month is 0-indexed)
    expect(toISODate(d)).toBe('2026-04-19');
  });

  it('zero-pads single-digit month and day', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('uses local components, not UTC (no off-by-one in UTC+8)', () => {
    // A date that would shift back a day under UTC if .toISOString() were used.
    // 2026-04-19 00:30 local in UTC+8 → 2026-04-18 16:30 UTC.
    const d = new Date(2026, 3, 19, 0, 30, 0);
    expect(toISODate(d)).toBe('2026-04-19');
  });
});

describe('compactDate', () => {
  it('strips dashes', () => {
    expect(compactDate('2026-04-19')).toBe('20260419');
  });

  it('handles already-compact input gracefully', () => {
    expect(compactDate('20260419')).toBe('20260419');
  });
});

describe('getMealMode', () => {
  it('returns the explicit mode', () => {
    expect(getMealMode(meal({ menu_mode: 'open' }))).toBe('open');
    expect(getMealMode(meal({ menu_mode: 'cyclic' }))).toBe('cyclic');
  });

  it('defaults to cyclic when menu_mode is missing', () => {
    expect(getMealMode(meal({ menu_mode: undefined }))).toBe('cyclic');
  });
});

describe('getMealCode', () => {
  it('cyclic: returns L-{day_cycle}-{id}', () => {
    expect(getMealCode(meal({ id: 248, day_cycle: 3, menu_mode: 'cyclic' })))
      .toBe('L-3-248');
  });

  it('cyclic: defaults menu_mode to cyclic when missing', () => {
    expect(getMealCode(meal({ id: 248, day_cycle: 3, menu_mode: undefined })))
      .toBe('L-3-248');
  });

  it('open: returns L-{YYYYMMDD}-{id} with date compacted', () => {
    expect(getMealCode(meal({
      id: 305,
      menu_mode: 'open',
      serve_date: '2026-04-19',
    }))).toBe('L-20260419-305');
  });

  it('open without serve_date falls back to cyclic format', () => {
    expect(getMealCode(meal({
      id: 305,
      day_cycle: 3,
      menu_mode: 'open',
      serve_date: null,
    }))).toBe('L-3-305');
  });

  it('uses correct letter for 晚餐', () => {
    expect(getMealCode(meal({ id: 1, meal_time: '晚餐' }))).toBe('D-1-1');
  });

  it('returns empty string for null meal', () => {
    expect(getMealCode(null)).toBe('');
    expect(getMealCode(undefined)).toBe('');
  });

  it('handles missing id gracefully', () => {
    expect(getMealCode(meal({ id: undefined as any, day_cycle: 1 })))
      .toBe('L-1-');
  });

  it('emits empty letter for unknown meal_time', () => {
    expect(getMealCode(meal({ id: 99, meal_time: 'midnight' as any })))
      .toBe('-1-99');
  });
});

describe('getSlotKey', () => {
  it('cyclic: returns "cyclic:d{day}"', () => {
    expect(getSlotKey({ menu_mode: 'cyclic', day_cycle: 3 })).toBe('cyclic:d3');
  });

  it('open: returns "open:{serve_date}"', () => {
    expect(getSlotKey({ menu_mode: 'open', serve_date: '2026-04-19' }))
      .toBe('open:2026-04-19');
  });

  it('defaults to cyclic when menu_mode missing', () => {
    expect(getSlotKey({ day_cycle: 5 })).toBe('cyclic:d5');
  });

  it('handles null day_cycle (synthetic shapes from assignments-week)', () => {
    expect(getSlotKey({ menu_mode: 'cyclic', day_cycle: null }))
      .toBe('cyclic:d');
  });

  it('handles null serve_date in open mode', () => {
    expect(getSlotKey({ menu_mode: 'open', serve_date: null }))
      .toBe('open:');
  });
});

describe('formatDayLabel', () => {
  it('cyclic: "第 N 天"', () => {
    expect(formatDayLabel({ menu_mode: 'cyclic', day_cycle: 3 }))
      .toBe('第 3 天');
  });

  it('open: "-"', () => {
    expect(formatDayLabel({ menu_mode: 'open', day_cycle: null })).toBe('-');
  });

  it('defaults menu_mode to cyclic', () => {
    expect(formatDayLabel({ day_cycle: 7 })).toBe('第 7 天');
  });

  it('uses "?" placeholder when day_cycle missing', () => {
    expect(formatDayLabel({ menu_mode: 'cyclic', day_cycle: null }))
      .toBe('第 ? 天');
  });
});

describe('formatOpenDateLabel', () => {
  it('open with weekday: "{date} ({weekday})"', () => {
    expect(formatOpenDateLabel(
      { menu_mode: 'open', serve_date: '2026-04-19' },
      '週日',
    )).toBe('2026-04-19 (週日)');
  });

  it('open without weekday: just the date', () => {
    expect(formatOpenDateLabel({ menu_mode: 'open', serve_date: '2026-04-19' }))
      .toBe('2026-04-19');
  });

  it('cyclic: empty string', () => {
    expect(formatOpenDateLabel({ menu_mode: 'cyclic', serve_date: null }))
      .toBe('');
  });

  it('open with missing serve_date: empty string', () => {
    expect(formatOpenDateLabel({ menu_mode: 'open', serve_date: null }))
      .toBe('');
  });
});

describe('isAssignmentForToday', () => {
  it('rejects orphan (meal_detail null)', () => {
    expect(isAssignmentForToday(
      assignment({ meal_detail: null as any }),
      'cyclic',
      '2026-04-19',
      '3',
    )).toBe(false);
  });

  it('rejects mode mismatch (cyclic assignment when system is open)', () => {
    expect(isAssignmentForToday(
      assignment({ meal_detail: meal({ menu_mode: 'cyclic' }) }),
      'open',
      '2026-04-19',
      '3',
    )).toBe(false);
  });

  it('rejects mode mismatch (open assignment when system is cyclic)', () => {
    expect(isAssignmentForToday(
      assignment({ meal_detail: meal({ menu_mode: 'open', serve_date: '2026-04-19' }) }),
      'cyclic',
      '2026-04-19',
      '3',
    )).toBe(false);
  });

  it('open: requires exact serve_date match', () => {
    const a = assignment({
      meal_detail: meal({ menu_mode: 'open', serve_date: '2026-04-19' }),
    });
    expect(isAssignmentForToday(a, 'open', '2026-04-19', '3')).toBe(true);
    expect(isAssignmentForToday(a, 'open', '2026-04-20', '3')).toBe(false);
  });

  it('cyclic: matches assignment.day_cycle when set', () => {
    const a = assignment({
      day_cycle: '3',
      meal_detail: meal({ menu_mode: 'cyclic', day_cycle: 7 }), // diff from a.day_cycle
    });
    // assignment.day_cycle wins over meal.day_cycle
    expect(isAssignmentForToday(a, 'cyclic', '2026-04-19', '3')).toBe(true);
    expect(isAssignmentForToday(a, 'cyclic', '2026-04-19', '7')).toBe(false);
  });

  it('cyclic: falls back to meal.day_cycle when assignment.day_cycle empty', () => {
    const a = assignment({
      day_cycle: undefined as any,
      meal_detail: meal({ menu_mode: 'cyclic', day_cycle: 5 }),
    });
    expect(isAssignmentForToday(a, 'cyclic', '2026-04-19', '5')).toBe(true);
  });

  it('treats menu_mode missing as cyclic', () => {
    const a = assignment({
      day_cycle: '4',
      meal_detail: meal({ menu_mode: undefined, day_cycle: 4 }),
    });
    expect(isAssignmentForToday(a, 'cyclic', '2026-04-19', '4')).toBe(true);
  });

  it('does NOT filter by meal_time (caller layers that check)', () => {
    // Assignment for 午餐 today; passing 'cyclic' with matching cycle still returns true
    // even though meal_time is 午餐 — the util ignores meal_time entirely.
    const a = assignment({
      day_cycle: '3',
      meal_detail: meal({ menu_mode: 'cyclic', day_cycle: 3, meal_time: '午餐' }),
    });
    expect(isAssignmentForToday(a, 'cyclic', '2026-04-19', '3')).toBe(true);
  });
});
