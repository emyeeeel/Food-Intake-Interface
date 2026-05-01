export interface LTCPatient {
    id: number;
    room_number: string;
    bed_number: string;
    name?: string;
    national_id?: string;
    age?: number;
    birthdate: string;
    sex: string;
    height_cm: number;
    weight_kg: number;
    activity_level: string;
}
  