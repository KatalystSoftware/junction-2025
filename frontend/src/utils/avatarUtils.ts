/**
 * Avatar utilities using randomuser.me API
 */

/**
 * Generate avatar URL from randomuser.me based on character data
 * Uses a consistent seed to ensure the same character always gets the same avatar
 */
export function generateAvatarUrl(
  characterId: string,
  gender: "male" | "female",
): string {
  // Use characterId as seed to ensure consistency
  // randomuser.me will return the same person for the same seed
  const seed = characterId.replace(/[^a-zA-Z0-9]/g, "");

  return `https://randomuser.me/api/portraits/${gender === "female" ? "women" : "men"}/${
    Math.abs(hashString(seed)) % 100
  }.jpg`;
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
