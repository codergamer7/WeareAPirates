import type { MediaType } from "@/lib/config";

export type ProfileStatus = "pending" | "active" | "suspended";
export type ProfileRole = "user" | "admin";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: ProfileRole;
  status: ProfileStatus;
  suspension_note: string | null;
  created_at: string;
  approved_at: string | null;
}

export interface TmdbItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  media_type?: MediaType | "person";
}

export interface WatchProgress {
  id: string;
  user_id: string;
  media_type: MediaType;
  tmdb_id: number;
  season: number | null;
  episode: number | null;
  title: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  progress_seconds: number;
  duration_seconds: number;
  progress_percent: number;
  completed: boolean;
  updated_at: string;
}

export type ListType = "watchlist" | "saved" | "favorite";

export interface UserListItem {
  id: string;
  user_id: string;
  media_type: MediaType;
  tmdb_id: number;
  list_type: ListType;
  title: string | null;
  poster_path: string | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  media_type: MediaType;
  tmdb_id: number;
  title: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  air_date: string | null; // YYYY-MM-DD of the thing being awaited
  label: string | null; // e.g. "S2 · E5" or "In theaters"
  created_at: string;
}
