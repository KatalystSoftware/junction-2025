import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Send, Bot, User } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(
      () => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: getAIResponse(inputValue),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        setIsTyping(false);
      },
      1000 + Math.random() * 1000,
    );
  };

  const getAIResponse = (userInput: string): string => {
    const responses = [
      "That's a great question! Let me help you with that.",
      "I understand. Here's what I think about that topic.",
      "Interesting perspective! I'd be happy to discuss this further.",
      "Thanks for sharing that. Here are some thoughts on the matter.",
      "I can definitely help with that. Let me provide some information.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Bot
              className="w-5 h-5"
              style={{ color: "var(--primary-foreground)" }}
            />
          </div>
          <div>
            <h2 className="text-card-foreground">AI Assistant</h2>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--muted-foreground)",
                fontFamily: "Inter, sans-serif",
                fontWeight: "var(--font-weight-normal)",
                lineHeight: 1.43,
              }}
            >
              Always here to help
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-6">
        <div className="py-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback
                  style={{
                    backgroundColor:
                      message.role === "user"
                        ? "var(--muted)"
                        : "var(--primary)",
                    color:
                      message.role === "user"
                        ? "var(--muted-foreground)"
                        : "var(--primary-foreground)",
                  }}
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </AvatarFallback>
              </Avatar>

              <div
                className={`flex flex-col gap-1 max-w-[70%] ${
                  message.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className="px-4 py-3"
                  style={{
                    backgroundColor:
                      message.role === "user"
                        ? "var(--primary)"
                        : "var(--muted)",
                    color:
                      message.role === "user"
                        ? "var(--primary-foreground)"
                        : "var(--foreground)",
                    borderRadius:
                      message.role === "user"
                        ? "var(--radius-card) var(--radius-card) var(--radius-sm) var(--radius-card)"
                        : "var(--radius-card) var(--radius-card) var(--radius-card) var(--radius-sm)",
                  }}
                >
                  <p>{message.content}</p>
                </div>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--muted-foreground)",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: "var(--font-weight-normal)",
                  }}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div
                className="px-4 py-3 flex items-center gap-1"
                style={{
                  backgroundColor: "var(--muted)",
                  borderRadius: "var(--radius-card)",
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
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border bg-card px-6 py-4">
        <div className="flex gap-2 items-end">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1"
            style={{
              borderRadius: "var(--radius-button)",
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            style={{
              borderRadius: "var(--radius-button)",
            }}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
