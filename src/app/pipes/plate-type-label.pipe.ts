import { Pipe, PipeTransform } from '@angular/core';

/**
 * Display-only translator for the plate_type enum stored in DB.
 *
 * Backend stores simplified Chinese values ('金属板', '金属碗', '陶瓷碗')
 * as the PLATE_TYPE_CHOICES enum in meals/models.py. This pipe maps those
 * raw values to Taiwan traditional Chinese labels for UI rendering only.
 *
 * Stored values remain unchanged — form submits continue to write the
 * simplified enum value back to DB, so no schema migration is needed.
 */
@Pipe({
  name: 'plateTypeLabel',
  standalone: true,
})
export class PlateTypeLabelPipe implements PipeTransform {
  private static readonly LABEL_MAP: Record<string, string> = {
    '金属板': '金屬鐵盤',
    '金属碗': '金屬碗',
    '陶瓷碗': '陶瓷碗',
  };

  transform(value: string | null | undefined): string {
    if (!value) return '';
    return PlateTypeLabelPipe.LABEL_MAP[value] ?? value;
  }
}
