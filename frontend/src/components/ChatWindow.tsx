import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { FollowingEyes } from "./ui/FollowingEyes";
import {
  Send,
  MoreVertical,
  Phone,
  Video,
  ArrowLeft,
  PhoneOff,
  VideoOff,
  Mic,
  X,
  Wallet,
  Target,
  Briefcase,
  Users,
} from "lucide-react";
import type { Contact, Message } from "./WhatsAppInterface";
import { TrustMeter } from "./TrustMeter";
import { VoiceMessage } from "./VoiceMessage";
import logoImage from "figma:asset/601ef144d16bf6e001c5324689cdddb5a7ea7f74.png";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "../utils/translations";

// Helper function to convert quality score (0-10) to quality level key
function getQualityLevel(
  score: number,
): "excellent" | "good" | "adequate" | "belowAverage" | "poor" {
  if (score >= 9) return "excellent";
  if (score >= 7) return "good";
  if (score >= 5) return "adequate";
  if (score >= 3) return "belowAverage";
  return "poor";
}

interface ChatWindowProps {
  contact: Contact | undefined;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onSendVoiceMessage?: (voiceMessage: {
    audioBlob: Blob;
    transcription: string;
    duration: number;
  }) => void;
  onBack: () => void;
  showChat: boolean;
  contactIsTyping: boolean;
  adviceChoices?: any[];
  isThreadResolved?: boolean;
  conversationEndData?: {
    financialResults?: any;
    miniFeedback?: string;
    achievementsUnlocked?: any[];
    milestonesAchieved?: any[];
  };
  // Controlled input support (for boss intervention revisions)
  inputValue?: string;
  onInputChange?: (value: string) => void;
}

// Helper functions to calculate financial data
function calculateTotalBalance(contact: Contact): number {
  if (!contact.financialProfile) return 0;

  const bankBalance = contact.financialProfile.bankAccounts.reduce(
    (sum, acc) => sum + acc.balance,
    0,
  );

  return bankBalance;
}

