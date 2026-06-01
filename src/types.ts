export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: "exhausted" | "anxious" | "guilty" | "irritated" | "sad" | "calm";
  counselorFeedback?: string; // Comfort letter from the future son or expert
}

export type TipCategory = "adhd" | "mother" | "exam_prep" | "healing";

export interface TipItem {
  id: string;
  category: TipCategory;
  title: string;
  content: string;
  description: string;
}
