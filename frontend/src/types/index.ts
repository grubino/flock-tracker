export const AnimalType = {
  SHEEP: "sheep",
  CHICKEN: "chicken",
  HIVE: "hive"
} as const;

export const SheepGender = {
  EWE: "ewe",
  RAM: "ram"
} as const;

export const ChickenGender = {
  HEN: "hen",
  ROOSTER: "rooster"
} as const;

export const EventType = {
  DEWORMING: "deworming",
  DELICING: "delicing",
  LAMBING: "lambing",
  VACCINATION: "vaccination",
  HEALTH_CHECK: "health_check",
  OTHER: "other"
} as const;

export type AnimalType = typeof AnimalType[keyof typeof AnimalType];
export type SheepGender = typeof SheepGender[keyof typeof SheepGender];
export type ChickenGender = typeof ChickenGender[keyof typeof ChickenGender];
export type EventType = typeof EventType[keyof typeof EventType];

export interface Animal {
  id: number;
  name?: string;
  tag_number: string;
  animal_type: AnimalType;
  sheep_gender?: SheepGender;
  chicken_gender?: ChickenGender;
  birth_date?: string;
  current_location_id?: number;
  sire_id?: number;
  dam_id?: number;
  created_at: string;
  updated_at: string;
  current_location?: Location;
  sire?: Animal;
  dam?: Animal;
}

export interface Event {
  id: number;
  animal_id: number;
  event_type: EventType;
  event_date: string;
  description?: string;
  notes?: string;
  created_at: string;
}

export interface Location {
  id: number;
  name: string;
  address?: string;
  paddock_name?: string;
  description?: string;
  area_size?: number;
  area_unit?: string;
  capacity?: number;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

export interface AnimalLocation {
  id: number;
  animal_id: number;
  location_id: number;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  created_at: string;
  location: Location;
}

export interface AnimalCreateRequest {
  name?: string;
  tag_number: string;
  animal_type: AnimalType;
  sheep_gender?: SheepGender;
  chicken_gender?: ChickenGender;
  birth_date?: string;
  current_location_id?: number;
  sire_id?: number;
  dam_id?: number;
}

export interface EventCreateRequest {
  animal_id: number;
  event_type: EventType;
  event_date: string;
  description?: string;
  notes?: string;
}

export interface LocationCreateRequest {
  name: string;
  address?: string;
  paddock_name?: string;
  description?: string;
}