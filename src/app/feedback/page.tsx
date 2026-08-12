import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { FeedbackForm } from "./feedback-form";

export default async function FeedbackPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-16">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
        Send feedback
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Bug, idea, or just a thought — it goes straight to the team running
        The Gauntlet.
      </p>
      <div className="mt-6">
        <FeedbackForm />
      </div>
    </div>
  );
}
