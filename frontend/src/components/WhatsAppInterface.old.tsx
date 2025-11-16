import { useState, useEffect } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { ChatWindow } from "./ChatWindow";
import type { Contact } from "./WhatsAppInterface";
import michaelScottImage from "figma:asset/98a682f9e6eea0635304bf1ceada7ac6a7758d54.png";
import { useGame } from "../hooks/useGame";

export interface Message {
  id: string;
  contactId: string;
  role: "user" | "contact";
  content: string;
  timestamp: Date;
  type?: "text" | "voice";
  duration?: number; // duration in seconds for voice messages
}

const initialContacts: Contact[] = [
  {
    id: "1",
    name: "Sarah Anderson",
    avatar: "SA",
    avatarImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    lastMessage: "That sounds great! Let's do it.",
    timestamp: "2:30 PM",
    lastMessageTime: new Date(Date.now() - 1800000),
    unreadCount: 2,
    online: true,
    gender: "female",
    trust: 85,
  },
  {
    id: "2",
    name: "Michael Chen",
    avatar: "MC",
    avatarImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
    lastMessage: "Can you send me the files?",
    timestamp: "1:45 PM",
    lastMessageTime: new Date(Date.now() - 2700000),
    unreadCount: 0,
    online: true,
    gender: "male",
    trust: 70,
  },
  {
    id: "3",
    name: "Emma Watson",
    avatar: "EW",
    avatarImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    lastMessage: "Thanks for your help!",
    timestamp: "12:20 PM",
    lastMessageTime: new Date(Date.now() - 3600000),
    unreadCount: 0,
    online: false,
    gender: "female",
    trust: 90,
  },
  {
    id: "4",
    name: "James Rodriguez",
    avatar: "JR",
    avatarImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
    lastMessage: "See you tomorrow 👋",
    timestamp: "11:15 AM",
    lastMessageTime: new Date(Date.now() - 4500000),
    unreadCount: 0,
    online: false,
    gender: "male",
    trust: 60,
  },
  {
    id: "5",
    name: "Olivia Brown",
    avatar: "OB",
    avatarImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Olivia",
    lastMessage: "Perfect! I'll be there.",
    timestamp: "Yesterday",
    lastMessageTime: new Date(Date.now() - 86400000),
    unreadCount: 0,
    online: true,
    gender: "female",
    trust: 80,
  },
  {
    id: "6",
    name: "David Kim",
    avatar: "DK",
    avatarImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    lastMessage: "Did you get my email?",
    timestamp: "Yesterday",
    lastMessageTime: new Date(Date.now() - 86400000),
    unreadCount: 5,
    online: false,
    gender: "male",
    trust: 50,
  },
  {
    id: "7",
    name: "Sophia Martinez",
    avatar: "SM",
    avatarImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia",
    lastMessage: "Great work on the presentation!",
    timestamp: "Tuesday",
    lastMessageTime: new Date(Date.now() - 172800000),
    unreadCount: 0,
    online: true,
    gender: "female",
    trust: 95,
  },
  {
    id: "8",
    name: "William Taylor",
    avatar: "WT",
    avatarImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=William",
    lastMessage: "Let me know when you're free",
    timestamp: "Monday",
    lastMessageTime: new Date(Date.now() - 259200000),
    unreadCount: 0,
    online: false,
    gender: "male",
    trust: 40,
  },
  {
    id: "9",
    name: "Ava Johnson",
    avatar: "AJ",
    avatarImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ava",
    lastMessage: "I'll send you the details soon",
    timestamp: "Monday",
    lastMessageTime: new Date(Date.now() - 259200000),
    unreadCount: 0,
    online: true,
    gender: "female",
    trust: 75,
  },
  {
    id: "10",
    name: "Ethan Williams",
    avatar: "EW",
    avatarImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan",
    lastMessage: "Thanks again! 🙏",
    timestamp: "Sunday",
    lastMessageTime: new Date(Date.now() - 345600000),
    unreadCount: 0,
    online: false,
    gender: "male",
    trust: 65,
  },
];

