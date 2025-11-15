/**
 * Elämäpeli 2025 - Merchant Database
 * Realistic Finnish merchants with personality-driven selection
 *
 * Characters shop at different merchants based on their personality:
 * - Financial literacy: Budget vs premium stores
 * - Impulsiveness: Temu, fast food, delivery
 * - Emotionality: Comfort purchases, delivery services
 */

import type { CharacterPersonality } from "../types/game-types.ts";

export const MERCHANTS = {
  groceries: {
    budget: ["Lidl", "Alepa", "Sale"],
    normal: ["S-Market", "K-Market", "K-Citymarket"],
    premium: ["Stockmann Herkku", "Ruohonjuuri"],
  },

  dining: {
    fastfood: ["Hesburger", "McDonald's", "Subway", "Pizza Hut"],
    casual: ["Ravintola Kuu", "Café Esplanad", "Fazer Café", "Friends & Brgrs"],
    delivery: ["Wolt", "Foodora"],
  },

  coffee: [
    "Espresso House",
    "Starbucks",
    "R-Kioski",
    "Café Picnic",
    "Wayne's Coffee",
    "Robert's Coffee",
  ],

  onlineShopping: {
    fashion: ["Zalando", "H&M Online", "ASOS", "Boozt"],
    marketplace: ["Temu", "AliExpress", "Wish"],
    general: ["Amazon", "eBay"],
    finnish: ["Verkkokauppa.com", "Gigantti", "Power"],
  },

  entertainment: {
    streaming: ["Netflix", "Spotify", "HBO Max", "Disney+", "YouTube Premium"],
    games: ["Steam", "PlayStation Store", "Nintendo eShop", "Epic Games"],
    venues: ["Finnkino", "Bio Rex", "Linnanmäki", "Flamingo Spa"],
  },

  transportation: [
    "HSL", // Public transport Helsinki
    "VR", // Trains
    "Bolt", // Ride-sharing
    "Tier", // E-scooter
    "eBike rental",
  ],

  utilities: ["Helen Sähkö", "Elisa", "Telia", "DNA", "Fortum"],
};

/**
 * Select merchant based on category and personality
 */
export function selectMerchant(
  category: string,
  personality: CharacterPersonality,
): string {
  const merchants = MERCHANTS[category as keyof typeof MERCHANTS];

  if (!merchants) {
    return "Unknown Merchant";
  }

  switch (category) {
    case "groceries":
      // Low financial literacy = premium/normal stores (doesn't shop smart)
      if (personality.financial_literacy < 0.3) {
        return randomFrom([
          ...(merchants as any).normal,
          ...(merchants as any).premium,
        ]);
      }
      // High financial literacy = budget stores (shops smart)
      if (personality.financial_literacy > 0.7) {
        return randomFrom([
          ...(merchants as any).budget,
          ...(merchants as any).normal,
        ]);
      }
      // Average = normal stores
      return randomFrom((merchants as any).normal);

    case "onlineShopping":
      // Impulsive people attracted to cheap marketplaces (Temu deals)
      if (personality.impulsiveness > 0.6) {
        return Math.random() > 0.5
          ? randomFrom((merchants as any).marketplace)
          : randomFrom([
              ...(merchants as any).fashion,
              ...(merchants as any).general,
            ]);
      }
      // Normal people use regular shops
      return randomFrom([
        ...(merchants as any).fashion,
        ...(merchants as any).general,
        ...(merchants as any).finnish,
      ]);

    case "dining":
      // Emotional/stressed people order delivery more
      if (personality.emotionality > 0.6 && Math.random() > 0.4) {
        return randomFrom((merchants as any).delivery);
      }
      // Impulsive = fast food
      if (personality.impulsiveness > 0.6) {
        return randomFrom((merchants as any).fastfood);
      }
      // Others = casual dining
      return randomFrom((merchants as any).casual);

    case "coffee":
      return randomFrom(merchants as string[]);

    case "transportation":
      return randomFrom(merchants as string[]);

    case "utilities":
      return randomFrom(merchants as string[]);

    case "entertainment":
      // Random selection from all entertainment options
      const allEntertainment = [
        ...(merchants as any).streaming,
        ...(merchants as any).games,
        ...(merchants as any).venues,
      ];
      return randomFrom(allEntertainment);

    default:
      if (Array.isArray(merchants)) {
        return randomFrom(merchants);
      }
      // Fallback to first available option
      return randomFrom(Object.values(merchants).flat());
  }
}

/**
 * Get a random merchant name from any category (for impulse purchases)
 */
export function getRandomMerchant(): string {
  const allCategories = [
    "groceries",
    "dining",
    "coffee",
    "onlineShopping",
    "entertainment",
  ];
  const category = randomFrom(allCategories);

  // For categories with subcategories, flatten them
  const merchants = MERCHANTS[category as keyof typeof MERCHANTS];

  if (Array.isArray(merchants)) {
    return randomFrom(merchants);
  }

  // Flatten nested object
  const allMerchants = Object.values(merchants).flat();
  return randomFrom(allMerchants);
}

/**
 * Helper function to get random item from array
 */
function randomFrom<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error("Cannot select from empty array");
  }
  return array[Math.floor(Math.random() * array.length)];
}
