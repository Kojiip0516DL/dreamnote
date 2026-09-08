"use server";
// Server action wrapper for Auth.js v5 signIn.
// Auth.js v5 forbids calling signIn() from an inline arrow function in
// <form action={...}> because those actions are too narrow — the library
// validates the call site. Use a dedicated server action file with the
// "use server" directive at the top of the module.
import { signIn, signOut } from "@/auth";

export async function signInDiscord() {
  await signIn("discord", { redirectTo: "/app" });
}

export async function signOutUser() {
  await signOut({ redirectTo: "/" });
}