import { Meal, MenuMode } from '../models/meal.model';

/**
 * Rule A — 菜色新增唯一性查重
 *
 * 業務規則（WHY）：
 *   菜名在系統中必須全局唯一，不論餐期、日期、模式。
 *   同名菜在任何一個 slot 出現過，就視為已存在，不允許重複建立。
 *   這可避免「同道菜跨日期/跨模式各自建出不同 id」的資料碎片問題。
 *
 * 使用方式（子程序）：
 *   1. import { findDuplicateMealNames } from '../../policies/meal-creation.policy';
 *   2. submit 前呼叫，有回傳值就以 buildDuplicateErrorMessage() 顯示錯誤並 return
 *
 * 調用方（子程序，必須在此登記）：
 *   - meal-admin.component.ts::submitAdd()
 *   （新增入口點時，必須調用此函式並更新 docs/CLAUDE_MEAL_CREATION_POLICY.md 清單）
 *
 * 後端版本：meals/models.py::Meal.validate_unique()（由 perform_create / perform_update 呼叫）
 *
 * 注意：add-meal-form 與 edit-meal 請改用 Rule B（findSlotDuplicates）。
 */

/**
 * 查重函式 — 菜名全局唯一，只要名稱重複就回傳。
 *
 * @param names    要新增的菜名陣列（呼叫方已 trim + filter 空字串）
 * @param allMeals 目前系統所有菜色（由 MealsService.getMeals() 取得）
 * @returns 已存在的重複菜名陣列；空陣列 = 無衝突
 */
export function findDuplicateMealNames(
  names: string[],
  allMeals: Meal[],
): string[] {
  const existingNames = new Set(allMeals.map(m => (m.meal_name || '').trim()));
  return names.filter(name => existingNames.has(name));
}

/**
 * 產生 Rule A 錯誤訊息（供 meal-admin::submitAdd() 使用）。
 * 系統強制拒絕，不允許繞過。
 */
export function buildDuplicateErrorMessage(duplicates: string[]): string {
  if (duplicates.length === 1) {
    return `「${duplicates[0]}」此菜名已存在於資料庫，無法重複新增。`;
  }
  return `以下菜名已存在於資料庫，無法重複新增：\n${duplicates.join('、')}`;
}

// ─────────────────────────────────────────────────────────────────
// Rule B — 同一 slot 唯一性查重（add-meal-form、edit-meal 專用）
// ─────────────────────────────────────────────────────────────────

/**
 * Rule B — 同 slot 唯一性查重
 *
 * 業務規則（WHY）：
 *   同一 slot（模式 + 餐期 + 日期/天數）內不允許出現兩道同名菜。
 *   同名菜在「不同日期」或「不同天數」的 slot 出現是合法的
 *   （例如每週菜單可重複排相同菜色）。
 *
 *   cyclic 唯一鍵：meal_name + meal_time + day_cycle  + menu_mode='cyclic'
 *   open   唯一鍵：meal_name + meal_time + serve_date + menu_mode='open'
 *
 * 使用方式：
 *   import { findSlotDuplicates, buildSlotDuplicateErrorMessage } from '../../policies/meal-creation.policy';
 *
 * 調用方（必須在此登記）：
 *   - add-meal-form.component.ts::submitSingleMeal()
 *   - edit-meal.component.ts::save()  （新增道菜時）
 *
 * 後端防線：MealViewSet.perform_create() / perform_update() 呼叫 Meal.validate_unique()
 */

/**
 * 查重函式 — 在指定 slot 內找出已存在的菜名。
 *
 * @param names     要新增的菜名陣列（已 trim + filter 空字串）
 * @param allMeals  系統所有菜色（MealsService.getMeals()）
 * @param mode      模式（'cyclic' | 'open'）
 * @param mealTime  餐期（'午餐' | '晚餐'）
 * @param dayCycle  天數，cyclic 模式必填，open 傳 null/undefined
 * @param serveDate 日期（YYYY-MM-DD），open 模式必填，cyclic 傳 null/undefined
 * @param excludeIds 排除的 meal id（edit 情境下排除自身）
 * @returns 已存在於同 slot 的重複菜名陣列；空陣列 = 無衝突
 */
