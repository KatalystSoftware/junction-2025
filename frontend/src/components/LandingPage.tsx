import { Button } from "./ui/button";
import {
  MessageSquare,
  TrendingUp,
  Heart,
  DollarSign,
  Users,
  Zap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import logoImage from "figma:asset/28e39d27183eb9dbb848b6be8a7c7b00e841cd40.png";
import coinImage from "figma:asset/a3149a72947f8d67a09b8045115cc1c87c371ed8.png";
import { motion } from "motion/react";
import { useEffect } from "react";

interface LandingPageProps {
  onStartGame: () => void;
}

export function LandingPage({ onStartGame }: LandingPageProps) {
  // Add keyboard event listener for Enter key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        onStartGame();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [onStartGame]);

  const features = [
    {
      icon: MessageSquare,
      title: "WhatsApp-Style Gameplay",
      description:
        "Chat with realistic NPCs through an authentic messaging interface",
      gradient:
        "linear-gradient(135deg, rgba(127, 86, 217, 0.1) 0%, rgba(105, 65, 198, 0.05) 100%)",
    },
    {
      icon: Heart,
      title: "Trust Score System",
      description:
        "Build relationships as NPCs react to your financial advice (0-100 scale)",
      gradient:
        "linear-gradient(135deg, rgba(217, 45, 32, 0.08) 0%, rgba(217, 45, 32, 0.02) 100%)",
    },
    {
      icon: DollarSign,
      title: "Earn Real Savings",
      description: "Track how much money you've helped your clients save",
      gradient:
        "linear-gradient(135deg, rgba(105, 65, 198, 0.1) 0%, rgba(83, 56, 158, 0.05) 100%)",
    },
    {
      icon: TrendingUp,
      title: "Level Up System",
      description:
        "Gain XP and unlock new challenges as you improve your advisory skills",
      gradient:
        "linear-gradient(135deg, rgba(127, 86, 217, 0.12) 0%, rgba(182, 146, 246, 0.06) 100%)",
    },
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12,
      },
    },
  };

  const featureCardVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: (custom: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: custom * 0.1,
        type: "spring",
        stiffness: 80,
        damping: 15,
      },
    }),
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ backgroundColor: "#FFB246" }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating coins in various sizes */}
        {[
          { size: 60, left: "8%", top: "12%", duration: 6, delay: 0 },
          { size: 80, left: "25%", top: "25%", duration: 8, delay: 1 },
          { size: 50, left: "15%", top: "65%", duration: 7, delay: 0.5 },
          { size: 90, left: "70%", top: "15%", duration: 9, delay: 1.5 },
          { size: 70, left: "85%", top: "35%", duration: 7.5, delay: 0.8 },
          { size: 55, left: "78%", top: "70%", duration: 6.5, delay: 1.2 },
          { size: 75, right: "12%", top: "50%", duration: 8.5, delay: 0.3 },
          { size: 65, right: "25%", bottom: "20%", duration: 7, delay: 1.8 },
          { size: 85, left: "40%", top: "8%", duration: 9, delay: 0.6 },
          { size: 60, left: "50%", bottom: "15%", duration: 6.8, delay: 1.4 },
        ].map((coin, i) => (
          <motion.img
            key={`coin-${i}`}
            src={coinImage}
            alt=""
            animate={{
              y: [0, -40, 0],
              x: [0, Math.sin(i) * 15, 0],
              rotateY: [0, 360],
            }}
            transition={{
              duration: coin.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: coin.delay,
            }}
            className="absolute"
            style={{
              width: `${coin.size}px`,
              height: `${coin.size}px`,
              left: coin.left,
              right: coin.right,
              top: coin.top,
              bottom: coin.bottom,
              opacity: 0.2,
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <div className="relative">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="py-8 flex justify-center"
          >
            <motion.img
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              src={logoImage}
              alt="BROKE No more! Logo"
              style={{
                height: "280px",
                width: "auto",
                objectFit: "contain",
              }}
            />
          </motion.header>

          {/* Hero Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center py-20 sm:py-32"
          >
            <div className="max-w-5xl mx-auto" style={{ marginTop: "-6rem" }}>
              <motion.div
                variants={itemVariants}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-4 sm:mb-8 backdrop-blur-sm"
                style={{
                  backgroundColor: "#FFDAA6",
                  border: "1px solid var(--border)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.04)",
                }}
              >
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 10, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                >
                  <Zap
                    className="w-4 h-4"
                    style={{
                      color: "var(--primary)",
                      fill: "var(--primary)",
                    }}
                  />
                </motion.div>
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--foreground)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  The #1 financial advice game
                </span>
              </motion.div>

              <motion.h1
                variants={itemVariants}
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "clamp(1.75rem, 7vw, 4.5rem)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--foreground)",
                  lineHeight: "1.1",
                  marginBottom: "1rem",
                  letterSpacing: "-0.03em",
                }}
              >
                Help your clients go from broke to thriving
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="px-4"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "clamp(0.95rem, 2vw, var(--text-xl))",
                  color: "var(--foreground)",
                  lineHeight: "1.7",
                  marginBottom: "1.5rem",
                  maxWidth: "46rem",
                  marginLeft: "auto",
                  marginRight: "auto",
                  letterSpacing: "-0.01em",
                }}
              >
                Master the art of financial advice by helping NPCs make smarter
                money decisions. Build trust, level up, and track real savings
                in this engaging chat-based game.
              </motion.p>

              <motion.div
                variants={itemVariants}
                className="flex flex-col items-center justify-center gap-4 sm:gap-6"
                style={{ marginTop: "2rem" }}
              >
                <motion.div
                  className="flex items-center gap-4 sm:gap-8"
                  variants={itemVariants}
                >
                  <motion.div
                    className="flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div
                      className="p-2 rounded-lg"
                      style={{
                        backgroundColor: "#FFDAA6",
                      }}
                    >
                      <Users
                        className="w-4 h-4"
                        style={{ color: "var(--primary)" }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--font-weight-medium)",
                        color: "var(--foreground)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      10+ NPCs
                    </span>
                  </motion.div>
                  <motion.div
                    className="flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div
                      className="p-2 rounded-lg"
                      style={{
                        backgroundColor: "#FFDAA6",
                      }}
                    >
                      <MessageSquare
                        className="w-4 h-4"
                        style={{ color: "var(--primary)" }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--font-weight-medium)",
                        color: "var(--foreground)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      Realistic Chats
                    </span>
                  </motion.div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={onStartGame}
                    size="lg"
                    className="group relative overflow-hidden"
                    style={{
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "clamp(1.125rem, 2vw, var(--text-xl))",
                      fontWeight: "var(--font-weight-semibold)",
                      padding:
                        "clamp(1.5rem, 3vw, 2rem) clamp(3rem, 6vw, 5rem)",
                      borderRadius: "var(--radius-button)",
                      minWidth: "clamp(280px, 50vw, 360px)",
                      boxShadow: "0 4px 14px rgba(127, 86, 217, 0.3)",
                      border: "none",
                      letterSpacing: "-0.01em",
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
                      Start Playing
                      <motion.div
                        animate={{ x: [0, 3, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <ArrowRight className="w-6 h-6" />
                      </motion.div>
                    </span>
                  </Button>
                </motion.div>

                {/* Research Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  className="mt-6 flex items-center justify-center gap-2 px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <span style={{ fontSize: "1rem" }}>📚</span>
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-sm)",
                      color: "rgba(255, 255, 255, 0.9)",
                      fontWeight: "var(--font-weight-medium)",
                    }}
                  >
                    Research-backed by
                  </span>
                  <a
                    href="https://www.suomenpankki.fi/en/financial-literacy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-sm)",
                      color: "white",
                      fontWeight: "var(--font-weight-semibold)",
                      textDecoration: "underline",
                      textUnderlineOffset: "2px",
                    }}
                  >
                    Bank of Finland
                  </a>
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-sm)",
                      color: "rgba(255, 255, 255, 0.9)",
                      fontWeight: "var(--font-weight-medium)",
                    }}
                  >
                    & OECD
                  </span>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section - REMOVED */}
    </div>
  );
}
