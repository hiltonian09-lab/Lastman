import { Suspense } from "react";
import { JoinForm } from "./join-form";

export default function JoinPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 py-16">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
        Join a game
      </h1>
      <Suspense fallback={null}>
        <JoinForm />
      </Suspense>
    </div>
  );
}