export function findSlotDuplicates(
  names: string[],
  allMeals: Meal[],
  mode: MenuMode,
  mealTime: string,
  dayCycle?: number | string | null,
  serveDate?: string | null,
  excludeIds: number[] = [],
): string[] {
  return names.filter(name =>
    allMeals.some(m =>
      !excludeIds.includes(m.id!) &&
      (m.meal_name || '').trim() === name &&
      (m.menu_mode ?? 'cyclic') === mode &&
      m.meal_time === mealTime &&
      (mode === 'open'
        ? m.serve_date === serveDate
        : String(m.day_cycle) === String(dayCycle))
    )
  );
}

/**
 * 產生 Rule B 錯誤訊息（供 add-meal-form、edit-meal 使用）。
 */
export function buildSlotDuplicateErrorMessage(duplicates: string[]): string {
  if (duplicates.length === 1) {
    return `「${duplicates[0]}」在此餐期／日期已存在，無法重複新增。`;
  }
  return `以下菜色在此餐期／日期已存在，無法重複新增：\n${duplicates.join('、')}`;
}

// ─────────────────────────────────────────────────────────────────
// Rule C — 匯入前查名沿用（鐵條）
// ─────────────────────────────────────────────────────────────────

/**
 * Rule C — 匯入前查名沿用（鐵條規定，不得例外）
 *
 * 業務規則（WHY）：
 *   一道菜在系統中只能有一個 id。匯入時若菜名已存在，
 *   必須沿用現有的 Meal row，不得新建。避免「炒時蔬」
 *   在 DB 中累積成多筆各自獨立的 id，造成 DB 膨脹與查詢效率惡化。
 *   使用者只看菜名，不在乎 id。
 *
 *   Rule A（手動新增）遇到重複就擋；
 *   Rule C（匯入）遇到重複就沿用 — 兩者方向不同，請勿混用。
 *
 * Phase 13 相容性：
 *   若未來 serve_date 從 Meal 移至 MealAssignment（schema 根治），
 *   只需修改本函式內部邏輯，所有呼叫端不用動。
 *
 * 調用方（所有匯入路徑必須在此登記，違者視為違反鐵條）：
 *   - （前端）add-meal-form.component.ts — 待補
 *   - （後端）meals/views/excel_import.py — 待補
 *   - （後端）任何程式自動建立 Meal 的路徑
 */

/**
 * 以菜名查找現有 Meal，找到就回傳（沿用），找不到回傳 null（呼叫方再建新 row）。
 *
 * 刻意不比對 meal_time / serve_date / menu_mode：
 * 同一道菜跨日期、跨模式都是同一個 id。
 */
export function findMealByName(name: string, allMeals: Meal[]): Meal | null {
  const target = (name || '').trim().toLowerCase();
  if (!target) return null;
  return allMeals.find(m => (m.meal_name || '').trim().toLowerCase() === target) ?? null;
}

/**
 * 將一批菜名分成「已存在（沿用）」和「新菜（需建立）」兩組，供匯入函式使用。
 *
 * 使用範例：
 *   const { reuse, create } = partitionMealsByName(names, allMeals);
 *   // reuse → 直接取 .id 寫入 MealAssignment
 *   // create → 呼叫 MealsService.addMeal() 後再寫入 MealAssignment
 */
export function partitionMealsByName(
  names: string[],
  allMeals: Meal[],
): { reuse: Meal[]; create: string[] } {
  const reuse: Meal[] = [];
  const create: string[] = [];
  for (const name of names) {
    const existing = findMealByName(name, allMeals);
    if (existing) {
      reuse.push(existing);
    } else {
      create.push(name);
    }
  }
  return { reuse, create };
}
