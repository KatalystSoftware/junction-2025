import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  ChevronRight,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  User,
} from "lucide-react";
import bossImage from "figma:asset/98a682f9e6eea0635304bf1ceada7ac6a7758d54.png";
import { PLAYER_AVATAR_OPTIONS } from "../utils/avatarUtils";
import { getTranslation, type Language } from "../utils/translations";

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [xp, setXp] = useState(0);

  // User profile data
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [userLanguage, setUserLanguage] = useState("en"); // Default to English

  const totalScreens = 3;

  // Language options
  const languageOptions = [
    { id: "en", label: "English", flag: "🇬🇧" },
    { id: "fi", label: "Finnish", flag: "🇫🇮" },
    { id: "sv", label: "Swedish", flag: "🇸🇪" },
  ];
  const progressPercentage = ((currentScreen + 1) / totalScreens) * 100;

  // Add keyboard navigation (but not for the profile screen)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (currentScreen !== 0 && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentScreen]);

  // Increment XP as user progresses
  useEffect(() => {
    setXp((currentScreen + 1) * 50);
  }, [currentScreen]);

  const handleNext = () => {
    // Validate profile screen
    if (currentScreen === 0) {
      if (!userName.trim() || !userAvatar) {
        return; // Don't proceed if required fields are empty
      }
      // Save profile to localStorage
      localStorage.setItem(
        "userProfile",
        JSON.stringify({
          name: userName,
          avatar: userAvatar,
          language: userLanguage,
        }),
      );
    }

    if (currentScreen < totalScreens - 1) {
      setCurrentScreen(currentScreen + 1);
    } else {
      onComplete();
    }
  };

  // Get translations for selected language
  const t = getTranslation((userLanguage || "en") as Language);

  const screens = [
    {
      id: "profile",
      icon: User,
      title: t.onboarding.chooseIdentity,
      subtitle: t.onboarding.howDoYouWant,
      description: t.onboarding.pickAvatar,
      illustration: "👤",
      color: "var(--primary)",
      gradient:
        "linear-gradient(135deg, rgba(127, 86, 217, 0.1) 0%, rgba(105, 65, 198, 0.05) 100%)",
      isForm: true,
    },
    {
      id: "welcome",
      icon: MessageSquare,
      title: t.onboarding.welcomeTitle,
      subtitle: t.onboarding.welcomeSubtitle,
      description: t.onboarding.welcomeDescription,
      illustration: "💼",
      color: "var(--primary)",
      gradient:
        "linear-gradient(135deg, rgba(127, 86, 217, 0.1) 0%, rgba(105, 65, 198, 0.05) 100%)",
      features: [
        t.onboarding.features.chatNaturally,
        t.onboarding.features.buildTrust,
        t.onboarding.features.helpProgress,
      ],
    },
    {
      id: "ready",
      icon: Sparkles,
      title: t.onboarding.readyTitle,
      subtitle: t.onboarding.readySubtitle,
      description: t.onboarding.readyDescription,
      illustration: "🚀",
      color: "var(--primary)",
      gradient:
        "linear-gradient(135deg, rgba(127, 86, 217, 0.15) 0%, rgba(105, 65, 198, 0.08) 100%)",
      cta: t.onboarding.startJourney,
    },
  ];

  const currentScreenData = screens[currentScreen];

  return (
    <div
      className="h-screen relative overflow-hidden flex flex-col"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: currentScreenData.gradient,
          opacity: 0.6,
        }}
        key={currentScreen}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 0.8 }}
      />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-3xl"
          >
            {/* Screen content card */}
            <div
              className="rounded-lg p-6"
              style={{
                backgroundColor: "var(--card)",
                border: `1px solid var(--border)`,
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
              }}
            >
              {/* Icon & Illustration */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="flex flex-col items-center mb-4"
              >
                <motion.div
                  animate={{
                    y: [0, -8, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="mb-2"
                  style={{
                    fontSize: "3rem",
                  }}
                >
                  {currentScreenData.illustration}
                </motion.div>
                <Avatar
                  className="w-12 h-12 border-2"
                  style={{ borderColor: currentScreenData.color }}
                >
                  <AvatarImage src={bossImage} alt="Michael Scott" />
                  <AvatarFallback
                    style={{
                      backgroundColor: currentScreenData.color,
                      color: "var(--primary-foreground)",
                      fontFamily: "Inter, sans-serif",
                      fontWeight: "var(--font-weight-semibold)",
                    }}
                  >
                    MS
                  </AvatarFallback>
                </Avatar>
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-2"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--foreground)",
                  }}
                >
                  Michael Scott
                </motion.p>
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mb-2"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-4xl)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--foreground)",
                  lineHeight: "1.2",
                }}
              >
                {currentScreenData.title}
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-center mb-3"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-lg)",
                  fontWeight: "var(--font-weight-medium)",
                  color: currentScreenData.color,
                }}
              >
                {currentScreenData.subtitle}
              </motion.p>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center mb-5"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-base)",
                  color: "var(--muted-foreground)",
                  lineHeight: "1.6",
                  maxWidth: "600px",
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                {currentScreenData.description}
              </motion.p>

              {/* Form for profile screen */}
              {currentScreenData.isForm && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-5 mb-6"
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-sm font-medium leading-none"
                      style={{
                        color: "var(--foreground)",
                      }}
                    >
                      {t.onboarding.yourName}
                    </Label>
                    <Input
                      id="name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder={t.onboarding.enterName}
                      style={{
                        backgroundColor: "var(--input-background)",
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                      }}
                      className="w-full transition-all duration-200"
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "var(--ring)";
                        e.currentTarget.style.boxShadow =
                          "0 0 0 3px rgba(158, 119, 237, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label
                      className="text-sm font-medium leading-none"
                      style={{
                        color: "var(--foreground)",
                      }}
                    >
                      {t.onboarding.yourAvatar}
                    </Label>
                    <div className="flex flex-wrap gap-4">
                      {PLAYER_AVATAR_OPTIONS.map((option) => (
                        <motion.button
                          key={option.id}
                          type="button"
                          onClick={() => setUserAvatar(option.id)}
                          className="transition-all duration-200 cursor-pointer relative"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Avatar
                            className="w-24 h-24"
                            style={{
                              border: `3px solid ${userAvatar === option.id ? "var(--primary)" : "transparent"}`,
                              boxShadow:
                                userAvatar === option.id
                                  ? "0 0 0 4px rgba(127, 86, 217, 0.2)"
                                  : "none",
                            }}
                          >
                            <AvatarImage src={option.url} alt={option.label} />
                            <AvatarFallback
                              style={{
                                backgroundColor: "var(--muted)",
                              }}
                            >
                              {option.label[0]}
                            </AvatarFallback>
                          </Avatar>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label
                      className="text-sm font-medium leading-none"
                      style={{
                        color: "var(--foreground)",
                      }}
                    >
                      {t.onboarding.preferredLanguage}
                    </Label>
                    <div className="flex gap-3">
                      {languageOptions.map((lang) => (
                        <motion.button
                          key={lang.id}
                          type="button"
                          onClick={() => setUserLanguage(lang.id)}
                          className="flex-1 flex flex-col items-center gap-2 p-4 rounded-lg transition-all duration-200 cursor-pointer"
                          style={{
                            border: `2px solid ${userLanguage === lang.id ? "var(--primary)" : "var(--border)"}`,
                            backgroundColor:
                              userLanguage === lang.id
                                ? "rgba(127, 86, 217, 0.1)"
                                : "var(--muted)",
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span style={{ fontSize: "2rem" }}>{lang.flag}</span>
                          <span
                            style={{
                              fontFamily: "Inter, sans-serif",
                              fontSize: "var(--text-sm)",
                              fontWeight: "var(--font-weight-medium)",
                              color:
                                userLanguage === lang.id
                                  ? "var(--primary)"
                                  : "var(--foreground)",
                            }}
                          >
                            {lang.label}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Features list (for "how-it-works" screen) */}
              {currentScreenData.features && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-2 mb-5"
                >
                  {currentScreenData.features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      className="flex items-center gap-3 p-2 rounded-lg"
                      style={{
                        backgroundColor: "var(--muted)",
                        border: `1px solid var(--border)`,
                      }}
                    >
                      <CheckCircle2
                        className="w-5 h-5 flex-shrink-0"
                        style={{ color: "var(--primary)" }}
                      />
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-base)",
                          fontWeight: "var(--font-weight-medium)",
                          color: "var(--foreground)",
                        }}
                      >
                        {feature}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              )}


              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="flex justify-center"
              >
                <Button
                  onClick={handleNext}
                  disabled={
                    currentScreen === 0 && (!userName.trim() || !userAvatar)
                  }
                  size="lg"
                  className="group relative overflow-hidden"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-base)",
                    fontWeight: "var(--font-weight-semibold)",
                    padding: "1rem 2.5rem",
                    borderRadius: "var(--radius-button)",
                    boxShadow: "0 4px 12px rgba(127, 86, 217, 0.25)",
                    border: "none",
                    opacity:
                      currentScreen === 0 && (!userName.trim() || !userAvatar)
                        ? 0.5
                        : 1,
                    cursor:
                      currentScreen === 0 && (!userName.trim() || !userAvatar)
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  <motion.span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)",
                    }}
                  />
                  <span className="relative flex items-center gap-2">
                    {currentScreen === totalScreens - 1
                      ? currentScreenData.cta
                      : t.continue}
                    {currentScreen === totalScreens - 1 ? (
                      <Sparkles className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </span>
                </Button>
              </motion.div>

              {/* Hint text */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-center mt-4"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-sm)",
                  color: "var(--muted-foreground)",
                }}
              >
                {t.onboarding.pressKeys}{" "}
                <kbd
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: "4px",
                    backgroundColor: "var(--muted)",
                    border: `1px solid var(--border)`,
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  Enter
                </kbd>{" "}
                {t.onboarding.or}{" "}
                <kbd
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: "4px",
                    backgroundColor: "var(--muted)",
                    border: `1px solid var(--border)`,
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  Space
                </kbd>{" "}
                to continue
              </motion.p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer - Progress dots */}
      <div className="relative z-10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-center gap-2">
          {screens.map((_, index) => (
            <motion.div
              key={index}
              className="rounded-full transition-all duration-300"
              style={{
                width: index === currentScreen ? "32px" : "8px",
                height: "8px",
                backgroundColor:
                  index <= currentScreen ? "var(--primary)" : "var(--border)",
              }}
              initial={false}
              animate={{
                width: index === currentScreen ? "32px" : "8px",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
