export type Difficulty = "Easy" | "Medium" | "Hard";

export type TimeframeSlug =
  | "30days"
  | "3months"
  | "6months"
  | "moreThan6Months"
  | "allTime";

export interface Question {
  id: string;
  title: string;
  difficulty: Difficulty;
  frequency: number;
  acceptanceRate: number;
  link: string;
  topics: string[];
  company: string;
  timeframe: TimeframeSlug;
  timeframes: TimeframeSlug[];
  frequencyByTimeframe: Partial<Record<TimeframeSlug, number>>;
}

export interface Company {
  slug: string;
  name: string;
  questionCount: number;
}

export type ProgressStatus = "not-started" | "attempted" | "completed";

export interface ProgressEntry {
  status: ProgressStatus;
  updatedAt: number;
  notes: string | null;
}

export type ProgressMap = Record<string, ProgressEntry>;
