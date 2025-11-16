/**
 * Translation utility for UI text
 */

export type Language = "en" | "fi" | "sv";

export interface Translations {
  // Common
  continue: string;
  cancel: string;
  save: string;
  delete: string;
  edit: string;
  close: string;

  // Onboarding
  onboarding: {
    chooseIdentity: string;
    howDoYouWant: string;
    pickAvatar: string;
    yourName: string;
    enterName: string;
    yourAvatar: string;
    preferredLanguage: string;
    welcomeTitle: string;
    welcomeSubtitle: string;
    welcomeDescription: string;
    readyTitle: string;
    readySubtitle: string;
    readyDescription: string;
    features: {
      chatNaturally: string;
      buildTrust: string;
      helpProgress: string;
    };
    startJourney: string;
    pressKeys: string;
    or: string;
  };

  // Chat Interface
  chat: {
    typeMessage: string;
    sendMessage: string;
    newClient: string;
    financialAdvisor: string;
    playersBoss: string;
    level: string;
    xp: string;
  };

  // Quick Responses
  quickResponses: {
    tellMeMore: string;
    thatSoundsGood: string;
    helpMeUnderstand: string;
    whatAreOptions: string;
  };

  // Boss Onboarding Responses
  bossOnboarding: {
    response1Action: string;
    response1Outcome: string;
    response1Full: string;
    response2Action: string;
    response2Outcome: string;
    response2Full: string;
    response3Action: string;
    response3Outcome: string;
    response3Full: string;
  };

  // Stats Modal
  stats: {
    yourStats: string;
    avgTrust: string;
    sessions: string;
    clients: string;
    streak: string;
    coins: string;
    savingsGenerated: string;
    debtCleared: string;
    achievements: string;
    level: string;
    xp: string;
    restartGame: string;
  };

  // Consultation End
  consultationEnd: {
    title: string;
    coinsEarned: string;
    quality: string;
    startingNext: string;
    firstSteps: string;
    firstStepsDesc: string;
    achievementsUnlocked: string;
  };

  // Quality Levels
  qualityLevels: {
    excellent: string; // 9-10
    good: string; // 7-8
    adequate: string; // 5-6
    belowAverage: string; // 3-4
    poor: string; // 0-2
  };

  // Achievements
  achievements: {
    [key: string]: {
      name: string;
      description: string;
    };
  };
}

