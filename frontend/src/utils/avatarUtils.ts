/**
 * Avatar utilities using randomuser.me API
 */

// Reserved avatar IDs for player selection (excluded from NPCs)
const RESERVED_PLAYER_AVATARS = {
  female: [12, 24, 36], // women/12, women/24, women/36
  male: [15, 32, 48], // men/15, men/32, men/48
};

/**
 * Player avatar options for onboarding
 */
export const PLAYER_AVATAR_OPTIONS = [
  {
    id: "female-1",
    gender: "female" as const,
    url: "https://randomuser.me/api/portraits/women/12.jpg",
    label: "Professional",
  },
  {
    id: "female-2",
    gender: "female" as const,
    url: "https://randomuser.me/api/portraits/women/24.jpg",
    label: "Friendly",
  },
  {
    id: "female-3",
    gender: "female" as const,
    url: "https://randomuser.me/api/portraits/women/36.jpg",
    label: "Confident",
  },
  {
    id: "male-1",
    gender: "male" as const,
    url: "https://randomuser.me/api/portraits/men/15.jpg",
    label: "Professional",
  },
  {
    id: "male-2",
    gender: "male" as const,
    url: "https://randomuser.me/api/portraits/men/32.jpg",
    label: "Friendly",
  },
  {
    id: "male-3",
    gender: "male" as const,
    url: "https://randomuser.me/api/portraits/men/48.jpg",
    label: "Confident",
  },
];

/**
 * Get player avatar URL by ID
 */
export function getPlayerAvatarUrl(avatarId: string): string {
  const avatar = PLAYER_AVATAR_OPTIONS.find((a) => a.id === avatarId);
  return avatar?.url || PLAYER_AVATAR_OPTIONS[0].url;
}

/**
 * Generate avatar URL from randomuser.me based on character data
 * Uses a consistent seed to ensure the same character always gets the same avatar
 * Excludes reserved player avatars
 */
export function generateAvatarUrl(
  characterId: string,
  gender: "male" | "female",
): string {
  // Use characterId as seed to ensure consistency
  // randomuser.me will return the same person for the same seed
  const seed = characterId.replace(/[^a-zA-Z0-9]/g, "");
  const reservedIds = RESERVED_PLAYER_AVATARS[gender];

  let avatarId = Math.abs(hashString(seed)) % 100;

  // If this ID is reserved for players, offset it
  while (reservedIds.includes(avatarId)) {
    avatarId = (avatarId + 7) % 100; // Use prime number offset to avoid conflicts
  }

  return `https://randomuser.me/api/portraits/${gender === "female" ? "women" : "men"}/${avatarId}.jpg`;
}

/**
 * Simple string hash function to convert characterId to a number
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Get avatar initials from name
 */
export function getAvatarInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
