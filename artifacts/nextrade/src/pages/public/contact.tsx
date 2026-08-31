/**
 * Public Contact page
 * -------------------
 * Contact form backed by the authenticated support-ticket API,
 * plus office locations and live channels.
 */
import { useState } from "react";
import { Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiPath } from "@/lib/api-url";
import { useAuth } from "@/lib/auth";

export function PublicContact() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast({ title: "Sign in required", description: "Sign in to submit a support ticket, or use live chat for general questions.", variant: "destructive" });
      return;
    }

    const form = e.currentTarget;
    const values = new FormData(form);
    setSubmitting(true);
    try {
      const response = await fetch(apiPath("/api/support/tickets"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: String(values.get("subject") ?? "").trim(),
          message: String(values.get("message") ?? "").trim(),
          priority: "medium",
        }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "We could not submit your support ticket.");
      form.reset();
      toast({ title: "Message received", description: "Your support ticket was created and is available in Support." });
    } catch (error) {
      toast({ title: "Message not sent", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <header className="rounded-3xl border border-border/80 bg-linear-to-br from-primary/10 via-card to-card p-6 md:p-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Talk to us</h1>
          <p className="mt-2 text-muted-foreground text-lg">
            Questions about your account, the platform, or partnerships? Pick the channel that works for you.
          </p>
        </header>

        <div className="mt-8 space-y-3">
          {[
            { icon: Mail, title: "Email", value: "support@xpressprofx.com" },
            { icon: Phone, title: "Phone (24/7)", value: "+1 (800) 555-0199" },
            { icon: MessageCircle, title: "Live chat", value: "Available in your dashboard" },
          ].map(({ icon: Icon, title, value }) => (
            <Card key={title} className="border-border/80 bg-card/80">
              <CardContent className="flex items-center gap-3 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-xs text-muted-foreground">{title}</div>
                  <div className="font-medium">{value}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <h2 className="mb-3 font-semibold">Our offices</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {OFFICES.map((o) => (
              <Card key={o.city} className="border-border/80 bg-card/80">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <div className="font-semibold">{o.city}</div>
                      <div className="text-xs text-muted-foreground">{o.address}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Card className="self-start border-border/80 bg-card/80 shadow-lg shadow-primary/5">
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Send us a message</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required data-testid="input-contact-name" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required data-testid="input-contact-email" />
              </div>
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" name="subject" required data-testid="input-contact-subject" />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" name="message" rows={5} required data-testid="input-contact-message" />
            </div>
            <Button type="submit" className="w-full" disabled={submitting} data-testid="button-contact-submit">
              {submitting ? "Sending…" : <><Send className="mr-2 h-4 w-4" /> Send message</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

const OFFICES = [
  { city: "London", address: "1 King William St, EC4N 7AF" },
  { city: "New York", address: "200 Vesey St, Floor 24, NY 10281" },
  { city: "Singapore", address: "10 Marina Blvd, Tower 2, #38-01" },
  { city: "Dubai", address: "DIFC Gate Village 10, Level 3" },
];