const translations: Record<Language, Translations> = {
  en: {
    continue: "Continue",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    close: "Close",

    onboarding: {
      chooseIdentity: "Choose Your Identity",
      howDoYouWant: "How do you want to be seen?",
      pickAvatar: "Pick an avatar that represents you as a financial advisor.",
      yourName: "Your Name",
      enterName: "Enter your name",
      yourAvatar: "Your Avatar",
      preferredLanguage: "Preferred Language",
      welcomeTitle: "Welcome to Gansos Finances!",
      welcomeSubtitle: "Your Financial Advisory Career Starts Here",
      welcomeDescription:
        "You'll chat with clients via messaging, understand their situations, and provide thoughtful advice. Each interaction builds trust. Good advice transforms lives.",
      readyTitle: "Ready to Start?",
      readySubtitle: "Your First Client Awaits",
      readyDescription:
        "Michael Scott is waiting in your inbox. He's your boss and has high hopes. Be empathetic, think critically, and provide advice that truly helps.",
      features: {
        chatNaturally: "Chat naturally with clients about their finances",
        buildTrust: "Build trust through quality, personalized advice",
        helpProgress: "Help clients achieve real financial progress",
      },
      startJourney: "Start Your Journey",
      pressKeys: "Press",
      or: "or",
    },

    chat: {
      typeMessage: "Type a message...",
      sendMessage: "Send message",
      newClient: "New Client",
      financialAdvisor: "Financial Advisor",
      playersBoss: "player's boss",
      level: "Level",
      xp: "XP",
    },

    quickResponses: {
      tellMeMore: "Tell me more about this",
      thatSoundsGood: "That sounds good",
      helpMeUnderstand: "Help me understand",
      whatAreOptions: "What are my options?",
    },

    bossOnboarding: {
      response1Action: "Acknowledge and express readiness",
      response1Outcome: "Start helping clients",
      response1Full:
        "Understood! I'm ready to help clients and give them the best financial advice I can. Thanks for the overview!",
      response2Action: "Show enthusiasm to begin",
      response2Outcome: "Get started immediately",
      response2Full:
        "Got it! Let's get started. I'm excited to meet clients and help them with their financial challenges.",
      response3Action: "Express gratitude and commitment",
      response3Outcome: "Commit to doing well",
      response3Full:
        "Thanks! I'll do my best to provide quality advice and keep learning. Looking forward to working with you!",
    },

    stats: {
      yourStats: "Your Stats",
      avgTrust: "Avg Trust",
      sessions: "Sessions",
      clients: "Clients Helped",
      streak: "Current Streak",
      coins: "Advisor Coins",
      savingsGenerated: "Savings Generated",
      debtCleared: "Debt Cleared",
      achievements: "Achievements",
      level: "Level",
      xp: "XP",
      restartGame: "Restart Game",
    },

    consultationEnd: {
      title: "Consultation Complete!",
      coinsEarned: "Coins Earned",
      quality: "Quality:",
      startingNext: "Starting next consultation in a moment...",
      firstSteps: "First Steps",
      firstStepsDesc: "Help your first client",
      achievementsUnlocked: "Achievements Unlocked",
    },

    qualityLevels: {
      excellent: "Excellent advice",
      good: "Good advice",
      adequate: "Adequate advice",
      belowAverage: "Below average advice",
      poor: "Poor advice",
    },

    achievements: {
      first_client: {
        name: "First Steps",
        description: "Help your first client",
      },
      ten_clients: { name: "Growing Practice", description: "Help 10 clients" },
      fifty_clients: {
        name: "Trusted Advisor",
        description: "Help 50 clients",
      },
      skill_level_3: {
        name: "Competent Advisor",
        description: "Reach skill level 3",
      },
      skill_level_5: {
        name: "Expert Advisor",
        description: "Reach skill level 5",
      },
      skill_level_8: {
        name: "Master Advisor",
        description: "Reach skill level 8",
      },
      perfect_score: {
        name: "Flawless Advice",
        description: "Get a perfect 10/10 quality score",
      },
      savings_10k: {
        name: "Savings Champion",
        description: "Help clients save €10,000",
      },
      debt_crusher: {
        name: "Debt Crusher",
        description: "Help clients clear €5,000 in debt",
      },
      millionaire_maker: {
        name: "Millionaire Maker",
        description: "Help clients save €100,000 total",
      },
      trusted_friend: {
        name: "Trusted Friend",
        description: "Get a character recommendation",
      },
      reputation_75: {
        name: "Well Respected",
        description: "Reach 75 reputation",
      },
      reputation_100: {
        name: "Legendary Advisor",
        description: "Reach maximum reputation (100)",
      },
      budget_master: {
        name: "Budget Master",
        description: "Reach level 7 in budgeting",
      },
      debt_specialist: {
        name: "Debt Specialist",
        description: "Reach level 7 in debt management",
      },
      investment_guru: {
        name: "Investment Guru",
        description: "Reach level 7 in investing",
      },
      quick_learner: {
        name: "Quick Learner",
        description: "Pass a boss quiz with 100% score",
      },
      coffee_connoisseur: {
        name: "Coffee Connoisseur",
        description: "Help a client reduce coffee spending by €50+/month",
      },
      temu_terminator: {
        name: "Temu Terminator",
        description: "Stop a client's impulse online shopping habit",
      },
      savings_champion: {
        name: "Savings Champion",
        description: "Help a client save 20%+ of their income",
      },
      big_win: {
        name: "Big Win",
        description: "Help a client save €200+ in a single consultation",
      },
    },
  },

  fi: {
    continue: "Jatka",
    cancel: "Peruuta",
    save: "Tallenna",
    delete: "Poista",
    edit: "Muokkaa",
    close: "Sulje",

    onboarding: {
      chooseIdentity: "Valitse Identiteettisi",
      howDoYouWant: "Miten haluat tulla nähdyksi?",
      pickAvatar:
        "Valitse avatar, joka edustaa sinua taloudellisena neuvonantajana.",
      yourName: "Nimesi",
      enterName: "Kirjoita nimesi",
      yourAvatar: "Avatarisi",
      preferredLanguage: "Ensisijainen Kieli",
      welcomeTitle: "Tervetuloa Gansos Financesiin!",
      welcomeSubtitle: "Taloudellinen Neuvonantaja-urasi Alkaa Tästä",
      welcomeDescription:
        "Keskustelet asiakkaiden kanssa viestien kautta, ymmärrät heidän tilanteensa ja tarjoat harkittuja neuvoja. Jokainen vuorovaikutus rakentaa luottamusta. Hyvät neuvot muuttavat elämää.",
      readyTitle: "Oletko Valmis Aloittamaan?",
      readySubtitle: "Ensimmäinen Asiakkaasi Odottaa",
      readyDescription:
        "Michael Scott odottaa postilaatikossasi. Hän on pomosi ja hänellä on suuret odotukset. Ole empaattinen, ajattele kriittisesti ja tarjoa neuvoja, jotka todella auttavat.",
      features: {
        chatNaturally:
          "Keskustele luonnollisesti asiakkaiden kanssa heidän talousasioistaan",
        buildTrust:
          "Rakenna luottamusta laadukkaiden, henkilökohtaisten neuvojen kautta",
        helpProgress:
          "Auta asiakkaita saavuttamaan todellista taloudellista edistystä",
      },
      startJourney: "Aloita Matkasi",
      pressKeys: "Paina",
      or: "tai",
    },

    chat: {
      typeMessage: "Kirjoita viesti...",
      sendMessage: "Lähetä viesti",
      newClient: "Uusi Asiakas",
      financialAdvisor: "Taloudellinen Neuvonantaja",
      playersBoss: "pelaajan pomo",
      level: "Taso",
      xp: "KP",
    },

    quickResponses: {
      tellMeMore: "Kerro minulle lisää tästä",
      thatSoundsGood: "Kuulostaa hyvältä",
      helpMeUnderstand: "Auta minua ymmärtämään",
      whatAreOptions: "Mitkä ovat vaihtoehtoni?",
    },

    bossOnboarding: {
      response1Action: "Vahvista ja ilmaise valmiutesi",
      response1Outcome: "Aloita asiakkaiden auttaminen",
      response1Full:
        "Ymmärretty! Olen valmis auttamaan asiakkaita ja antamaan heille parasta mahdollista taloudellista neuvontaa. Kiitos yleiskatsauksesta!",
      response2Action: "Osoita innostusta aloittamiseen",
      response2Outcome: "Aloita välittömästi",
      response2Full:
        "Selvä! Aloitetaan. Odotan innolla tapaamista asiakkaiden kanssa ja heidän auttamistaan taloudellisissa haasteissaan.",
      response3Action: "Ilmaise kiitollisuutta ja sitoutumista",
      response3Outcome: "Sitoudu tekemään hyvin",
      response3Full:
        "Kiitos! Teen parhaani antaakseni laadukasta neuvontaa ja jatkaakseni oppimista. Odotan innolla yhteistyötä kanssasi!",
    },

    stats: {
      yourStats: "Tilastosi",
      avgTrust: "Keskim. Luottamus",
      sessions: "Istunnot",
      clients: "Autettuja Asiakkaita",
      streak: "Nykyinen Putki",
      coins: "Neuvonantajan Kolikot",
      savingsGenerated: "Tuotetut Säästöt",
      debtCleared: "Maksetut Velat",
      achievements: "Saavutukset",
      level: "Taso",
      xp: "KP",
      restartGame: "Aloita Peli Uudelleen",
    },

    consultationEnd: {
      title: "Konsultaatio Valmis!",
      coinsEarned: "Ansaitut Kolikot",
      quality: "Laatu:",
      startingNext: "Aloitetaan seuraava konsultaatio hetken kuluttua...",
      firstSteps: "Ensimmäiset Askeleet",
      firstStepsDesc: "Auta ensimmäistä asiakastasi",
      achievementsUnlocked: "Avatut Saavutukset",
    },

    qualityLevels: {
      excellent: "Erinomainen neuvo",
      good: "Hyvä neuvo",
      adequate: "Riittävä neuvo",
      belowAverage: "Keskitason alapuolella oleva neuvo",
      poor: "Heikko neuvo",
    },

    achievements: {
      first_client: {
        name: "Ensimmäiset Askeleet",
        description: "Auta ensimmäistä asiakastasi",
      },
      ten_clients: {
        name: "Kasvava Käytäntö",
        description: "Auta 10 asiakasta",
      },
      fifty_clients: {
        name: "Luotettu Neuvonantaja",
        description: "Auta 50 asiakasta",
      },
      skill_level_3: {
        name: "Pätevä Neuvonantaja",
        description: "Saavuta taitotaso 3",
      },
      skill_level_5: {
        name: "Asiantuntijaneuvonantaja",
        description: "Saavuta taitotaso 5",
      },
      skill_level_8: {
        name: "Mestari Neuvonantaja",
        description: "Saavuta taitotaso 8",
      },
      perfect_score: {
        name: "Virheeton Neuvo",
        description: "Saa täydellinen 10/10 laatupisteet",
      },
      savings_10k: {
        name: "Säästömestari",
        description: "Auta asiakkaita säästämään €10,000",
      },
      debt_crusher: {
        name: "Velkojen Murskaj",
        description: "Auta asiakkaita maksamaan €5,000 velkoja",
      },
      millionaire_maker: {
        name: "Miljonäärin Tekijä",
        description: "Auta asiakkaita säästämään yhteensä €100,000",
      },
      trusted_friend: {
        name: "Luotettu Ystävä",
        description: "Saa hahmon suositus",
      },
      reputation_75: { name: "Arvostettu", description: "Saavuta 75 maine" },
      reputation_100: {
        name: "Legendaarinen Neuvonantaja",
        description: "Saavuta maksimimaine (100)",
      },
      budget_master: {
        name: "Budjettimestari",
        description: "Saavuta taso 7 budjetoinnissa",
      },
      debt_specialist: {
        name: "Velkaasiantuntija",
        description: "Saavuta taso 7 velkahallinnossa",
      },
      investment_guru: {
        name: "Sijoitusguru",
        description: "Saavuta taso 7 sijoittamisessa",
      },
      quick_learner: {
        name: "Nopea Oppija",
        description: "Läpäise pomovisa 100% tuloksella",
      },
      coffee_connoisseur: {
        name: "Kahviasiantuntija",
        description: "Auta asiakasta vähentämään kahvikuluja €50+/kk",
      },
      temu_terminator: {
        name: "Temu Terminaattori",
        description: "Lopeta asiakkaan impulsiivinen verkkokauppaostaminen",
      },
      savings_champion: {
        name: "Säästömestari",
        description: "Auta asiakasta säästämään 20%+ tuloistaan",
      },
      big_win: {
        name: "Iso Voitto",
        description: "Auta asiakasta säästämään €200+ yhdessä konsultaatiossa",
      },
    },
  },

  sv: {
    continue: "Fortsätt",
    cancel: "Avbryt",
    save: "Spara",
    delete: "Radera",
    edit: "Redigera",
    close: "Stäng",

    onboarding: {
      chooseIdentity: "Välj Din Identitet",
      howDoYouWant: "Hur vill du bli sedd?",
      pickAvatar:
        "Välj en avatar som representerar dig som finansiell rådgivare.",
      yourName: "Ditt Namn",
      enterName: "Ange ditt namn",
      yourAvatar: "Din Avatar",
      preferredLanguage: "Föredraget Språk",
      welcomeTitle: "Välkommen till Gansos Finances!",
      welcomeSubtitle: "Din Karriär Som Finansiell Rådgivare Börjar Här",
      welcomeDescription:
        "Du kommer att chatta med klienter via meddelanden, förstå deras situationer och ge genomtänkta råd. Varje interaktion bygger förtroende. Goda råd förändrar liv.",
      readyTitle: "Redo Att Börja?",
      readySubtitle: "Din Första Klient Väntar",
      readyDescription:
        "Michael Scott väntar i din inkorg. Han är din chef och har höga förhoppningar. Var empatisk, tänk kritiskt och ge råd som verkligen hjälper.",
      features: {
        chatNaturally: "Chatta naturligt med klienter om deras ekonomi",
        buildTrust: "Bygg förtroende genom kvalitativa, personliga råd",
        helpProgress: "Hjälp klienter att uppnå verkliga ekonomiska framsteg",
      },
      startJourney: "Börja Din Resa",
      pressKeys: "Tryck",
      or: "eller",
    },

    chat: {
      typeMessage: "Skriv ett meddelande...",
      sendMessage: "Skicka meddelande",
      newClient: "Ny Klient",
      financialAdvisor: "Finansiell Rådgivare",
      playersBoss: "spelarens chef",
      level: "Nivå",
      xp: "XP",
    },

    quickResponses: {
      tellMeMore: "Berätta mer om detta",
      thatSoundsGood: "Det låter bra",
      helpMeUnderstand: "Hjälp mig förstå",
      whatAreOptions: "Vilka är mina alternativ?",
    },

    bossOnboarding: {
      response1Action: "Bekräfta och uttryck beredskap",
      response1Outcome: "Börja hjälpa klienter",
      response1Full:
        "Förstått! Jag är redo att hjälpa klienter och ge dem den bästa finansiella rådgivningen jag kan. Tack för överblicken!",
      response2Action: "Visa entusiasm att börja",
      response2Outcome: "Kom igång omedelbart",
      response2Full:
        "Jag förstår! Låt oss komma igång. Jag ser fram emot att träffa klienter och hjälpa dem med deras ekonomiska utmaningar.",
      response3Action: "Uttryck tacksamhet och engagemang",
      response3Outcome: "Förbind dig att göra bra ifrån dig",
      response3Full:
        "Tack! Jag ska göra mitt bästa för att ge kvalitetsrådgivning och fortsätta lära mig. Ser fram emot att arbeta med dig!",
    },

    stats: {
      yourStats: "Dina Statistik",
      avgTrust: "Genomsn. Förtroende",
      sessions: "Sessioner",
      clients: "Hjälpta Klienter",
      streak: "Nuvarande Svit",
      coins: "Rådgivar Mynt",
      savingsGenerated: "Genererade Besparingar",
      debtCleared: "Betalda Skulder",
      achievements: "Prestationer",
      level: "Nivå",
      xp: "XP",
      restartGame: "Starta Om Spelet",
    },

    consultationEnd: {
      title: "Konsultation Klar!",
      coinsEarned: "Intjänade Mynt",
      quality: "Kvalitet:",
      startingNext: "Startar nästa konsultation om ett ögonblick...",
      firstSteps: "Första Stegen",
      firstStepsDesc: "Hjälp din första klient",
      achievementsUnlocked: "Upplåsta Prestationer",
    },

    qualityLevels: {
      excellent: "Utmärkt råd",
      good: "Bra råd",
      adequate: "Tillräckligt råd",
      belowAverage: "Under genomsnittligt råd",
      poor: "Dåligt råd",
    },

    achievements: {
      first_client: {
        name: "Första Stegen",
        description: "Hjälp din första klient",
      },
      ten_clients: {
        name: "Växande Praktik",
        description: "Hjälp 10 klienter",
      },
      fifty_clients: {
        name: "Betrodd Rådgivare",
        description: "Hjälp 50 klienter",
      },
      skill_level_3: {
        name: "Kompetent Rådgivare",
        description: "Nå färdighetsnivå 3",
      },
      skill_level_5: {
        name: "Expertrådgivare",
        description: "Nå färdighetsnivå 5",
      },
      skill_level_8: {
        name: "Mästarrådgivare",
        description: "Nå färdighetsnivå 8",
      },
      perfect_score: {
        name: "Felfritt Råd",
        description: "Få perfekt 10/10 kvalitetspoäng",
      },
      savings_10k: {
        name: "Sparmästare",
        description: "Hjälp klienter spara €10,000",
      },
      debt_crusher: {
        name: "Skuldkrossare",
        description: "Hjälp klienter betala €5,000 i skulder",
      },
      millionaire_maker: {
        name: "Miljonärskapare",
        description: "Hjälp klienter spara totalt €100,000",
      },
      trusted_friend: {
        name: "Betrodd Vän",
        description: "Få en karaktärsrekommendation",
      },
      reputation_75: { name: "Väl Respekterad", description: "Nå 75 rykte" },
      reputation_100: {
        name: "Legendarisk Rådgivare",
        description: "Nå maximalt rykte (100)",
      },
      budget_master: {
        name: "Budgetmästare",
        description: "Nå nivå 7 i budgetering",
      },
      debt_specialist: {
        name: "Skuldspecialist",
        description: "Nå nivå 7 i skuldhantering",
      },
      investment_guru: {
        name: "Investeringsguru",
        description: "Nå nivå 7 i investeringar",
      },
      quick_learner: {
        name: "Snabb Inlärare",
        description: "Klara chefens quiz med 100% poäng",
      },
      coffee_connoisseur: {
        name: "Kaffekännare",
        description: "Hjälp en klient minska kaffeutgifter med €50+/månad",
      },
      temu_terminator: {
        name: "Temu Terminator",
        description: "Stoppa en klients impulsiva näthandel",
      },
      savings_champion: {
        name: "Sparmästare",
        description: "Hjälp en klient spara 20%+ av sin inkomst",
      },
      big_win: {
        name: "Stor Vinst",
        description: "Hjälp en klient spara €200+ i en konsultation",
      },
    },
  },
};

/**
 * Get user's preferred language from localStorage
 */
export function getUserLanguage(): Language {
  try {
    const userProfileStr = localStorage.getItem("userProfile");
    if (userProfileStr) {
      const userProfile = JSON.parse(userProfileStr);
      if (
        userProfile.language &&
        ["en", "fi", "sv"].includes(userProfile.language)
      ) {
        return userProfile.language as Language;
      }
    }
  } catch (e) {
    console.error("Failed to get user language:", e);
  }
  return "en"; // Default to English
}

/**
 * Get translations for current user language
 */
export function useTranslation(): Translations {
  const language = getUserLanguage();
  return translations[language];
}

/**
 * Get translation for specific language
 */
export function getTranslation(language: Language): Translations {
  return translations[language];
}
