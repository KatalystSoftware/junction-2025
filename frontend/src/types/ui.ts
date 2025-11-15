/**
 * Shared UI Types
 */

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  avatarImage?: string;
  lastMessage: string;
  timestamp: string;
  lastMessageTime: Date;
  unreadCount: number;
  online: boolean;
  gender?: string;
  trust: number;
}

export interface Message {
  id: string;
  contactId: string;
  role: "user" | "contact";
  content: string;
  timestamp: Date;
  type?: "text" | "voice";
  duration?: number; // duration in seconds for voice messages
  audioUrl?: string; // base64 data URL for voice messages
  voiceUrgency?: "calm" | "concerned" | "urgent" | "excited";
}
