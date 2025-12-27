"use client";

import type { ChatMessage } from "@/lib/types";
import { getTextFromMessage } from "@/lib/utils";
import { PlanActionButton } from "./plan-action-button";

type MessagePlanActionProps = {
  chatId: string;
  message: ChatMessage;
  onSuccess?: () => void;
};

export function MessagePlanAction({
  chatId,
  message,
  onSuccess,
}: MessagePlanActionProps) {
  // Only show for assistant messages
  if (message.role !== "assistant") {
    return null;
  }

  const messageText = getTextFromMessage(message);

  // Check if message contains plan-like content
  const hasPlanContent =
    /(?:Goal|Plan|Steps|Daily\s+Steps)/i.test(messageText) &&
    (/\d+\.|[-*]/.test(messageText) || /Goal:\s*.+/i.test(messageText));

  if (!hasPlanContent) {
    return null;
  }

  return (
    <div className="mt-2 flex justify-start">
      <PlanActionButton
        chatId={chatId}
        messageId={message.id}
        messageText={messageText}
        onSuccess={onSuccess}
      />
    </div>
  );
}
