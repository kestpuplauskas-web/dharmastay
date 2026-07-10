import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Naujas slaptažodis | Rentivo" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Slaptažodžiai nesutampa");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Slaptažodis atnaujintas");
      navigate({ to: "/admin" });
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
            <h1 className="text-2xl font-bold">Naujas slaptažodis</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {ready
                ? "Įvesk naują slaptažodį."
                : "Atveriama nuoroda... Jei nieko nevyksta, atidaryk nuorodą iš el. laiško dar kartą."}
            </p>
          </div>
          {ready && (
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pw">Naujas slaptažodis</Label>
                <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw2">Pakartok slaptažodį</Label>
                <Input id="pw2" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Atnaujinama..." : "Išsaugoti"}
              </Button>
            </form>
          )}
          <div className="text-center">
            <Link to="/auth" className="text-xs text-muted-foreground hover:underline">← Į prisijungimą</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