function formatCurrency(amount: number, currency: string = "EUR"): string {
  if (currency === "EUR") {
    return new Intl.NumberFormat("fi-FI", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  }
  return `$${amount.toLocaleString()}`;
}

function calculateTotalDebt(contact: Contact): number {
  if (!contact.financialProfile) return 0;

  const creditCardDebt = contact.financialProfile.creditCards.reduce(
    (sum, card) => sum + card.balance,
    0,
  );

  const otherDebt = contact.financialProfile.debts.reduce(
    (sum, debt) => sum + debt.remainingAmount,
    0,
  );

  return creditCardDebt + otherDebt;
}

function calculateTotalMonthlyExpenses(contact: Contact): number {
  if (!contact.financialProfile) return 0;

  const expenses = contact.financialProfile.monthlyExpenses;
  const fixedExpenses =
    (expenses.rent || 0) +
    (expenses.groceries || 0) +
    (expenses.transportation || 0) +
    (expenses.utilities || 0) +
    (expenses.other || 0);

  const subscriptions = contact.financialProfile.subscriptions.reduce(
    (sum, sub) => sum + sub.monthlyCost,
    0,
  );

  return fixedExpenses + subscriptions;
}

export function ChatWindow({
  contact,
  messages,
  onSendMessage,
  onSendVoiceMessage,
  onBack,
  showChat,
  contactIsTyping,
  adviceChoices = [],
  isThreadResolved = false,
  conversationEndData,
  inputValue: controlledInputValue,
  onInputChange,
}: ChatWindowProps) {
  const t = useTranslation();
  // Use controlled input from parent if provided, otherwise local state
  const [localInputValue, setLocalInputValue] = useState("");
  const inputValue =
    controlledInputValue !== undefined ? controlledInputValue : localInputValue;
  const setInputValue = onInputChange || setLocalInputValue;
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Permission request functions
  const requestCameraAndMicPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      // Stop all tracks immediately since we don't actually need them
      stream.getTracks().forEach((track) => track.stop());
      console.log("Camera and microphone permissions granted!");
      return true;
    } catch (error) {
      console.error("Camera/microphone permission denied:", error);
      return false;
    }
  };

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      // Stop all tracks immediately since we don't actually need them
      stream.getTracks().forEach((track) => track.stop());
      console.log("Microphone permission granted!");
      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      return false;
    }
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      console.log("Recording started");
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Failed to start recording. Please check microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      console.log("Recording stopped");
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      // Clear the audio
      audioChunksRef.current = [];
      setAudioBlob(null);
      setRecordingTime(0);

      console.log("Recording cancelled");
    }
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob) return;

    try {
      setIsTranscribing(true);

      // Import gameApi
      const { gameApi } = await import("../services/gameApi");

      // Get user's language preference
      let userLanguage = "en";
      try {
        const userProfileStr = localStorage.getItem("userProfile");
        if (userProfileStr) {
          const userProfile = JSON.parse(userProfileStr);
          if (userProfile.language) {
            userLanguage = userProfile.language;
          }
        }
      } catch (e) {
        console.error("Failed to get user language:", e);
      }

      // Transcribe audio
      const { transcription } = await gameApi.transcribeAudio(
        audioBlob,
        userLanguage,
      );

      console.log("Transcription:", transcription);

      // If onSendVoiceMessage is provided, send as voice message with audio
      if (onSendVoiceMessage) {
        onSendVoiceMessage({
          audioBlob,
          transcription,
          duration: recordingTime,
        });
      } else {
        // Fallback: just send transcription as text
        onSendMessage(transcription);
      }

      // Reset state
      setAudioBlob(null);
      setRecordingTime(0);
      setIsTranscribing(false);
    } catch (error) {
      console.error("Failed to transcribe audio:", error);
      alert("Failed to transcribe audio. Please try again or type your message.");
      setIsTranscribing(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []); // Empty deps - only run on mount/unmount

  // Get multiple choice options from backend (if provided)
  // Keep the full choice objects to display actionText + projectedOutcome
  const multipleChoiceOptions = adviceChoices.length > 0 ? adviceChoices : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, contactIsTyping]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showCallDialog) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [showCallDialog]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showVideoDialog) {
      interval = setInterval(() => {
        setVideoDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setVideoDuration(0);
    }
    return () => clearInterval(interval);
  }, [showVideoDialog]);

  const formatCallDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatVideoDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    onSendMessage(inputValue);
    setInputValue("");
  };

  const handleOptionClick = (choice: any) => {
    // Send the fullAdviceText if it exists, otherwise send actionText or the whole choice
    const messageToSend = choice.fullAdviceText || choice.actionText || choice;
    onSendMessage(messageToSend);
    setIsInputFocused(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Check if input is a number between 1-5 and auto-select the option
    const num = parseInt(value);
    if (value.length === 1 && num >= 1 && num <= 5) {
      const selectedChoice = multipleChoiceOptions[num - 1];
      if (selectedChoice) {
        // Send the fullAdviceText if it exists, otherwise send actionText or the whole choice
        const messageToSend =
          selectedChoice.fullAdviceText ||
          selectedChoice.actionText ||
          selectedChoice;
        onSendMessage(messageToSend);
        setInputValue("");
        setIsInputFocused(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  if (!contact) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ backgroundColor: "var(--muted)" }}
      >
        <p
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "var(--text-lg)",
            color: "var(--muted-foreground)",
          }}
        >
          Select a conversation to start messaging
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 flex-col relative h-screen ${showChat ? "flex" : "hidden md:flex"}`}
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Chat Header */}
      <div
        className="px-4 py-3 border-b border-border flex items-center justify-between"
        style={{ backgroundColor: "var(--card)" }}
      >
        <div className="flex items-center gap-3">
          {/* Back button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="md:hidden"
            style={{ borderRadius: "var(--radius-button)" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div
            className="cursor-pointer"
            onClick={() => setShowProfileModal(true)}
          >
            {contact.id === "boss-pinned" ? (
              <FollowingEyes
                eyeSize={7}
                pupilSize={3}
                eyeSpacing={0.6}
                eyeVerticalPosition={0.5}
              >
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={contact.avatarImage} alt={contact.name} />
                    <AvatarFallback
                      style={{
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                        fontFamily: "Inter, sans-serif",
                        fontWeight: "var(--font-weight-medium)",
                      }}
                    >
                      {contact.avatar}
                    </AvatarFallback>
                  </Avatar>
                  {contact.online && (
                    <div
                      className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                      style={{
                        backgroundColor: "var(--chart-1)",
                        borderColor: "var(--card)",
                      }}
                    />
                  )}
                </div>
              </FollowingEyes>
            ) : (
              <div className="relative">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={contact.avatarImage} alt={contact.name} />
                  <AvatarFallback
                    style={{
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                      fontFamily: "Inter, sans-serif",
                      fontWeight: "var(--font-weight-medium)",
                    }}
                  >
                    {contact.avatar}
                  </AvatarFallback>
                </Avatar>
                {contact.online && (
                  <div
                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                    style={{
                      backgroundColor: "var(--chart-1)",
                      borderColor: "var(--card)",
                    }}
                  />
                )}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-baseline gap-0.5 md:gap-2 md:flex-wrap">
              <h4
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-base)",
                  fontWeight: "var(--font-weight-medium)",
                  color: "var(--card-foreground)",
                }}
              >
                {contact.name}
              </h4>
              <span
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-sm)",
                  color: "var(--muted-foreground)",
                  fontWeight: "var(--font-weight-normal)",
                }}
              >
                {contact.online ? "Online" : "Offline"}
              </span>
              {/* Financial Status Indicators */}
              {contact.id !== "boss-pinned" && contact.financialProfile && (
                <>
                  <span
                    style={{
                      color: "var(--border)",
                      fontSize: "var(--text-sm)",
                    }}
                  >
                    •
                  </span>
                  <div className="hidden md:flex items-center gap-2">
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-xs)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--chart-1)",
                        }}
                      >
                        {formatCurrency(calculateTotalBalance(contact))}
                      </span>{" "}
                      bal
                    </span>
                    <span
                      style={{
                        color: "var(--border)",
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      •
                    </span>
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-xs)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "var(--font-weight-semibold)",
                          color:
                            calculateTotalDebt(contact) > 0
                              ? "var(--chart-2)"
                              : "var(--muted-foreground)",
                        }}
                      >
                        {formatCurrency(calculateTotalDebt(contact))}
                      </span>{" "}
                      debt
                    </span>
                    <span
                      style={{
                        color: "var(--border)",
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      •
                    </span>
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-xs)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--card-foreground)",
                        }}
                      >
                        {formatCurrency(
                          contact.financialProfile?.typicalMonthlyIncome || 0,
                        )}
                      </span>
                      /mo
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Trust Score Indicator */}
          <div className="hidden md:flex flex-col gap-1 min-w-[140px]">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "1rem" }}>
                {contact.trust <= 20
                  ? "😡"
                  : contact.trust <= 40
                    ? "😕"
                    : contact.trust <= 60
                      ? "🙂"
                      : contact.trust <= 80
                        ? "🤝"
                        : "❤️"}
              </span>
              <span
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--card-foreground)",
                }}
              >
                Trust {contact.trust}
              </span>
            </div>
            <div
              className="w-full h-1.5 relative overflow-hidden"
              style={{
                backgroundColor: "var(--muted)",
                borderRadius: "var(--radius-button)",
              }}
            >
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${contact.trust}%`,
                  backgroundColor:
                    contact.trust <= 20
                      ? "var(--destructive)"
                      : contact.trust <= 40
                        ? "var(--chart-2)"
                        : contact.trust <= 60
                          ? "var(--chart-3)"
                          : contact.trust <= 80
                            ? "var(--chart-4)"
                            : "var(--chart-1)",
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await requestCameraAndMicPermissions();
                setShowVideoDialog(true);
              }}
              style={{ borderRadius: "var(--radius-button)" }}
            >
              <Video className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await requestMicPermission();
                setShowCallDialog(true);
              }}
              style={{ borderRadius: "var(--radius-button)" }}
            >
              <Phone className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              style={{ borderRadius: "var(--radius-button)" }}
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea
        className="flex-1 px-4 relative overflow-y-auto"
        style={{ backgroundColor: "var(--muted)" }}
      >
        {/* Background Logo */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            opacity: 0.2,
            zIndex: 0,
          }}
        >
          <img
            src={logoImage}
            alt="BROKE No more!"
            className="w-[350px] h-[350px] object-contain"
          />
        </div>

        <div className="py-4 space-y-3 relative z-10">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.type === "voice" ? (
                <VoiceMessage message={message} />
              ) : (
                <div
                  className={`max-w-[70%] px-3 py-2 ${
                    message.role === "user"
                      ? "rounded-tl-lg rounded-tr-lg rounded-bl-lg"
                      : "rounded-tl-lg rounded-tr-lg rounded-br-lg"
                  }`}
                  style={{
                    backgroundColor:
                      message.role === "user"
                        ? "var(--primary)"
                        : "var(--card)",
                    color:
                      message.role === "user"
                        ? "var(--primary-foreground)"
                        : "var(--card-foreground)",
                    boxShadow: "var(--elevation-sm)",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-sm)",
                            fontWeight: "var(--font-weight-normal)",
                            lineHeight: 1.5,
                            marginBottom: "0.5rem",
                          }}
                        >
                          {children}
                        </p>
                      ),
                      strong: ({ children }) => (
                        <strong
                          style={{ fontWeight: "var(--font-weight-semibold)" }}
                        >
                          {children}
                        </strong>
                      ),
                      ol: ({ children }) => (
                        <ol
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-sm)",
                            paddingLeft: "1.5rem",
                            marginBottom: "0.5rem",
                            listStyleType: "decimal",
                          }}
                        >
                          {children}
                        </ol>
                      ),
                      ul: ({ children }) => (
                        <ul
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-sm)",
                            paddingLeft: "1.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li style={{ marginBottom: "0.25rem" }}>{children}</li>
                      ),
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color:
                              message.role === "user"
                                ? "var(--primary-foreground)"
                                : "var(--primary)",
                            textDecoration: "underline",
                          }}
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                  <span
                    className="block text-right mt-1"
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-xs)",
                      color:
                        message.role === "user"
                          ? "var(--primary-foreground)"
                          : "var(--muted-foreground)",
                      opacity: 0.8,
                    }}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          ))}

          {contactIsTyping && (
            <div className="flex justify-start">
              <div
                className="px-4 py-3 flex items-center gap-1.5 rounded-tl-lg rounded-tr-lg rounded-br-lg"
                style={{
                  backgroundColor: "var(--card)",
                  boxShadow: "var(--elevation-sm)",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{
                    backgroundColor: "var(--muted-foreground)",
                    animationDelay: "0ms",
                  }}
                />
                <span
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{
                    backgroundColor: "var(--muted-foreground)",
                    animationDelay: "150ms",
                  }}
                />
                <span
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{
                    backgroundColor: "var(--muted-foreground)",
                    animationDelay: "300ms",
                  }}
                />
              </div>
            </div>
          )}

          {/* Spacer to ensure last message is visible above input */}
          <div style={{ height: "180px" }} />
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Multiple Choice Options */}
      {isInputFocused &&
        inputValue.length === 0 &&
        multipleChoiceOptions.length > 0 && (
          <div
            className="absolute bottom-24 left-4 right-4 px-2 py-3 transition-all duration-300 animate-in slide-in-from-bottom-2"
            style={{
              backgroundColor: "var(--card)",
              boxShadow: "0px 4px 16px 0px rgba(10, 13, 18, 0.2)",
              borderRadius: "var(--radius-card)",
              border: "1px solid var(--border)",
              zIndex: 100,
            }}
          >
            <div className="mb-3">
              <div
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--muted-foreground)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Quick Responses
              </div>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--font-weight-normal)",
                  color: "var(--muted-foreground)",
                  marginTop: "4px",
                  lineHeight: 1.4,
                }}
              >
                Choose from predefined responses or type your own if you feel
                confident
              </p>
            </div>
            <div className="space-y-2">
              {multipleChoiceOptions.map((choice, index) => {
                // Support both old format (string) and new format (object with actionText)
                const isObject = typeof choice === "object" && choice !== null;
                const displayText = isObject
                  ? choice.actionText || choice.fullAdviceText || ""
                  : choice;
                const icon = isObject && choice.icon ? choice.icon : "";
                const projectedOutcome = isObject
                  ? choice.projectedOutcome
                  : "";

                return (
                  <button
                    key={index}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur
                    }}
                    onClick={() => handleOptionClick(choice)}
                    className="w-full text-left px-4 py-3 rounded-lg transition-all duration-200 border"
                    style={{
                      backgroundColor: "var(--muted)",
                      borderColor: "transparent",
                      borderRadius: "var(--radius-button)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--primary)";
                      e.currentTarget.style.borderColor = "var(--primary)";
                      e.currentTarget.style.transform = "translateX(4px)";
                      const textElements =
                        e.currentTarget.querySelectorAll("span");
                      textElements.forEach((el) => {
                        (el as HTMLElement).style.color =
                          "var(--primary-foreground)";
                      });
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--muted)";
                      e.currentTarget.style.borderColor = "transparent";
                      e.currentTarget.style.transform = "translateX(0)";
                      const numberElement =
                        e.currentTarget.querySelector(".option-number");
                      const textElements =
                        e.currentTarget.querySelectorAll(".option-text");
                      if (numberElement) {
                        (numberElement as HTMLElement).style.color =
                          "var(--primary)";
                      }
                      textElements.forEach((el) => {
                        (el as HTMLElement).style.color =
                          "var(--card-foreground)";
                      });
                    }}
                  >
                    <div className="flex gap-3 items-start">
                      <span
                        className="option-number"
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--primary)",
                          transition: "color 0.2s",
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}.
                      </span>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          {icon && (
                            <span
                              style={{
                                fontSize: "var(--text-base)",
                              }}
                            >
                              {icon}
                            </span>
                          )}
                          <span
                            className="option-text"
                            style={{
                              fontFamily: "Inter, sans-serif",
                              fontSize: "var(--text-sm)",
                              fontWeight: "var(--font-weight-semibold)",
                              color: "var(--card-foreground)",
                              transition: "color 0.2s",
                            }}
                          >
                            {displayText}
                          </span>
                        </div>
                        {projectedOutcome && (
                          <span
                            className="option-text"
                            style={{
                              fontFamily: "Inter, sans-serif",
                              fontSize: "var(--text-xs)",
                              fontWeight: "var(--font-weight-normal)",
                              color: "var(--muted-foreground)",
                              transition: "color 0.2s",
                              display: "block",
                              marginTop: "0.25rem",
                            }}
                          >
                            {projectedOutcome}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      {/* Input Area or Results Display */}
      {isThreadResolved && conversationEndData ? (
        /* Conversation End Results */
        <div
          className="absolute bottom-4 left-4 right-4 px-6 py-4 space-y-4"
          style={{
            backgroundColor: "var(--card)",
            boxShadow: "0px 4px 16px 0px rgba(10, 13, 18, 0.2)",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
            maxHeight: "40vh",
            overflowY: "auto",
            zIndex: 40,
          }}
        >
          <div
            className="text-center pb-3 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <h3
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-lg)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--card-foreground)",
              }}
            >
              🎉 {t.consultationEnd.title}
            </h3>
          </div>

          {/* Mini Feedback */}
          {conversationEndData.miniFeedback && (
            <div className="space-y-2">
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-sm)",
                  color: "var(--muted-foreground)",
                  lineHeight: 1.6,
                }}
              >
                {conversationEndData.miniFeedback}
              </p>
            </div>
          )}

          {/* Financial Results */}
          {conversationEndData.financialResults && (
            <div
              className="space-y-3 pt-3 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              {conversationEndData.financialResults.coinsEarned !==
                undefined && (
                <div
                  className="flex items-center justify-between px-4 py-2 rounded-lg"
                  style={{ backgroundColor: "var(--muted)" }}
                >
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-sm)",
                      color: "var(--card-foreground)",
                    }}
                  >
                    💰 {t.consultationEnd.coinsEarned}
                  </span>
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-lg)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--chart-1)",
                    }}
                  >
                    +{conversationEndData.financialResults.coinsEarned}
                  </span>
                </div>
              )}

              {conversationEndData.financialResults.evaluation && (
                <div
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: "var(--muted)" }}
                >
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      color: "var(--muted-foreground)",
                      fontSize: "var(--text-xs)",
                    }}
                  >
                    <strong>{t.consultationEnd.quality}</strong>{" "}
                    {
                      t.qualityLevels[
                        getQualityLevel(
                          conversationEndData.financialResults.evaluation
                            .qualityScore || 5,
                        )
                      ]
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Achievements */}
          {conversationEndData.achievementsUnlocked &&
            conversationEndData.achievementsUnlocked.length > 0 && (
              <div
                className="space-y-2 pt-3 border-t"
                style={{ borderColor: "var(--border)" }}
              >
                <h4
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--card-foreground)",
                  }}
                >
                  🏆 {t.consultationEnd.achievementsUnlocked}
                </h4>
                <div className="space-y-1">
                  {conversationEndData.achievementsUnlocked.map(
                    (achievement: any, idx: number) => {
                      const translatedAchievement =
                        achievement.id && t.achievements[achievement.id]
                          ? t.achievements[achievement.id]
                          : {
                              name: achievement.title || achievement.name,
                              description: achievement.description,
                            };

                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg"
                          style={{ backgroundColor: "var(--muted)" }}
                        >
                          <span style={{ fontSize: "1.2rem" }}>
                            {achievement.icon || "🎯"}
                          </span>
                          <div className="flex-1">
                            <p
                              style={{
                                fontFamily: "Inter, sans-serif",
                                fontSize: "var(--text-sm)",
                                fontWeight: "var(--font-weight-medium)",
                                color: "var(--card-foreground)",
                              }}
                            >
                              {translatedAchievement.name}
                            </p>
                            {translatedAchievement.description && (
                              <p
                                style={{
                                  fontFamily: "Inter, sans-serif",
                                  fontSize: "var(--text-xs)",
                                  color: "var(--muted-foreground)",
                                }}
                              >
                                {translatedAchievement.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            )}

          <div className="text-center pt-3">
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-xs)",
                color: "var(--muted-foreground)",
              }}
            >
              {t.consultationEnd.startingNext}
            </p>
          </div>
        </div>
      ) : (
        /* Normal Input Area */
        <div
          className="absolute bottom-4 left-4 right-4 px-4 py-3 transition-all duration-200 border-2"
          style={{
            backgroundColor: "var(--card)",
            boxShadow: isInputFocused
              ? "0px 6px 20px 0px rgba(10, 13, 18, 0.25), 0 0 40px 8px rgba(var(--primary-rgb, 59, 130, 246), 0.3)"
              : "0px 4px 12px 0px rgba(10, 13, 18, 0.15), 0 0 20px 2px rgba(var(--primary-rgb, 59, 130, 246), 0.1)",
            borderRadius: "9999px",
            borderColor: isInputFocused ? "var(--primary)" : "transparent",
            zIndex: 40,
          }}
        >
          <TooltipProvider>
            {/* Recording UI */}
            {(isRecording || audioBlob) && (
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "center",
                  padding: "0.75rem",
                  backgroundColor: "var(--muted)",
                  borderRadius: "0.75rem",
                  marginBottom: "0.75rem",
                }}
              >
                {/* Recording indicator */}
                {isRecording && (
                  <div
                    style={{
                      width: "0.75rem",
                      height: "0.75rem",
                      backgroundColor: "var(--destructive)",
                      borderRadius: "50%",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                )}

                {/* Timer */}
                <div
                  style={{
                    flex: 1,
                    fontFamily: "Inter, sans-serif",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                  }}
                >
                  {isRecording ? "Recording..." : "Recording ready"}{" "}
                  {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {isRecording ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={stopRecording}
                        style={{
                          borderRadius: "9999px",
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        Stop
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelRecording}
                        style={{
                          borderRadius: "9999px",
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {isTranscribing ? (
                        <div
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "0.875rem",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          Transcribing...
                        </div>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAudioBlob(null);
                              setRecordingTime(0);
                            }}
                            style={{
                              borderRadius: "9999px",
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={sendVoiceMessage}
                            style={{
                              borderRadius: "9999px",
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Send
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 items-end">
              <Input
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder="Type a message..."
                disabled={isThreadResolved || isRecording || audioBlob !== null}
                className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                style={{
                  borderRadius: "9999px",
                  backgroundColor: "transparent",
                }}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="group"
                    disabled={isThreadResolved || isRecording || isTranscribing}
                    onClick={startRecording}
                    style={{
                      borderRadius: "9999px",
                      backgroundColor: isRecording ? "var(--destructive)" : "var(--muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <Mic className={`w-4 h-4 ${isRecording ? "text-white" : "text-muted-foreground group-hover:text-foreground"} transition-colors`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p style={{ fontFamily: "Inter, sans-serif" }}>
                    {isRecording ? "Recording..." : "Record a voice message"}
                  </p>
                </TooltipContent>
              </Tooltip>
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isThreadResolved}
                size="icon"
                style={{
                  borderRadius: "9999px",
                }}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </TooltipProvider>
        </div>
      )}

      {/* Call Dialog */}
      {showCallDialog && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.8)",
          }}
        >
          <div
            className="w-full max-w-md mx-4 p-8 flex flex-col items-center"
            style={{
              backgroundColor: "var(--card)",
              borderRadius: "var(--radius-card)",
              boxShadow: "0px 8px 24px 0px rgba(10, 13, 18, 0.25)",
            }}
          >
            <div className="mb-6">
              <Avatar className="w-64 h-64">
                <AvatarImage src={contact.avatarImage} alt={contact.name} />
                <AvatarFallback
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: "var(--font-weight-medium)",
                    fontSize: "4rem",
                  }}
                >
                  {contact.avatar}
                </AvatarFallback>
              </Avatar>
            </div>

            <h3
              className="mb-2"
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-xl)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--card-foreground)",
              }}
            >
              {contact.name}
            </h3>

            <p
              className="mb-6"
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-lg)",
                color: "var(--muted-foreground)",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              {formatCallDuration(callDuration)}
            </p>

            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-3 h-3 rounded-full animate-pulse"
                style={{
                  backgroundColor: "var(--chart-1)",
                }}
              />
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-sm)",
                  color: "var(--muted-foreground)",
                }}
              >
                Call in progress...
              </p>
            </div>

            <Button
              onClick={() => setShowCallDialog(false)}
              variant="destructive"
              size="lg"
              className="mt-4 w-16 h-16"
              style={{
                borderRadius: "9999px",
              }}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </div>
      )}

      {/* Video Dialog */}
      {showVideoDialog && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.8)",
          }}
        >
          <div
            className="w-full max-w-md mx-4 p-8 flex flex-col items-center"
            style={{
              backgroundColor: "var(--card)",
              borderRadius: "var(--radius-card)",
              boxShadow: "0px 8px 24px 0px rgba(10, 13, 18, 0.25)",
            }}
          >
            <div className="mb-6">
              <Avatar className="w-64 h-64">
                <AvatarImage src={contact.avatarImage} alt={contact.name} />
                <AvatarFallback
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: "var(--font-weight-medium)",
                    fontSize: "4rem",
                  }}
                >
                  {contact.avatar}
                </AvatarFallback>
              </Avatar>
            </div>

            <h3
              className="mb-2"
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-xl)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--card-foreground)",
              }}
            >
              {contact.name}
            </h3>

            <p
              className="mb-6"
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-lg)",
                color: "var(--muted-foreground)",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              {formatVideoDuration(videoDuration)}
            </p>

            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-3 h-3 rounded-full animate-pulse"
                style={{
                  backgroundColor: "var(--chart-1)",
                }}
              />
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-sm)",
                  color: "var(--muted-foreground)",
                }}
              >
                Video call in progress...
              </p>
            </div>

            <Button
              onClick={() => setShowVideoDialog(false)}
              variant="destructive"
              size="lg"
              className="mt-4 w-16 h-16"
              style={{
                borderRadius: "9999px",
              }}
            >
              <VideoOff className="w-6 h-6" />
            </Button>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.8)",
          }}
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: "var(--card)",
              borderRadius: "var(--radius-card)",
              boxShadow: "0px 8px 24px 0px rgba(10, 13, 18, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="sticky top-0 px-6 py-4 border-b border-border flex items-center justify-between"
              style={{ backgroundColor: "var(--card)" }}
            >
              <h2
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-xl)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--card-foreground)",
                }}
              >
                Character Profile
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowProfileModal(false)}
                style={{ borderRadius: "var(--radius-button)" }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Profile Content */}
            <div className="p-6 space-y-6">
              {/* Avatar and Basic Info */}
              <div className="flex flex-col items-center gap-4">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={contact.avatarImage} alt={contact.name} />
                  <AvatarFallback
                    style={{
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                      fontFamily: "Inter, sans-serif",
                      fontWeight: "var(--font-weight-medium)",
                      fontSize: "3rem",
                    }}
                  >
                    {contact.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-2xl)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--card-foreground)",
                    }}
                  >
                    {contact.name}
                  </h3>
                  {contact.id === "boss-pinned" && (
                    <div
                      className="inline-flex items-center gap-1.5 px-3 py-1 mt-2"
                      style={{
                        backgroundColor: "var(--primary)",
                        borderRadius: "var(--radius-button)",
                      }}
                    >
                      <Briefcase
                        className="w-3.5 h-3.5"
                        style={{ color: "var(--primary-foreground)" }}
                      />
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--primary-foreground)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Your Boss
                      </span>
                    </div>
                  )}
                  <p
                    className="mt-2"
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-sm)",
                      color: "var(--muted-foreground)",
                      fontWeight: "var(--font-weight-normal)",
                    }}
                  >
                    {contact.online ? "Online" : "Offline"}
                  </p>
                </div>
              </div>

              {/* Boss-specific section or Character Info */}
              {contact.id === "boss-pinned" ? (
                <div
                  className="p-4 border border-border"
                  style={{
                    backgroundColor: "var(--muted)",
                    borderRadius: "var(--radius-card)",
                  }}
                >
                  <h4
                    className="mb-3"
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-lg)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--card-foreground)",
                    }}
                  >
                    Professional Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        Position
                      </span>
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: "var(--card-foreground)",
                          fontWeight: "var(--font-weight-medium)",
                        }}
                      >
                        Senior Manager
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        Department
                      </span>
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: "var(--card-foreground)",
                          fontWeight: "var(--font-weight-medium)",
                        }}
                      >
                        Finance
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        Relationship
                      </span>
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: "var(--card-foreground)",
                          fontWeight: "var(--font-weight-medium)",
                        }}
                      >
                        Direct Supervisor
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        Reports To
                      </span>
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: "var(--card-foreground)",
                          fontWeight: "var(--font-weight-medium)",
                        }}
                      >
                        C-Suite
                      </span>
                    </div>
                  </div>

                  {/* Boss Expectations Section */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Target
                        className="w-4 h-4"
                        style={{ color: "var(--primary)" }}
                      />
                      <h5
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--card-foreground)",
                        }}
                      >
                        Current Expectations
                      </h5>
                    </div>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-1.5"
                          style={{ backgroundColor: "var(--primary)" }}
                        />
                        <span
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-sm)",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          Complete quarterly financial report by EOD
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-1.5"
                          style={{ backgroundColor: "var(--primary)" }}
                        />
                        <span
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-sm)",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          Prepare board meeting presentation
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-1.5"
                          style={{ backgroundColor: "var(--primary)" }}
                        />
                        <span
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-sm)",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          Ensure accurate revenue projections
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Management Style Section */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Users
                        className="w-4 h-4"
                        style={{ color: "var(--primary)" }}
                      />
                      <h5
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--card-foreground)",
                        }}
                      >
                        Management Style
                      </h5>
                    </div>
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-sm)",
                        color: "var(--muted-foreground)",
                        lineHeight: 1.6,
                      }}
                    >
                      Direct and results-oriented. Expects high-quality work
                      delivered on tight deadlines. Values accuracy and
                      attention to detail above all else.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className="p-4 border border-border"
                  style={{
                    backgroundColor: "var(--muted)",
                    borderRadius: "var(--radius-card)",
                  }}
                >
                  <h4
                    className="mb-3"
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-lg)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--card-foreground)",
                    }}
                  >
                    Character Info
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        Role
                      </span>
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: "var(--card-foreground)",
                          fontWeight: "var(--font-weight-medium)",
                        }}
                      >
                        {contact.occupation || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        Location
                      </span>
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: "var(--card-foreground)",
                          fontWeight: "var(--font-weight-medium)",
                        }}
                      >
                        Finland
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        Age
                      </span>
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: "var(--card-foreground)",
                          fontWeight: "var(--font-weight-medium)",
                        }}
                      >
                        {contact.age || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Trust Meter */}
              <div
                className="p-4 border border-border"
                style={{
                  backgroundColor: "var(--muted)",
                  borderRadius: "var(--radius-card)",
                }}
              >
                <h4
                  className="mb-4"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--card-foreground)",
                  }}
                >
                  Relationship Trust
                </h4>
                <TrustMeter trust={contact.trust} />
              </div>

              {/* Financial Status */}
              <div
                className="p-4 border border-border"
                style={{
                  backgroundColor: "var(--muted)",
                  borderRadius: "var(--radius-card)",
                }}
              >
                <h4
                  className="mb-3"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--card-foreground)",
                  }}
                >
                  Financial Status
                </h4>
                <div className="space-y-4">
                  <div
                    className="p-4 flex items-center justify-between"
                    style={{
                      backgroundColor: "var(--card)",
                      borderRadius: "var(--radius-button)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2"
                        style={{
                          backgroundColor: "var(--chart-1)",
                          borderRadius: "var(--radius-button)",
                        }}
                      >
                        <Wallet
                          className="w-5 h-5"
                          style={{ color: "var(--primary-foreground)" }}
                        />
                      </div>
                      <div>
                        <p
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-sm)",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          Total Balance
                        </p>
                        <p
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-2xl)",
                            fontWeight: "var(--font-weight-semibold)",
                            color: "var(--card-foreground)",
                          }}
                        >
                          {formatCurrency(calculateTotalBalance(contact))}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="p-3"
                      style={{
                        backgroundColor: "var(--card)",
                        borderRadius: "var(--radius-button)",
                      }}
                    >
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-xs)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        Monthly Income
                      </p>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-lg)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--card-foreground)",
                        }}
                      >
                        {formatCurrency(
                          contact.financialProfile?.typicalMonthlyIncome || 0,
                        )}
                      </p>
                    </div>

                    <div
                      className="p-3"
                      style={{
                        backgroundColor: "var(--card)",
                        borderRadius: "var(--radius-button)",
                      }}
                    >
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-xs)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        Total Debt
                      </p>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-lg)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--card-foreground)",
                        }}
                      >
                        {formatCurrency(calculateTotalDebt(contact))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
