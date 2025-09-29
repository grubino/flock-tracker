export enum AnimalType {
  SHEEP = "sheep",
  CHICKEN = "chicken",
  HIVE = "hive"
}

export enum SheepGender {
  EWE = "ewe",
  RAM = "ram"
}

export enum ChickenGender {
  HEN = "hen",
  ROOSTER = "rooster"
}

export enum EventType {
  DEWORMING = "deworming",
  DELICING = "delicing",
  LAMBING = "lambing",
  VACCINATION = "vaccination",
  HEALTH_CHECK = "health_check",
  OTHER = "other"
}

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