const initialMessages: { [key: string]: Message[] } = {
  "boss-pinned": [
    {
      id: "1",
      contactId: "boss-pinned",
      role: "contact",
      content:
        "Good morning. I hope you're making progress on the quarterly financial report.",
      timestamp: new Date(new Date().setHours(9, 0, 0, 0)), // 9:00 AM
    },
    {
      id: "2",
      contactId: "boss-pinned",
      role: "user",
      content:
        "Good morning! Yes, I'm working on it right now. Should have it ready soon.",
      timestamp: new Date(new Date().setHours(9, 2, 0, 0)), // 9:02 AM
    },
    {
      id: "3",
      contactId: "boss-pinned",
      role: "contact",
      content:
        "That's what I like to hear. Make sure the revenue projections are accurate this time.",
      timestamp: new Date(new Date().setHours(9, 5, 0, 0)), // 9:05 AM
    },
    {
      id: "4",
      contactId: "boss-pinned",
      role: "contact",
      content:
        "By the way, you should read more about tracking expenses. Here's a helpful resource: https://www.investopedia.com/personal-finance/tracking-expenses/",
      timestamp: new Date(new Date().setHours(9, 10, 0, 0)), // 9:10 AM
    },
  ],
  "1": [
    {
      id: "1",
      contactId: "1",
      role: "contact",
      content: "Hey! How are you doing?",
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: "2",
      contactId: "1",
      role: "user",
      content: "I'm doing great! Thanks for asking. How about you?",
      timestamp: new Date(Date.now() - 3500000),
    },
    {
      id: "3",
      contactId: "1",
      role: "contact",
      content:
        "Pretty good! I wanted to discuss the project plans for next week.",
      timestamp: new Date(Date.now() - 3400000),
    },
    {
      id: "3-voice",
      contactId: "1",
      role: "contact",
      content: "Voice message",
      timestamp: new Date(Date.now() - 3350000),
      type: "voice",
      duration: 12,
    },
    {
      id: "4",
      contactId: "1",
      role: "user",
      content: "Sure, I'd love to. What time works best for you?",
      timestamp: new Date(Date.now() - 3300000),
    },
    {
      id: "5",
      contactId: "1",
      role: "contact",
      content: "That sounds great! Let's do it.",
      timestamp: new Date(Date.now() - 1800000),
    },
  ],
  "2": [
    {
      id: "1",
      contactId: "2",
      role: "contact",
      content: "Hi, do you have a moment?",
      timestamp: new Date(Date.now() - 5400000),
    },
    {
      id: "2",
      contactId: "2",
      role: "user",
      content: "Yes, what's up?",
      timestamp: new Date(Date.now() - 5300000),
    },
    {
      id: "3",
      contactId: "2",
      role: "contact",
      content: "Can you send me the files?",
      timestamp: new Date(Date.now() - 2700000),
    },
  ],
};

interface WhatsAppInterfaceProps {
  onLogoClick: () => void;
}

