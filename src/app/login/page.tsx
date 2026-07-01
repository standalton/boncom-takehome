/**
 * login/page.tsx — sign-in screen.
 *
 * What:        Email/password sign-in plus one-tap demo login for the three
 *              seeded users, so the app can be demoed without typing. The
 *              password field has a show/hide toggle to catch typos.
 * Where used:  The /login route (unauthenticated entry point).
 */
"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_PASSWORD = "Demo!2026";
const demoUsers = [
  { name: "Sarah", email: "sarah@kwikquote.app" },
  { name: "Mike", email: "mike@kwikquote.app" },
  { name: "Alex", email: "alex@kwikquote.app" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, start] = useTransition();

  function attempt(e: string, p: string) {
    start(async () => {
      const res = await signIn(e, p);
      if (res && res.ok === false) toast.error(res.error);
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-primary">kwik-quote</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quick, accurate client quotes.
          </p>
        </div>

        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            attempt(email, password);
          }}
          className="space-y-4 rounded-lg border bg-card p-6 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-2.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-6">
          <p className="mb-2 text-center text-xs text-muted-foreground">
            Demo — one-tap sign in
          </p>
          <div className="flex justify-center gap-2">
            {demoUsers.map((u) => (
              <Button
                key={u.email}
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => attempt(u.email, DEMO_PASSWORD)}
              >
                {u.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
