import { Dialog, DialogContent } from "./ui/dialog";
import { Trophy, Star, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

interface LevelUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: number;
}

export function LevelUpModal({ open, onOpenChange, level }: LevelUpModalProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (open) {
      setAnimate(true);

      // Trigger confetti!
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 10000,
      };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      // Multiple confetti bursts
      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        // Left side
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });

        // Right side
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      // Auto-close after 3 seconds
      const timer = setTimeout(() => {
        onOpenChange(false);
      }, 3000);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    } else {
      setAnimate(false);
    }
  }, [open, onOpenChange]);

  // Determine the promotion title based on level
  const getPromotionTitle = (lvl: number) => {
    if (lvl <= 2) return "PROMOTED";
    if (lvl <= 4) return "ADVANCED";
    if (lvl <= 6) return "ELEVATED";
    if (lvl <= 8) return "DISTINGUISHED";
    if (lvl <= 10) return "GRADUATED";
    return "MASTER ADVISOR";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-2 border-primary">
        <div className="relative bg-gradient-to-br from-primary/20 via-background to-primary/10 p-8">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className={`absolute top-0 left-0 w-full h-full ${animate ? "animate-pulse" : ""}`}
            >
              {[...Array(20)].map((_, i) => (
                <Star
                  key={i}
                  className={`absolute text-primary/30 ${animate ? "animate-ping" : ""}`}
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    width: `${Math.random() * 20 + 10}px`,
                    height: `${Math.random() * 20 + 10}px`,
                    animationDelay: `${Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center gap-6 text-center">
            {/* Trophy icon with glow */}
            <div className={`relative ${animate ? "animate-bounce" : ""}`}>
              <div className="absolute inset-0 bg-primary/50 blur-xl rounded-full scale-150"></div>
              <Trophy
                className="relative w-24 h-24 text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.8)]"
                strokeWidth={1.5}
              />
              <Sparkles
                className={`absolute -top-2 -right-2 w-8 h-8 text-yellow-400 ${animate ? "animate-spin" : ""}`}
              />
            </div>

            {/* Level up text */}
            <div className="space-y-2">
              <h2
                className={`text-5xl font-bold text-primary ${animate ? "animate-pulse" : ""}`}
              >
                {getPromotionTitle(level)}!
              </h2>
              <p className="text-xl text-muted-foreground">You've reached</p>
              <p className="text-4xl font-bold text-foreground">
                Level {level}
              </p>
            </div>

            {/* Confetti-like elements */}
            <div className="flex gap-2 text-primary">
              <Star
                className={`w-6 h-6 ${animate ? "animate-spin" : ""}`}
                style={{ animationDuration: "3s" }}
              />
              <Star
                className={`w-6 h-6 ${animate ? "animate-spin" : ""}`}
                style={{ animationDuration: "2.5s", animationDelay: "0.2s" }}
              />
              <Star
                className={`w-6 h-6 ${animate ? "animate-spin" : ""}`}
                style={{ animationDuration: "3.5s", animationDelay: "0.4s" }}
              />
            </div>

            {/* Subtitle */}
            <p className="text-sm text-muted-foreground max-w-xs">
              Your expertise as a financial advisor continues to grow. Keep up
              the excellent work!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
