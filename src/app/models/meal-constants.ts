// Shared dropdown option lists used by add-meal-form, edit-meal, meal-admin.
// Plate-type values are simplified Chinese to match backend PLATE_TYPE_CHOICES;
// labels are Taiwan traditional for display.

export const MEAL_TIME_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '午餐', label: '午餐' },
  { value: '晚餐', label: '晚餐' },
];

export const DAY_CYCLE_OPTIONS: ReadonlyArray<{ value: number; label: string }> =
  Array.from({ length: 7 }, (_, i) => ({ value: i + 1, label: `第${i + 1}天` }));

export const PLATE_TYPE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '金属板', label: '金屬鐵盤' },
  { value: '金属碗', label: '金屬碗' },
  { value: '陶瓷碗', label: '陶瓷碗' },
];
