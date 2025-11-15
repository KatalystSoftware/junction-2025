import { WhatsAppInterface } from "./components/WhatsAppInterface";
import { LandingPage } from "./components/LandingPage";
import { OnboardingFlow } from "./components/OnboardingFlow";
import { useState, useEffect } from "react";
import { hasCompletedOnboarding } from "./services/onboardingManager";

export default function App() {
  const [currentView, setCurrentView] = useState<
    "landing" | "onboarding" | "game"
  >("landing");

  // Check if user has completed onboarding on mount
  useEffect(() => {
    if (hasCompletedOnboarding()) {
      console.log("👋 Returning user - skipping to game");
      setCurrentView("game");
    }
  }, []);

  const handleStartGame = () => {
    // Check if onboarding was completed - skip if yes
    if (hasCompletedOnboarding()) {
      setCurrentView("game");
    } else {
      setCurrentView("onboarding");
    }
  };

  const handleOnboardingComplete = (data?: {
    name?: string;
    gender?: string;
  }) => {
    // Save onboarding completion to localStorage
    import("./services/onboardingManager").then(
      ({ completeOnboarding, setPlayerName, setPlayerGender }) => {
        completeOnboarding();
        if (data?.name) setPlayerName(data.name);
        if (data?.gender) setPlayerGender(data.gender);
      },
    );

    setCurrentView("game");
  };

  const handleLogoClick = () => {
    setCurrentView("landing");
  };

  return (
    <div className="h-screen bg-background">
      {currentView === "landing" && (
        <LandingPage onStartGame={handleStartGame} />
      )}
      {currentView === "onboarding" && (
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      )}
      {currentView === "game" && (
        <WhatsAppInterface onLogoClick={handleLogoClick} />
      )}
    </div>
  );
}
