import { listUsers } from "@/lib/db/platform";

export default async function OwnerUsersPage() {
  const users = await listUsers();

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
        Users
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">{users.length} total</p>

      <div className="mt-6 flex flex-col gap-2">
        {users.map((u) => (
          <div key={u.id} className="glass-card flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p>{u.name}</p>
              <p className="text-foreground-muted">{u.email}</p>
            </div>
            <span className={u.role === "platform_owner" ? "text-gold" : "text-foreground-muted"}>
              {u.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
