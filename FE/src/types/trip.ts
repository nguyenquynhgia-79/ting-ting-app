export interface TripPreference {
  id: string;
  trip_id: string;
  num_people: number;
  budget_per_person: number | string;
  preferences: string;
  travel_style: string;
  radius_km: number;
}

export interface TripStop {
  id: string;
  trip_id: string;
  order: number;
  name: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  type?: string | null;
  scheduled_time?: string | null;
  photo_url?: string | null;
  rating?: number | null;
  description?: string | null;
  google_place_id?: string | null;
  source: 'AI' | 'MANUAL';
}

export interface Trip {
  id: string;
  group_id: string;
  created_by: string;
  name: string;
  destination: string;
  destination_lat?: number | null;
  destination_lng?: number | null;
  start_date: string;
  end_date: string;
  mode: 'AI' | 'MANUAL';
  status: 'DRAFT' | 'PUBLISHED';
  created_at: string;
  preference?: TripPreference | null;
  stops?: TripStop[];
}
