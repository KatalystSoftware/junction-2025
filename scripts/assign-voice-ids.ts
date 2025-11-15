/**
 * Script to assign consistent ElevenLabs voice IDs to all characters
 * Based on character age, gender (inferred from name), and personality traits
 */

import fs from "fs/promises";
import path from "path";

// ElevenLabs voice IDs mapped to character archetypes
const VOICE_MAPPING = {
  // Female voices
  female_young_energetic: "21m00Tcm4TlvDq8ikWAM", // Rachel - Expressive, emotional, young
  female_young_calm: "MF3mGyEYCl7XYWbV9V6O", // Elli - Young, calmer
  female_adult_warm: "EXAVITQu4vr4xnSDxMaL", // Bella - Warm, friendly
  female_adult_emotional: "AZnzlk1XvdvUeBnXmlld", // Domi - Concerned, worried
  female_mature_calm: "ThT5KcBeYPX3keUQqHPh", // Dorothy - Can convey sadness

  // Male voices
  male_young_energetic: "TX3LPaxmHKxFdv7VOQHJ", // Liam - Energetic, excited
  male_young_anxious: "ErXwobaYiN019PkySvjV", // Antoni - Anxious, nervous
  male_adult_calm: "pNInz6obpgDQGcFmaJgB", // Adam - Deep, calm
  male_adult_upbeat: "pqHfZKP75CvOlQylNhV4", // Bill - Upbeat, optimistic
  male_mature_firm: "SOYHLrjzK2X1ezoPC6cr", // Harry - Can sound frustrated
};

// Finnish names - gender inference (very basic, could be improved)
const FEMALE_NAMES = [
  "minna",
  "noora",
  "laura",
  "emma",
  "sari",
  "kaisa",
  "anna",
  "maija",
  "liisa",
  "tiina",
  "katri",
  "raija",
  "helena",
  "sofia",
  "olivia",
  "aino",
  "sara",
];

const MALE_NAMES = [
  "jukka",
  "petri",
  "mikael",
  "hannu",
  "risto",
  "mikko",
  "matias",
  "tuomas",
  "aleksi",
  "eero",
  "markku",
  "ville",
  "pekka",
  "antti",
  "jani",
  "esko",
];

interface Character {
  characterId: string;
  name: string;
  age: number;
  occupation: string;
  personality: {
    impulsiveness: number;
    trustingness: number;
    financial_literacy: number;
    stubbornness: number;
    emotionality: number;
  };
  communicationStyle: {
    formality: string;
    language: string;
    prefersVoice: number;
    callsWhenEmotional: boolean;
    voiceId?: string;
  };
  [key: string]: any;
}

/**
 * Infer gender from Finnish first name
 */
function inferGender(fullName: string): "female" | "male" | "unknown" {
  const firstName = fullName.split(" ")[0].toLowerCase();

  if (FEMALE_NAMES.includes(firstName)) {
    return "female";
  }
  if (MALE_NAMES.includes(firstName)) {
    return "male";
  }
  return "unknown";
}

/**
 * Select appropriate voice ID based on character attributes
 */
function selectVoiceId(character: Character): string {
  const gender = inferGender(character.name);
  const age = character.age;
  const emotionality = character.personality.emotionality;
  const impulsiveness = character.personality.impulsiveness;

  // Age categories
  const isYoung = age < 26; // Under 26
  const isMature = age > 45; // Over 45
  const isAdult = !isYoung && !isMature; // 26-45

  // Personality indicators
  const isEmotional = emotionality > 0.6;
  const isEnergetic = impulsiveness > 0.6;
  const isCalm = emotionality < 0.5 && impulsiveness < 0.5;

  if (gender === "female") {
    if (isYoung) {
      return isEnergetic || isEmotional
        ? VOICE_MAPPING.female_young_energetic
        : VOICE_MAPPING.female_young_calm;
    } else if (isMature) {
      return VOICE_MAPPING.female_mature_calm;
    } else {
      // Adult
      return isEmotional
        ? VOICE_MAPPING.female_adult_emotional
        : VOICE_MAPPING.female_adult_warm;
    }
  } else if (gender === "male") {
    if (isYoung) {
      return isEnergetic
        ? VOICE_MAPPING.male_young_energetic
        : VOICE_MAPPING.male_young_anxious;
    } else if (isMature) {
      return VOICE_MAPPING.male_mature_firm;
    } else {
      // Adult
      return isCalm
        ? VOICE_MAPPING.male_adult_calm
        : VOICE_MAPPING.male_adult_upbeat;
    }
  } else {
    // Default fallback for unknown gender
    return isYoung
      ? VOICE_MAPPING.female_young_calm
      : VOICE_MAPPING.male_adult_calm;
  }
}

/**
 * Process all character files and assign voice IDs
 */
async function assignVoiceIds() {
  const charactersDir = path.join(
    process.cwd(),
    "characters",
    "individuals",
  );

  try {
    const files = await fs.readdir(charactersDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    console.log(`📁 Found ${jsonFiles.length} character files\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const file of jsonFiles) {
      const filePath = path.join(charactersDir, file);

      // Read character data
      const data = await fs.readFile(filePath, "utf-8");
      const character: Character = JSON.parse(data);

      // Check if voiceId already exists
      if (character.communicationStyle.voiceId) {
        console.log(`⏭️  Skipping ${character.name} (already has voiceId)`);
        skippedCount++;
        continue;
      }

      // Select and assign voice ID
      const voiceId = selectVoiceId(character);
      character.communicationStyle.voiceId = voiceId;

      // Write back to file with pretty formatting
      await fs.writeFile(filePath, JSON.stringify(character, null, 2) + "\n");

      const gender = inferGender(character.name);
      const voiceKey = Object.entries(VOICE_MAPPING).find(
        ([_, id]) => id === voiceId,
      )?.[0];

      console.log(
        `✅ ${character.name} (${gender}, age ${character.age}) → ${voiceKey}`,
      );
      updatedCount++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Updated: ${updatedCount} characters`);
    console.log(`   Skipped: ${skippedCount} characters (already had voiceId)`);
    console.log(`\n✨ Voice IDs assigned successfully!`);
  } catch (error) {
    console.error("❌ Error assigning voice IDs:", error);
    process.exit(1);
  }
}

// Run the script
assignVoiceIds();
