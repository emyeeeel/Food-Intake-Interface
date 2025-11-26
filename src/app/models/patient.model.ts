export interface Patient {
    id: number;
    name: string;
    age: number;
    height_cm: number;
    weight_kg: number;
    bmi: number;
    heart_rate?: number | null;
    systolic_bp?: number | null;
    diastolic_bp?: number | null;
    activity_level: string;
    lunch_meal?: any | null;
    dinner_meal?: any | null;
    created_at: string;
    updated_at: string;
  }
  