import React from "react";
import { renderToString } from "react-dom/server";
import { ChatSidebar } from "./ChatSidebar";
import type { Contact } from "./WhatsAppInterface";

// Minimal localStorage stub for translation hook
if (typeof (globalThis as any).localStorage === "undefined") {
  (globalThis as any).localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  };
}

const bossContact: Contact = {
  id: "boss-pinned",
  name: "Boss",
  avatar: "BO",
  lastMessage: "We need to talk.",
  timestamp: "Now",
  lastMessageTime: new Date(),
  unreadCount: 0,
  online: true,
  trust: 100,
};

const pendingContact: Contact = {
  id: "thread-1",
  characterId: "char-1",
  name: "Client One",
  avatar: "CL",
  lastMessage: "Waiting for your advice.",
  timestamp: "Just now",
  lastMessageTime: new Date(),
  unreadCount: 0,
  online: true,
  status: "awaiting_response",
  trust: 50,
};

const html = renderToString(
  <ChatSidebar
    contacts={[pendingContact]}
    selectedContactId={null}
    onSelectContact={() => {}}
    showChat={false}
    bossContact={bossContact}
    onLogoClick={() => {}}
  />,
);

if (!html.includes("border-left:3px solid var(--primary)")) {
  throw new Error("Pending thread row should have a left border highlight");
}

