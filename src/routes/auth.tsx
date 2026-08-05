import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Prisijungimas | Rentivo" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") return;
      if (session) navigate({ to: "/admin" });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Prisijungta");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Slaptažodžio atstatymo nuoroda išsiųsta į el. paštą.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Klaida");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-5">
          <div>
            <h1 className="text-2xl font-bold">
              {mode === "login" ? "Prisijungimas" : "Slaptažodžio atstatymas"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "forgot"
                ? "Įvesk el. paštą — atsiųsime nuorodą naujam slaptažodžiui nustatyti."
                : "Prieiga tik pakviestiems vartotojams."}
            </p>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">El. paštas</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <Label htmlFor="pw">Slaptažodis</Label>
                <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Vykdoma..." : mode === "login" ? "Prisijungti" : "Siųsti nuorodą"}
            </Button>
          </form>
          <div className="text-sm text-center text-muted-foreground space-y-2">
            {mode === "login" && (
              <div>
                <button type="button" className="underline" onClick={() => setMode("forgot")}>
                  Pamiršai slaptažodį?
                </button>
              </div>
            )}
            {mode === "forgot" && (
              <button type="button" className="underline" onClick={() => setMode("login")}>
                ← Atgal į prisijungimą
              </button>
            )}
          </div>
          <div className="text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:underline">← Į pradžią</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
