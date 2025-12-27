import { auth } from "@/app/(auth)/auth";
import { deleteStep, updateStep } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is required",
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const body = await request.json();
    const { title, isCompleted } = body;

    if (title !== undefined && !title.trim()) {
      return new ChatSDKError(
        "bad_request:goal",
        "Step title cannot be empty",
      ).toResponse();
    }

    await updateStep({
      id,
      title,
      isCompleted,
    });

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:database",
      "Failed to update step",
    ).toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is required",
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    await deleteStep({ id });

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:database",
      "Failed to delete step",
    ).toResponse();
  }
}