export function WhatsAppInterface({ onLogoClick }: WhatsAppInterfaceProps) {
  // Game integration
  const game = useGame();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null,
  );
  const [allMessages, setAllMessages] = useState<{ [key: string]: Message[] }>(
    {},
  );
  const [showChat, setShowChat] = useState(false);
  const [adviceChoicesByThread, setAdviceChoicesByThread] = useState<{
    [threadId: string]: any[];
  }>({});
  const [characterInfoByThread, setCharacterInfoByThread] = useState<{
    [threadId: string]: { name: string; age: number; occupation: string };
  }>({});
  const [conversationEndDataByThread, setConversationEndDataByThread] =
    useState<{ [threadId: string]: any }>({});

  // Use backend's typing state
  const contactIsTyping = game.isSending;

  // Helper: Convert frontend messages to backend threadHistories format
  const convertMessagesToThreadHistories = (messages: {
    [key: string]: Message[];
  }): Record<
    string,
    Array<{ role: "user" | "assistant"; content: string }>
  > => {
    const histories: Record<
      string,
      Array<{ role: "user" | "assistant"; content: string }>
    > = {};

    for (const [threadId, msgs] of Object.entries(messages)) {
      histories[threadId] = msgs.map((msg) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      }));
    }

    return histories;
  };
  const [bossContact, setBossContact] = useState<Contact>({
    id: "boss-pinned",
    name: "Michael Scott",
    avatar: "MS",
    lastMessage:
      "By the way, you should read more about tracking expenses. Here's a helpful resource: https://www.investopedia.com/personal-finance/tracking-expenses/",
    timestamp: "9:10 AM",
    lastMessageTime: new Date(new Date().setHours(9, 10, 0, 0)),
    unreadCount: 1,
    online: true,
    avatarImage: michaelScottImage,
    trust: 100,
  });

  // Load saved message histories and character info from backend on mount
  useEffect(() => {
    if (game.threadHistories && Object.keys(game.threadHistories).length > 0) {
      console.log(
        "💾 Restoring message histories from backend:",
        Object.keys(game.threadHistories),
      );

      const restoredMessages: { [key: string]: Message[] } = {};

      for (const [threadId, history] of Object.entries(game.threadHistories)) {
        restoredMessages[threadId] = history.map((msg, idx) => ({
          id: `${threadId}-restored-${idx}`,
          contactId: threadId,
          role: msg.role === "user" ? "user" : "contact",
          content: msg.content,
          timestamp: new Date(), // We don't persist timestamps
        }));
      }

      setAllMessages(restoredMessages);
      console.log(
        "✅ Restored messages for threads:",
        Object.keys(restoredMessages),
      );
    }
  }, [game.threadHistories]);

  // Separate effect for character info to ensure it runs before contact mapping
  useEffect(() => {
    if (game.characterInfo && Object.keys(game.characterInfo).length > 0) {
      console.log(
        "👤 Restoring character info from backend:",
        game.characterInfo,
      );
      setCharacterInfoByThread(game.characterInfo);
      console.log(
        "✅ Restored character info for threads:",
        Object.keys(game.characterInfo),
      );
    }
  }, [game.characterInfo]);

  // Start game - first show boss onboarding, then auto-start consultation
  useEffect(() => {
    if (game.advisorState && !game.advisorState.hasCompletedOnboarding) {
      console.log("👔 Boss onboarding...");
      // Start consultation which will trigger onboarding
      const threadHistories = convertMessagesToThreadHistories(allMessages);
      game.startConsultation(threadHistories, characterInfoByThread);
    }
  }, [game.advisorState?.hasCompletedOnboarding]);

  // Note: We no longer auto-start the first consultation
  // Instead, user must acknowledge the boss message first

  // Map backend threads to contacts
  useEffect(() => {
    if (!game.advisorState) return;

    const threads = Object.values(game.advisorState.activeThreads || {});

    if (threads.length === 0) return;

    const mappedContacts: Contact[] = threads.map((thread: any) => {
      const threadMessages = allMessages[thread.threadId] || [];
      const lastMsg = threadMessages[threadMessages.length - 1];

      // Get character info if we have it stored
      const charInfo = characterInfoByThread[thread.threadId];
      const characterName = charInfo?.name || "Client";

      console.log(
        `🔍 Mapping thread ${thread.threadId}: charInfo =`,
        charInfo,
        "name =",
        characterName,
      );

      return {
        id: thread.threadId,
        name: characterName,
        avatar: characterName.substring(0, 2).toUpperCase(),
        avatarImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.characterId}`,
        lastMessage: lastMsg?.content || "New consultation",
        timestamp: formatTimestamp(new Date(thread.lastMessageAt)),
        lastMessageTime: new Date(thread.lastMessageAt),
        unreadCount: thread.status === "awaiting_response" ? 1 : 0,
        online: thread.status === "active",
        trust: 50,
      };
    });

    setContacts(mappedContacts);

    // Auto-select first thread if none selected
    if (mappedContacts.length > 0 && !selectedContactId) {
      setSelectedContactId(mappedContacts[0].id);
    }
  }, [game.advisorState?.activeThreads, allMessages, characterInfoByThread]);

  // Handle new messages from backend
  useEffect(() => {
    console.log("🔍 game.lastResponse changed:", game.lastResponse);
    if (!game.lastResponse) {
      console.log("❌ No lastResponse");
      return;
    }

    const response = game.lastResponse;
    console.log("✅ Processing response type:", response.type);

    // Handle onboarding message from boss
    if (response.type === "onboarding" && response.onboardingMessage) {
      const msg = response.onboardingMessage;
      const bossMessage: Message = {
        id: `boss-onboarding-${Date.now()}`,
        contactId: "boss-pinned",
        role: "contact" as const,
        content: `${msg.welcomeTitle}\n\n${msg.introduction}\n\n${msg.roleExplanation}\n\n${msg.howItWorks}\n\n${msg.expectations}\n\n${msg.encouragement}`,
        timestamp: new Date(),
      };

      setAllMessages((prev) => {
        const updated = {
          ...prev,
          ["boss-pinned"]: [bossMessage],
        };
        console.log(
          "👔 Boss onboarding message added to allMessages:",
          updated,
        );
        return updated;
      });

      // Update boss contact
      setBossContact((prev) => ({
        ...prev,
        lastMessage: msg.welcomeTitle,
        timestamp: formatTimestamp(new Date()),
        unreadCount: 1,
      }));

      // Set acknowledgment quick responses for boss
      setAdviceChoicesByThread((prev) => ({
        ...prev,
        ["boss-pinned"]: [
          { fullAdviceText: "Understood! I'm ready to help clients." },
          { fullAdviceText: "Got it! Let's get started." },
          { fullAdviceText: "Thanks! I'll do my best." },
        ],
      }));

      // Auto-select boss to show the intro message
      setSelectedContactId("boss-pinned");
      setShowChat(true);
    }

    // Handle character messages
    if (
      response.threadId &&
      response.messages &&
      response.messages.length > 0
    ) {
      const threadId = response.threadId;

      // Build updated character info BEFORE state updates
      let updatedCharacterInfo = { ...characterInfoByThread };
      if (response.characterInfo) {
        updatedCharacterInfo[threadId] = response.characterInfo;
        setCharacterInfoByThread(updatedCharacterInfo);
        console.log(
          `👤 Stored character info for ${threadId}:`,
          response.characterInfo.name,
        );
      }

      // Add character messages
      const newMessages: Message[] = response.messages.map((content, idx) => ({
        id: `${threadId}-char-${Date.now()}-${idx}`,
        contactId: threadId,
        role: "contact" as const,
        content,
        timestamp: new Date(),
      }));

      // Build updated messages BEFORE state update
      const updatedMessages = {
        ...allMessages,
        [threadId]: [...(allMessages[threadId] || []), ...newMessages],
      };
      setAllMessages(updatedMessages);
      console.log(
        `👤 Client messages added for ${threadId}:`,
        updatedMessages[threadId],
      );
      console.log(
        `💾 Total messages now: ${Object.values(updatedMessages).flat().length}`,
      );

      // Handle conversation end
      if (response.type === "conversation_end") {
        console.log(`🏁 Conversation ended for thread ${threadId}`);

        // Store end-of-conversation data
        setConversationEndDataByThread((prev) => ({
          ...prev,
          [threadId]: {
            financialResults: response.financialResults,
            miniFeedback: response.miniFeedback,
            achievementsUnlocked: response.achievementsUnlocked,
            milestonesAchieved: response.milestonesAchieved,
          },
        }));

        // Clear advice choices for ended conversations
        setAdviceChoicesByThread((prev) => {
          const updated = { ...prev };
          delete updated[threadId];
          return updated;
        });

        // Auto-trigger next consultation after a short delay
        // Use the UPDATED values, not state (which is async)
        setTimeout(() => {
          console.log(`🎮 Auto-starting next consultation...`);
          const threadHistories =
            convertMessagesToThreadHistories(updatedMessages);
          game.startConsultation(threadHistories, updatedCharacterInfo);
        }, 3000);
      } else {
        // Store advice choices for THIS THREAD ONLY (if conversation is ongoing)
        if (response.adviceChoices && response.adviceChoices.length > 0) {
          setAdviceChoicesByThread((prev) => ({
            ...prev,
            [threadId]: response.adviceChoices!,
          }));
          console.log(
            `💡 Stored ${response.adviceChoices.length} advice choices for thread ${threadId}`,
          );
        } else {
          setAdviceChoicesByThread((prev) => {
            const updated = { ...prev };
            delete updated[threadId];
            return updated;
          });
        }
      }

      // Auto-select this thread (new client arrived!)
      console.log(`👤 New client arrived: ${threadId.substring(0, 8)}...`);
      setSelectedContactId(threadId);
      setShowChat(true);
    }
  }, [game.lastResponse]);

  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  const displayContact =
    selectedContactId === "boss-pinned" ? bossContact : selectedContact;
  const messages = allMessages[selectedContactId || ""] || [];

  const hasAnyUserMessages = Object.values(allMessages).some((thread) =>
    thread.some((message) => message.role === "user"),
  );

  // Get advice choices for the currently selected thread only
  const currentAdviceChoices = selectedContactId
    ? adviceChoicesByThread[selectedContactId] || []
    : [];

  // Get conversation end data for the currently selected thread
  const conversationEndData = selectedContactId
    ? conversationEndDataByThread[selectedContactId]
    : undefined;

  // Check if the selected thread is resolved (conversation ended)
  const isThreadResolved =
    selectedContactId &&
    game.advisorState?.activeThreads[selectedContactId]?.status === "resolved";

  // Debug logging
  useEffect(() => {
    console.log("📊 Selected contact:", selectedContactId);
    console.log("📊 All messages:", Object.keys(allMessages));
    console.log("📊 Current messages:", messages.length);
  }, [selectedContactId, allMessages, messages]);

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return diffMins === 0 ? "Just now" : `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "long" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const updateContactWithMessage = (contactId: string, message: Message) => {
    setContacts((prevContacts) => {
      const updatedContacts = prevContacts.map((contact) => {
        if (contact.id === contactId) {
          return {
            ...contact,
            lastMessage: message.content,
            timestamp: formatTimestamp(message.timestamp),
            lastMessageTime: message.timestamp,
          };
        }
        return contact;
      });

      // Sort contacts by lastMessageTime (most recent first)
      return updatedContacts.sort(
        (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime(),
      );
    });
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setShowChat(true);
  };

  const handleBackToContacts = () => {
    setShowChat(false);
  };

  const handleSendMessage = (content: string) => {
    if (!selectedContactId || !content.trim() || !game.advisorState) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      contactId: selectedContactId,
      role: "user",
      content,
      timestamp: new Date(),
    };

    // Build updated messages including the new one
    const updatedMessages = {
      ...allMessages,
      [selectedContactId]: [
        ...(allMessages[selectedContactId] || []),
        newMessage,
      ],
    };

    // Add user message immediately (optimistic update)
    setAllMessages(updatedMessages);

    // Update contact with the new message
    updateContactWithMessage(selectedContactId, newMessage);

    // Special handling for boss acknowledgment (first message to boss after onboarding)
    if (
      selectedContactId === "boss-pinned" &&
      game.advisorState.hasCompletedOnboarding
    ) {
      const hasThreads =
        Object.keys(game.advisorState.activeThreads || {}).length > 0;
      if (!hasThreads) {
        console.log("👔 Boss acknowledged! Starting first consultation...");

        // Clear boss quick responses
        setAdviceChoicesByThread((prev) => {
          const updated = { ...prev };
          delete updated["boss-pinned"];
          return updated;
        });

        // Start first consultation after a brief moment
        setTimeout(() => {
          const threadHistories =
            convertMessagesToThreadHistories(updatedMessages);
          game.startConsultation(threadHistories, characterInfoByThread);
        }, 1500);

        return; // Don't send to backend, boss doesn't need API calls
      }
    }

    // Send to real backend with UPDATED message history and character info
    // (Skip for boss messages)
    if (selectedContactId !== "boss-pinned") {
      console.log("📤 Sending message to backend:", content);
      const threadHistories = convertMessagesToThreadHistories(updatedMessages);
      game.sendMessage(
        selectedContactId,
        content,
        threadHistories,
        characterInfoByThread,
      );
    }
  };

  const getRandomResponse = (): string => {
    const responses = [
      "That's interesting! Tell me more.",
      "I totally agree with you.",
      "Let me think about that and get back to you.",
      "Sounds good to me!",
      "I appreciate you sharing that.",
      "Got it, thanks!",
      "That works for me.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Show loading state while game initializes
  if (game.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading game session...</p>
        </div>
      </div>
    );
  }

  // Show error state if connection fails
  if (game.error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center max-w-md px-4">
          <h2 className="text-xl font-bold text-destructive mb-2">
            Connection Error
          </h2>
          <p className="text-muted-foreground mb-4">
            Failed to connect to game server. Make sure the backend is running
            on port 4111.
          </p>
          <code className="text-sm bg-muted p-2 rounded block">
            cd puppet-master && pnpm dev:api
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <ChatSidebar
        contacts={contacts}
        selectedContactId={selectedContactId || ""}
        onSelectContact={handleSelectContact}
        showChat={showChat}
        bossContact={bossContact}
        onLogoClick={onLogoClick}
        advisorState={game.advisorState}
      />
      <ChatWindow
        contact={displayContact}
        messages={messages}
        onSendMessage={handleSendMessage}
        onBack={handleBackToContacts}
        showChat={showChat}
        contactIsTyping={contactIsTyping}
        adviceChoices={currentAdviceChoices}
        isThreadResolved={isThreadResolved}
        conversationEndData={conversationEndData}
        hasAnyUserMessages={hasAnyUserMessages}
      />
    </div>
  );
}
