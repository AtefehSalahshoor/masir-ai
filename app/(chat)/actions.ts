"use server";

import { generateText, type UIMessage } from "ai";
import { cookies } from "next/headers";
import { auth } from "@/app/(auth)/auth";
import type { VisibilityType } from "@/components/visibility-selector";
import { titlePrompt } from "@/lib/ai/prompts";
import { getTitleModel } from "@/lib/ai/providers";
import {
  createGoalWithSteps,
  deleteMessagesByChatIdAfterTimestamp,
  deleteStep,
  getChatById,
  getMessageById,
  toggleStepCompletion,
  updateChatVisibilityById,
  updateStep,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { getTextFromMessage } from "@/lib/utils";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const { text: title } = await generateText({
    model: getTitleModel(),
    system: titlePrompt,
    prompt: getTextFromMessage(message),
  });

  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisibilityById({ chatId, visibility });
}

export async function createGoalFromPlan({
  chatId,
  messageId,
  goalTitle,
  goalDescription,
  steps,
}: {
  chatId: string;
  messageId: string;
  goalTitle: string;
  goalDescription?: string;
  steps: Array<{ title: string; order?: number }>;
}) {
  const session = await auth();

  if (!session?.user) {
    throw new ChatSDKError("unauthorized:chat", "You must be signed in");
  }

  const chat = await getChatById({ id: chatId });

  if (!chat) {
    throw new ChatSDKError("not_found:chat", "Chat not found");
  }

  if (chat.userId !== session.user.id) {
    throw new ChatSDKError(
      "forbidden:chat",
      "This chat belongs to another user",
    );
  }

  if (!goalTitle.trim()) {
    throw new ChatSDKError("bad_request:goal", "Goal title cannot be empty");
  }

  if (steps.length === 0) {
    throw new ChatSDKError("bad_request:goal", "At least one step is required");
  }

  try {
    const result = await createGoalWithSteps({
      chatId,
      userId: session.user.id,
      title: goalTitle.trim(),
      description: goalDescription?.trim() ?? null,
      createdFromMessageId: messageId,
      steps: steps.map((step) => ({
        title: step.title.trim(),
        order: step.order,
      })),
    });

    return result;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError("bad_request:database", "Failed to create goal");
  }
}

export async function updateStepStatus({ stepId }: { stepId: string }) {
  const session = await auth();

  if (!session?.user) {
    throw new ChatSDKError("unauthorized:chat", "You must be signed in");
  }

  try {
    await toggleStepCompletion({ id: stepId });
    return { success: true };
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update step status",
    );
  }
}

export async function editStep({
  stepId,
  title,
}: {
  stepId: string;
  title: string;
}) {
  const session = await auth();

  if (!session?.user) {
    throw new ChatSDKError("unauthorized:chat", "You must be signed in");
  }

  if (!title.trim()) {
    throw new ChatSDKError("bad_request:goal", "Step title cannot be empty");
  }

  try {
    await updateStep({ id: stepId, title: title.trim() });
    return { success: true };
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError("bad_request:database", "Failed to update step");
  }
}

export async function deleteStepAction({ stepId }: { stepId: string }) {
  const session = await auth();

  if (!session?.user) {
    throw new ChatSDKError("unauthorized:chat", "You must be signed in");
  }

  try {
    await deleteStep({ id: stepId });
    return { success: true };
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError("bad_request:database", "Failed to delete step");
  }
}
