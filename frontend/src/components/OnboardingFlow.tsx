import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  ArrowRight,
  ChevronRight,
  MessageSquare,
  Target,
  TrendingUp,
  Heart,
  Sparkles,
  Award,
  Users,
  Lightbulb,
  CheckCircle2,
  User,
} from "lucide-react";
import { Progress } from "./ui/progress";
import bossImage from "figma:asset/98a682f9e6eea0635304bf1ceada7ac6a7758d54.png";

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [xp, setXp] = useState(0);

  // User profile data
  const [userName, setUserName] = useState("");
  const [userGender, setUserGender] = useState<
    "male" | "female" | "other" | ""
  >("");

  const totalScreens = 7;
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
      if (!userName.trim() || !userGender) {
        return; // Don't proceed if fields are empty
      }
      // Save profile to localStorage
      localStorage.setItem(
        "userProfile",
        JSON.stringify({
          name: userName,
          gender: userGender,
        }),
      );
    }

    if (currentScreen < totalScreens - 1) {
      setCurrentScreen(currentScreen + 1);
    } else {
      onComplete();
    }
  };

  const screens = [
    {
      id: "profile",
      icon: User,
      title: "Let's Create Your Profile",
      subtitle: "Tell Us About Yourself",
      description:
        "Before you start your journey as a financial advisor, we'd love to know a bit about you.",
      illustration: "👤",
      color: "var(--primary)",
      gradient:
        "linear-gradient(135deg, rgba(127, 86, 217, 0.1) 0%, rgba(105, 65, 198, 0.05) 100%)",
      isForm: true,
    },
    {
      id: "welcome",
      icon: Sparkles,
      title: "Welcome to Gansos Finances!",
      subtitle: "Your Journey to Financial Advisory Excellence Begins",
      description:
        "You're about to step into a role that matters. As a financial advisor, you'll guide real people through their money challenges, build trust, and help them transform their financial lives.",
      illustration: "💼",
      color: "var(--primary)",
      gradient:
        "linear-gradient(135deg, rgba(127, 86, 217, 0.1) 0%, rgba(105, 65, 198, 0.05) 100%)",
    },
    {
      id: "role",
      icon: Target,
      title: "Your Role as an Advisor",
      subtitle: "Empathy Meets Expertise",
      description:
        "You'll chat with clients via WhatsApp-style messaging. Each person has unique financial situations, dreams, and struggles. Your job? Listen carefully, ask the right questions, and provide advice that's practical, encouraging, and tailored to them.",
      illustration: "🎯",
      color: "var(--accent)",
      gradient:
        "linear-gradient(135deg, rgba(105, 65, 198, 0.1) 0%, rgba(83, 56, 158, 0.05) 100%)",
    },
    {
      id: "how-it-works",
      icon: MessageSquare,
      title: "How It Works",
      subtitle: "Simple, Yet Impactful",
      description:
        "Read your client's messages, understand their situation, and respond with thoughtful financial advice. Each interaction affects their trust in you. Good advice builds relationships. Great advice transforms lives.",
      illustration: "💬",
      color: "var(--chart-1)",
      gradient:
        "linear-gradient(135deg, rgba(127, 86, 217, 0.12) 0%, rgba(182, 146, 246, 0.06) 100%)",
      features: [
        "Chat naturally with clients",
        "Build trust through quality advice",
        "Track client progress and savings",
      ],
    },
    {
      id: "expectations",
      icon: Award,
      title: "What I Expect From You",
      subtitle: "Excellence in Every Interaction",
      description:
        "Think critically. Be empathetic. Don't just give generic advice—take the time to understand each client's situation. The trust score reflects how well you're doing. Aim for excellence, not perfection.",
      illustration: "⭐",
      color: "var(--chart-3)",
      gradient:
        "linear-gradient(135deg, rgba(217, 45, 32, 0.08) 0%, rgba(217, 45, 32, 0.02) 100%)",
      expectations: [
        { icon: Heart, text: "Be empathetic and supportive" },
        { icon: Lightbulb, text: "Provide thoughtful, tailored advice" },
        { icon: TrendingUp, text: "Help clients achieve real progress" },
      ],
    },
    {
      id: "encouragement",
      icon: Sparkles,
      title: "You've Got This!",
      subtitle: "Every Expert Was Once a Beginner",
      description:
        "This isn't just a game—it's practice for real-world impact. Every client you help, every trust point you earn, every dollar you save them... it all adds up. You're building skills that matter.",
      illustration: "🚀",
      color: "var(--chart-2)",
      gradient:
        "linear-gradient(135deg, rgba(182, 146, 246, 0.15) 0%, rgba(214, 187, 251, 0.08) 100%)",
    },
    {
      id: "ready",
      icon: Users,
      title: "Ready to Meet Your First Client?",
      subtitle: "Your Advisory Career Starts Now",
      description:
        "Michael Scott is waiting in your inbox. He's your boss, and he has high hopes for you. This is your chance to prove yourself. Read his message, understand his needs, and give him advice he can trust.",
      illustration: "👔",
      color: "var(--primary)",
      gradient:
        "linear-gradient(135deg, rgba(127, 86, 217, 0.15) 0%, rgba(105, 65, 198, 0.08) 100%)",
      cta: "Start Your Journey",
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
                  className="space-y-3 mb-6"
                >
                  <div className="space-y-2 mb-6">
                    <Label
                      htmlFor="name"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      style={{
                        color: "var(--foreground)",
                      }}
                    >
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Enter your name or nickname"
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
                  <div className="space-y-2">
                    <Label
                      htmlFor="gender"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      style={{
                        color: "var(--foreground)",
                      }}
                    >
                      Gender
                    </Label>
                    <div className="flex items-center gap-6">
                      {[
                        { id: "male", value: "male", label: "Male" },
                        { id: "female", value: "female", label: "Female" },
                        { id: "other", value: "other", label: "Other" },
                      ].map((option) => (
                        <div
                          key={option.id}
                          className="flex items-center gap-2"
                        >
                          <button
                            type="button"
                            id={option.id}
                            role="radio"
                            aria-checked={userGender === option.value}
                            onClick={() =>
                              setUserGender(option.value as typeof userGender)
                            }
                            className="relative w-5 h-5 rounded-full transition-all duration-200 cursor-pointer"
                            style={{
                              border: `2px solid ${userGender === option.value ? "var(--primary)" : "var(--border)"}`,
                              backgroundColor:
                                userGender === option.value
                                  ? "var(--primary)"
                                  : "var(--input-background)",
                            }}
                          >
                            {userGender === option.value && (
                              <span
                                className="absolute inset-0 m-auto w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: "var(--primary-foreground)",
                                }}
                              />
                            )}
                          </button>
                          <Label
                            htmlFor={option.id}
                            className="cursor-pointer"
                            style={{
                              color: "var(--foreground)",
                              fontFamily: "Inter, sans-serif",
                              fontSize: "var(--text-sm)",
                              fontWeight: "var(--font-weight-medium)",
                            }}
                            onClick={() =>
                              setUserGender(option.value as typeof userGender)
                            }
                          >
                            {option.label}
                          </Label>
                        </div>
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

              {/* Expectations list (for "expectations" screen) */}
              {currentScreenData.expectations && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-2 mb-5"
                >
                  {currentScreenData.expectations.map((expectation, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-lg"
                      style={{
                        backgroundColor: "var(--muted)",
                        border: `1px solid var(--border)`,
                      }}
                    >
                      <div
                        className="flex items-center justify-center rounded-lg flex-shrink-0"
                        style={{
                          backgroundColor: currentScreenData.color,
                          width: "40px",
                          height: "40px",
                        }}
                      >
                        <span style={{ fontSize: "1.25rem" }}>😊</span>
                      </div>
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-base)",
                          fontWeight: "var(--font-weight-medium)",
                          color: "var(--foreground)",
                          lineHeight: "1.5",
                        }}
                      >
                        {expectation.text}
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
                      ? currentScreenData.cta || "Let's Go!"
                      : "Continue"}
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
                Press{" "}
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
                or{" "}
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
