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
    // Status and labels
    online: string;
    offline: string;
    selectConversation: string;
    balance: string;
    debt: string;
    monthly: string;
    trust: string;
    quickResponses: string;
    quickResponsesHint: string;
    // Call status
    callInProgress: string;
    videoCallInProgress: string;
    recordVoiceMessage: string;
    // Character profile
    characterProfile: string;
    yourBoss: string;
    professionalInformation: string;
    position: string;
    department: string;
    relationship: string;
    reportsTo: string;
    seniorManager: string;
    finance: string;
    directSupervisor: string;
    cSuite: string;
    currentExpectations: string;
    managementStyle: string;
    characterInfo: string;
    role: string;
    location: string;
    age: string;
    relationshipTrust: string;
    financialStatus: string;
    totalBalance: string;
    monthlyIncome: string;
    totalDebt: string;
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
    // Modal title and tabs
    playerStats: string;
    stats: string;
    performance: string;
    relationships: string;
    progress: string;

    // Profile section
    financialAdvisor: string;
    currentLevel: string;
    xpToLevel: string;

    // Stats section
    statistics: string;
    coinsEarned: string;
    messagesSent: string;
    consultations: string;
    winStreak: string;

    // Relationship section
    relationshipOverview: string;
    overallTrustScore: string;
    moneySaved: string;
    averageAcross: string;
    contact: string;
    contacts: string;
    fromFinancialAdvice: string;

    // Achievements section
    achievements: string;

    // Performance tab
    loadingAnalytics: string;
    completeMoreSessions: string;
    performanceOverview: string;
    successRate: string;
    avgQuality: string;
    trend: string;
    empathyRate: string;
    improving: string;
    declining: string;
    stable: string;
    topicExpertise: string;
    sessions: string;
    financialImpactByTopic: string;
    saved: string;
    debtCleared: string;

    // Legacy fields
    yourStats: string;
    avgTrust: string;
    clients: string;
    streak: string;
    coins: string;
    savingsGenerated: string;
    level: string;
    xp: string;
    restartGame: string;
    restartGameConfirm: string;
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

  // Leaderboard Modal
  leaderboard: {
    title: string;
    subtitle: string;
    global: string;
    rep: string;
    impact: string;
    expert: string;
    coins: string;
    awards: string;
    loading: string;
    you: string;
    sessions: string;
    reputation: string;
    skill: string;
    noRankings: string;
    lastUpdated: string;
  };

  // Achievement Unlock Modal
  achievementUnlock: {
    title: string;
    totalCoinsEarned: string;
    congratulations: string;
  };

  // Consultation Results Modal
  consultationResults: {
    title: string;
    yourAdvice: string;
    actionableItems: string;
    characterResponse: string;
    financialImpact: string;
    youHelpedSave: string;
    months: string;
    inTheirPocket: string;
    totalSaved: string;
    over: string;
    monthlySavingsAverage: string;
    perMonth: string;
    debtReduced: string;
    interestSaved: string;
    emergencyFundProgress: string;
    debtFreeProgress: string;
    savingsByCategory: string;
    adviceQuality: string;
    qualityScore: string;
    strengths: string;
    areasForImprovement: string;
    missedOpportunities: string;
    youEarned: string;
    relationshipUpdated: string;
    newClientUnlocked: string;
    // Trust tiers
    stranger: string;
    acquaintance: string;
    trustedAdvisor: string;
    closeFriend: string;
    bestFriend: string;
    // Quality labels
    excellent: string;
    good: string;
    average: string;
    needsImprovement: string;
    poor: string;
  };

  // Boss Review Modal
  bossReview: {
    title: string;
    overallScore: string;
    reputation: string;
    skillLevel: string;
    strengths: string;
    areasForImprovement: string;
    recommendedLearningMaterials: string;
    viewMaterial: string;
    quizAvailable: string;
    quizInstructions: string;
    fromYourBoss: string;
    // Score labels
    excellentPerformance: string;
    goodWork: string;
    satisfactory: string;
    needsImprovement: string;
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
      online: "Online",
      offline: "Offline",
      selectConversation: "Select a conversation to start messaging",
      balance: "bal",
      debt: "debt",
      monthly: "/mo",
      trust: "Trust",
      quickResponses: "Quick Responses",
      quickResponsesHint:
        "Choose from predefined responses or type your own if you feel confident",
      callInProgress: "Call in progress...",
      videoCallInProgress: "Video call in progress...",
      recordVoiceMessage: "Record a voice message",
      characterProfile: "Character Profile",
      yourBoss: "Your Boss",
      professionalInformation: "Professional Information",
      position: "Position",
      department: "Department",
      relationship: "Relationship",
      reportsTo: "Reports To",
      seniorManager: "Senior Manager",
      finance: "Finance",
      directSupervisor: "Direct Supervisor",
      cSuite: "C-Suite",
      currentExpectations: "Current Expectations",
      managementStyle: "Management Style",
      characterInfo: "Character Info",
      role: "Role",
      location: "Location",
      age: "Age",
      relationshipTrust: "Relationship Trust",
      financialStatus: "Financial Status",
      totalBalance: "Total Balance",
      monthlyIncome: "Monthly Income",
      totalDebt: "Total Debt",
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
      playerStats: "Player Stats",
      stats: "Stats",
      performance: "Performance",
      relationships: "Relationships",
      progress: "Progress",
      financialAdvisor: "Financial Advisor",
      currentLevel: "Current Level",
      xpToLevel: "XP to Level",
      statistics: "Statistics",
      coinsEarned: "Coins Earned",
      messagesSent: "Messages Sent",
      consultations: "Consultations",
      winStreak: "Win Streak",
      relationshipOverview: "Relationship Overview",
      overallTrustScore: "Overall Trust Score",
      moneySaved: "Money Saved",
      averageAcross: "Average across",
      contact: "contact",
      contacts: "contacts",
      fromFinancialAdvice: "From financial advice",
      achievements: "Achievements",
      loadingAnalytics: "Loading analytics...",
      completeMoreSessions: "Complete more sessions to view analytics",
      performanceOverview: "Performance Overview",
      successRate: "Success Rate",
      avgQuality: "Avg Quality",
      trend: "Trend",
      empathyRate: "Empathy Rate",
      improving: "Improving",
      declining: "Declining",
      stable: "Stable",
      topicExpertise: "Topic Expertise",
      sessions: "sessions",
      financialImpactByTopic: "Financial Impact by Topic",
      saved: "saved",
      debtCleared: "debt cleared",
      yourStats: "Your Stats",
      avgTrust: "Avg Trust",
      clients: "Clients Helped",
      streak: "Current Streak",
      coins: "Advisor Coins",
      savingsGenerated: "Savings Generated",
      level: "Level",
      xp: "XP",
      restartGame: "Restart Game",
      restartGameConfirm:
        "Are you sure you want to restart the game? All progress will be lost.",
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

    leaderboard: {
      title: "Global Leaderboard",
      subtitle: "Compete with advisors worldwide",
      global: "Global",
      rep: "Rep",
      impact: "Impact",
      expert: "Expert",
      coins: "Coins",
      awards: "Awards",
      loading: "Loading...",
      you: "(You)",
      sessions: "sessions",
      reputation: "Rep:",
      skill: "Skill:",
      noRankings: "No rankings available yet",
      lastUpdated: "Last updated:",
    },

    achievementUnlock: {
      title: "Achievement(s) Unlocked!",
      totalCoinsEarned: "Total Coins Earned",
      congratulations:
        "Congratulations! Keep helping clients to unlock more achievements.",
    },

    consultationResults: {
      title: "Consultation Results:",
      yourAdvice: "Your Advice",
      actionableItems: "Actionable Items",
      characterResponse: "'s Response",
      financialImpact: "Financial Impact",
      youHelpedSave: "YOU HELPED SAVE:",
      months: "months",
      inTheirPocket: "That's {amount}/month in their pocket!",
      totalSaved: "Total Saved",
      over: "over",
      monthlySavingsAverage: "Monthly Savings Average",
      perMonth: "per month",
      debtReduced: "Debt Reduced",
      interestSaved: "Interest Saved",
      emergencyFundProgress: "Emergency Fund Progress",
      debtFreeProgress: "Debt-Free Progress",
      savingsByCategory: "Savings by Category:",
      adviceQuality: "Advice Quality",
      qualityScore: "Quality Score",
      strengths: "Strengths",
      areasForImprovement: "Areas for Improvement",
      missedOpportunities: "Missed Opportunities",
      youEarned: "YOU EARNED",
      relationshipUpdated: "Relationship Updated",
      newClientUnlocked: "New Client Unlocked!",
      stranger: "Stranger",
      acquaintance: "Acquaintance",
      trustedAdvisor: "Trusted Advisor",
      closeFriend: "Close Friend",
      bestFriend: "Best Friend",
      excellent: "💎 Excellent",
      good: "🌟 Good",
      average: "💡 Average",
      needsImprovement: "⚠️ Needs Improvement",
      poor: "Poor",
    },

    bossReview: {
      title: "👔 Boss Performance Review",
      overallScore: "Overall Score",
      reputation: "Reputation",
      skillLevel: "Skill Level",
      strengths: "Strengths",
      areasForImprovement: "Areas for Improvement",
      recommendedLearningMaterials: "Recommended Learning Materials",
      viewMaterial: "View Material →",
      quizAvailable: "Quiz Available",
      quizInstructions:
        "Test your knowledge with a quiz on this topic. Click to start!",
      fromYourBoss: "From Your Boss",
      excellentPerformance: "Excellent Performance",
      goodWork: "Good Work",
      satisfactory: "Satisfactory",
      needsImprovement: "Needs Improvement",
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
      online: "Paikalla",
      offline: "Poissa",
      selectConversation: "Valitse keskustelu aloittaaksesi viestittelyn",
      balance: "saldo",
      debt: "velka",
      monthly: "/kk",
      trust: "Luottamus",
      quickResponses: "Pikavalinnaiset vastaukset",
      quickResponsesHint:
        "Valitse ennalta määritetystä valikosta tai kirjoita oma vastaus jos olet varma",
      callInProgress: "Puhelu käynnissä...",
      videoCallInProgress: "Videopuhelu käynnissä...",
      recordVoiceMessage: "Tallenna äänisanoma",
      characterProfile: "Hahmon profiili",
      yourBoss: "Johtajasi",
      professionalInformation: "Ammatilliset tiedot",
      position: "Tehtävä",
      department: "Osasto",
      relationship: "Suhde",
      reportsTo: "Vastaa",
      seniorManager: "Johtava johtaja",
      finance: "Talous",
      directSupervisor: "Suora esimies",
      cSuite: "Johtoryhmä",
      currentExpectations: "Nykyiset odotukset",
      managementStyle: "Johtamistyyli",
      characterInfo: "Hahmon tiedot",
      role: "Rooli",
      location: "Sijainti",
      age: "Ikä",
      relationshipTrust: "Suhteen luottamus",
      financialStatus: "Taloudellinen asema",
      totalBalance: "Kokonaissaldo",
      monthlyIncome: "Kuukausitulo",
      totalDebt: "Kokonaisvelka",
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
      playerStats: "Pelaajan Tilastot",
      stats: "Tilastot",
      performance: "Suorituskyky",
      relationships: "Suhteet",
      progress: "Edistyminen",
      financialAdvisor: "Taloudellinen Neuvonantaja",
      currentLevel: "Nykyinen Taso",
      xpToLevel: "KP Tasolle",
      statistics: "Tilastot",
      coinsEarned: "Ansaitut Kolikot",
      messagesSent: "Lähetetyt Viestit",
      consultations: "Konsultaatiot",
      winStreak: "Voittoputki",
      relationshipOverview: "Suhteiden Yleiskatsaus",
      overallTrustScore: "Yleinen Luottamuspisteet",
      moneySaved: "Säästetyt Rahat",
      averageAcross: "Keskiarvo",
      contact: "kontakti",
      contacts: "kontaktit",
      fromFinancialAdvice: "Taloudellisista neuvoista",
      achievements: "Saavutukset",
      loadingAnalytics: "Ladataan analytiikkaa...",
      completeMoreSessions: "Suorita lisää istuntoja nähdäksesi analytiikan",
      performanceOverview: "Suorituskyvyn Yleiskatsaus",
      successRate: "Onnistumisprosentti",
      avgQuality: "Keskim. Laatu",
      trend: "Trendi",
      empathyRate: "Empatiaprosentti",
      improving: "Paranee",
      declining: "Laskee",
      stable: "Vakaa",
      topicExpertise: "Aiheen Asiantuntemus",
      sessions: "istuntoa",
      financialImpactByTopic: "Taloudellinen Vaikutus Aiheittain",
      saved: "säästetty",
      debtCleared: "velka maksettu",
      yourStats: "Tilastosi",
      avgTrust: "Keskim. Luottamus",
      clients: "Autettuja Asiakkaita",
      streak: "Nykyinen Putki",
      coins: "Neuvonantajan Kolikot",
      savingsGenerated: "Tuotetut Säästöt",
      level: "Taso",
      xp: "KP",
      restartGame: "Aloita Peli Uudelleen",
      restartGameConfirm:
        "Haluatko varmasti aloittaa pelin alusta? Kaikki edistyminen menetetään.",
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

    leaderboard: {
      title: "Maailmanlaajuinen Tulostaulukko",
      subtitle: "Kilpaile neuvonantajien kanssa ympäri maailmaa",
      global: "Maailmanlaajuinen",
      rep: "Maine",
      impact: "Vaikutus",
      expert: "Asiantuntija",
      coins: "Kolikot",
      awards: "Palkinnot",
      loading: "Ladataan...",
      you: "(Sinä)",
      sessions: "istuntoa",
      reputation: "Maine:",
      skill: "Taito:",
      noRankings: "Ei vielä sijoituksia",
      lastUpdated: "Viimeksi päivitetty:",
    },

    achievementUnlock: {
      title: "Saavutus(t) Avattu!",
      totalCoinsEarned: "Kolikot Yhteensä",
      congratulations:
        "Onnittelut! Jatka asiakkaiden auttamista avataksesi lisää saavutuksia.",
    },

    consultationResults: {
      title: "Konsultaation Tulokset:",
      yourAdvice: "Neuvosi",
      actionableItems: "Toimenpiteet",
      characterResponse: "n Vastaus",
      financialImpact: "Taloudellinen Vaikutus",
      youHelpedSave: "AUTOIT SÄÄSTÄMÄÄN:",
      months: "kuukautta",
      inTheirPocket: "Se on {amount}/kk heidän taskussaan!",
      totalSaved: "Säästetty Yhteensä",
      over: "yli",
      monthlySavingsAverage: "Kuukausittainen Keskiarvo",
      perMonth: "kuukaudessa",
      debtReduced: "Velka Vähennetty",
      interestSaved: "Korot Säästetty",
      emergencyFundProgress: "Hätärahaston Edistyminen",
      debtFreeProgress: "Velaton Edistyminen",
      savingsByCategory: "Säästöt Kategorioittain:",
      adviceQuality: "Neuvon Laatu",
      qualityScore: "Laatupisteet",
      strengths: "Vahvuudet",
      areasForImprovement: "Kehityskohteet",
      missedOpportunities: "Menetetyt Mahdollisuudet",
      youEarned: "ANSAITSIT",
      relationshipUpdated: "Suhde Päivitetty",
      newClientUnlocked: "Uusi Asiakas Avattu!",
      stranger: "Tuntematon",
      acquaintance: "Tuttava",
      trustedAdvisor: "Luotettu Neuvonantaja",
      closeFriend: "Läheinen Ystävä",
      bestFriend: "Paras Ystävä",
      excellent: "💎 Erinomainen",
      good: "🌟 Hyvä",
      average: "💡 Keskiverto",
      needsImprovement: "⚠️ Vaatii Parannusta",
      poor: "Heikko",
    },

    bossReview: {
      title: "👔 Pomonarvio",
      overallScore: "Kokonaispisteet",
      reputation: "Maine",
      skillLevel: "Taitotaso",
      strengths: "Vahvuudet",
      areasForImprovement: "Kehityskohteet",
      recommendedLearningMaterials: "Suositellut Oppimateriaalit",
      viewMaterial: "Katso Materiaali →",
      quizAvailable: "Visa Saatavilla",
      quizInstructions:
        "Testaa tietosi tästä aiheesta kysymyksillä. Klikkaa aloittaaksesi!",
      fromYourBoss: "Pomoltasi",
      excellentPerformance: "Erinomainen Suoritus",
      goodWork: "Hyvää Työtä",
      satisfactory: "Tyydyttävä",
      needsImprovement: "Vaatii Parannusta",
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
