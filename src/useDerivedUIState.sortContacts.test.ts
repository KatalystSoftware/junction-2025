import type { Contact } from "../frontend/src/types/ui.ts";
import { sortContactsByLastMessageTime } from "../frontend/src/hooks/useDerivedUIState.ts";

function makeContact(id: string, time: Date): Contact {
  return {
    id,
    name: id,
    avatar: "CL",
    lastMessage: "",
    timestamp: "",
    lastMessageTime: time,
    unreadCount: 0,
    online: false,
    trust: 0,
  };
}

describe("sortContactsByLastMessageTime", () => {
  it("sorts contacts by lastMessageTime descending", () => {
    const older = new Date("2024-01-01T10:00:00Z");
    const newer = new Date("2024-01-01T11:00:00Z");

    const contacts = [makeContact("older", older), makeContact("newer", newer)];

    const sorted = sortContactsByLastMessageTime(contacts);

    expect(sorted[0].id).toBe("newer");
    expect(sorted[1].id).toBe("older");
  });

  it("does not mutate the original array", () => {
    const time = new Date("2024-01-01T10:00:00Z");
    const contacts = [makeContact("a", time), makeContact("b", time)];
    const original = [...contacts];

    sortContactsByLastMessageTime(contacts);

    expect(contacts).toEqual(original);
  });
}

