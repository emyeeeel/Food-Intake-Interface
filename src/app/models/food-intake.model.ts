import { LTCPatient } from "./ltc-patient.model";
import { Meal } from "./meal.model";
import { Patient } from "./patient.model";

export interface IntakeRecord {
    id: number;
    patient: number | null;
    ltc_patient: number;
    meal: number;
    weight_g: number;
    volume_ml: number;
    recorded_at: string; 
    patient_detail: Patient | null;
    ltc_patient_detail: LTCPatient | null;
    meal_detail: Meal;
    patient_identifier: string;
    image: File | null;
    meal_phase: string;
}