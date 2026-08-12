"use server";

import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { createUser, getUserByEmail, syncPlatformOwnerRole } from "@/lib/db/users";

export interface AuthFormState {
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signupAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Enter your name." };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const existing = await getUserByEmail(email);
  if (existing) return { error: "An account with that email already exists." };

  const passwordHash = await hashPassword(password);
  const user = await createUser({ email, name, passwordHash });
  await syncPlatformOwnerRole(user.id, user.email);
  await createSession(user.id);

  redirect("/dashboard");
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const user = await getUserByEmail(email);
  if (!user || !user.password_hash) return { error: "Incorrect email or password." };

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return { error: "Incorrect email or password." };

  await syncPlatformOwnerRole(user.id, user.email);
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
