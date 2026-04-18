export interface LTCPatient {
  id: number;
  room_number: string;
  bed_number: string;
  name?: string | null;
  national_id?: string | null;
  birthdate?: string | null;
  birthdate_roc?: string | null;
  age?: number | null;
  sex: string;
  height_cm: number | null;
  weight_kg: number | null;
  bmi?: number | null;
  activity_level: string;
  food_allergies?: string | null;
}
