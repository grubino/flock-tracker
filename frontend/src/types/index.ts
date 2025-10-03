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
  MITE_TREATMENT: "mite_treatment",
  LAMBING: "lambing",
  HEALTH_CHECK: "health_check",
  DEATH: "death",
  OTHER: "other"
} as const;

export const ExpenseCategory = {
  FEED: "feed",
  SEED: "seed",
  MEDICATION: "medication",
  VETERINARY: "veterinary",
  INFRASTRUCTURE: "infrastructure",
  EQUIPMENT: "equipment",
  SUPPLIES: "supplies",
  UTILITIES: "utilities",
  LABOR: "labor",
  MAINTENANCE: "maintenance",
  OTHER: "other"
} as const;

export type AnimalType = typeof AnimalType[keyof typeof AnimalType];
export type SheepGender = typeof SheepGender[keyof typeof SheepGender];
export type ChickenGender = typeof ChickenGender[keyof typeof ChickenGender];
export type EventType = typeof EventType[keyof typeof EventType];
export type ExpenseCategory = typeof ExpenseCategory[keyof typeof ExpenseCategory];

export interface Photograph {
  id: number;
  filename: string;
  file_path: string;
  caption?: string;
  is_primary: boolean;
  width?: number;
  height?: number;
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
  photographs?: Photograph[];
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

export interface Vendor {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorCreateRequest {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
}

export interface ExpenseLineItem {
  id: number;
  description: string;
  category?: ExpenseCategory;
  quantity?: string;
  unit_price?: string;
  amount: string;
}

export interface ExpenseLineItemCreate {
  description: string;
  category?: ExpenseCategory;
  quantity?: string;
  unit_price?: string;
  amount: string;
}

export interface ReceiptBrief {
  id: number;
  filename: string;
  file_path: string;
}

export interface Expense {
  id: number;
  category: ExpenseCategory;
  amount: string;
  description: string;
  notes?: string;
  expense_date: string;
  vendor_id?: number;
  receipt_id?: number;
  vendor?: Vendor;
  receipt?: ReceiptBrief;
  line_items: ExpenseLineItem[];
  created_at: string;
  updated_at: string;
}

export interface ExpenseCreateRequest {
  category: ExpenseCategory;
  amount: string;
  description: string;
  notes?: string;
  expense_date: string;
  vendor_id?: number;
  receipt_id?: number;
  line_items?: ExpenseLineItemCreate[];
}

export interface Receipt {
  id: number;
  filename: string;
  file_path: string;
  file_type: string;
  raw_text?: string;
  extracted_data?: OCRExtractedData;
  expense_id?: number;
  created_at: string;
  updated_at: string;
}

export interface OCRExtractedData {
  vendor?: string;
  items: Array<{
    description: string;
    amount: string;
  }>;
  total?: string;
  date?: string;
}

export interface OCRResult {
  raw_text: string;
  vendor?: string;
  items: Array<{
    description: string;
    amount: string;
  }>;
  total?: string;
  date?: string;
}