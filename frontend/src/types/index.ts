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
  MEDICATION: "medication",
  BREEDING: "breeding",
  BIRTH: "birth",
  DEATH: "death",
  INJURY: "injury",
  TREATMENT: "treatment",
  SLAUGHTER: "slaughter",
  SOLD: "sold",
  BRED: "bred",
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
  TAX: "tax",
  OTHER: "other"
} as const;

export const ProductCategory = {
  PET_FOOD: "pet_food",
  EGGS: "eggs",
  WOOL: "wool",
  HONEY: "honey",
  DAIRY: "dairy",
  VEGETABLES: "vegetables",
  FRUITS: "fruits",
  PROCESSED: "processed",
  OTHER: "other"
} as const;

export const CareType = {
  FEEDING: "FEEDING",
  WATERING: "WATERING",
  DEWORMING: "DEWORMING",
  DELICING: "DELICING",
  VACCINATION: "VACCINATION",
  HEALTH_CHECK: "HEALTH_CHECK",
  HOOF_TRIM: "HOOF_TRIM",
  SHEARING: "SHEARING",
  GROOMING: "GROOMING",
  BREEDING_CHECK: "BREEDING_CHECK",
  MEDICATION: "MEDICATION",
  MITE_TREATMENT: "MITE_TREATMENT",
  CLEANING: "CLEANING",
  OTHER: "OTHER"
} as const;

export const RecurrenceType = {
  ONCE: "ONCE",
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  BIWEEKLY: "BIWEEKLY",
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  YEARLY: "YEARLY"
} as const;

export const ScheduleStatus = {
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED"
} as const;

export const TaskStatus = {
  PENDING: "PENDING",
  OVERDUE: "OVERDUE",
  COMPLETED: "COMPLETED",
  SKIPPED: "SKIPPED"
} as const;

export type AnimalType = typeof AnimalType[keyof typeof AnimalType];
export type SheepGender = typeof SheepGender[keyof typeof SheepGender];
export type ChickenGender = typeof ChickenGender[keyof typeof ChickenGender];
export type EventType = typeof EventType[keyof typeof EventType];
export type ExpenseCategory = typeof ExpenseCategory[keyof typeof ExpenseCategory];
export type ProductCategory = typeof ProductCategory[keyof typeof ProductCategory];
export type CareType = typeof CareType[keyof typeof CareType];
export type RecurrenceType = typeof RecurrenceType[keyof typeof RecurrenceType];
export type ScheduleStatus = typeof ScheduleStatus[keyof typeof ScheduleStatus];
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

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
  on_farm: boolean;
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

export interface BatchReceiptItem {
  id: number;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  expense_id?: number;
  receipt_id?: number;
  ocr_attempts: number;
  llm_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface BatchReceiptUpload {
  batch_id: string;
  total_count: number;
  processed_count: number;
  success_count: number;
  error_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  ocr_engine: string;
  created_at: string;
  updated_at: string;
}

export interface BatchReceiptStatus extends BatchReceiptUpload {
  items: BatchReceiptItem[];
}

export interface OCRResult {
  raw_text: string;
  vendor?: string;
  items: Array<{
    description: string;
    category?: ExpenseCategory;
    amount: string;
  }>;
  total?: string;
  date?: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  category: ProductCategory;
  price: number;
  inventory_quantity: number;
  unit: string;
  sku?: string;
  image_url?: string;
  is_active: boolean;
  created_by_id: number;
  created_at: string;
  updated_at: string;
}

export interface ProductCreateRequest {
  name: string;
  description?: string;
  category: ProductCategory;
  price: number;
  inventory_quantity: number;
  unit: string;
  sku?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface CareSchedule {
  id: number;
  title: string;
  description?: string;
  care_type: CareType;
  recurrence_type: RecurrenceType;
  start_date: string;
  end_date?: string;
  next_due_date: string;
  recurrence_interval: number;
  reminder_enabled: boolean;
  reminder_days_before: number;
  reminder_hours_before: number;
  status: ScheduleStatus;
  priority: string;
  animal_ids?: number[];
  location_id?: number;
  assigned_to_id?: number;
  created_by_id?: number;
  notes?: string;
  estimated_duration_minutes?: number;
  created_at: string;
  updated_at: string;
}

export interface CareScheduleCreateRequest {
  title: string;
  description?: string;
  care_type: CareType;
  recurrence_type?: RecurrenceType;
  start_date: string;
  end_date?: string;
  recurrence_interval?: number;
  reminder_enabled?: boolean;
  reminder_days_before?: number;
  reminder_hours_before?: number;
  status?: ScheduleStatus;
  priority?: string;
  animal_ids?: number[];
  location_id?: number;
  assigned_to_id?: number;
  notes?: string;
  estimated_duration_minutes?: number;
}

export interface CareCompletion {
  id: number;
  schedule_id: number;
  scheduled_date: string;
  completed_date: string;
  completed_by_id?: number;
  status: TaskStatus;
  notes?: string;
  duration_minutes?: number;
  event_id?: number;
  created_at: string;
  updated_at: string;
}

export interface CareCompletionCreateRequest {
  schedule_id: number;
  scheduled_date: string;
  completed_date: string;
  status?: TaskStatus;
  notes?: string;
  duration_minutes?: number;
  event_id?: number;
}

export interface UpcomingTask {
  schedule_id: number;
  title: string;
  care_type: CareType;
  due_date: string;
  priority: string;
  animal_ids?: number[];
  location_id?: number;
  assigned_to_id?: number;
  status: string;
  days_until_due: number;
}

export interface TaskSummary {
  pending_count: number;
  overdue_count: number;
  completed_today_count: number;
  upcoming_7_days_count: number;
}

export interface Livestream {
  id: number;
  name: string;
  description?: string;
  stream_url: string;
  stream_type: "rtsp" | "rtmp";
  location_id?: number;
  is_active: boolean;
  username?: string;
  password?: string;
  created_at: string;
  updated_at: string;
  location?: Location;
}

export interface LivestreamCreateRequest {
  name: string;
  description?: string;
  stream_url: string;
  stream_type: "rtsp" | "rtmp";
  location_id?: number;
  is_active?: boolean;
  username?: string;
  password?: string;
}