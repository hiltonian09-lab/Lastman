import { listLeagues } from "@/lib/db/leagues";
import { OfficialGameForm } from "./official-game-form";

export default async function NewOfficialGamePage() {
  const leagues = await listLeagues();

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
        New official game
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Visible to every user on the platform, joinable by anyone, no admin
        fee — this is the platform&rsquo;s own game, not a paid hosting slot.
      </p>

      <div className="mt-6">
        <OfficialGameForm leagues={leagues} />
      </div>
    </div>
  );
}
