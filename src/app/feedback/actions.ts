"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { submitFeedback } from "@/lib/db/feedback";

export interface FeedbackFormState {
  error?: string;
  success?: boolean;
}

export async function submitFeedbackAction(
  _prevState: FeedbackFormState,
  formData: FormData,
): Promise<FeedbackFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Write something first." };
  if (message.length > 2000) return { error: "Keep it under 2000 characters." };

  await submitFeedback(user.id, message);
  return { success: true };
}
