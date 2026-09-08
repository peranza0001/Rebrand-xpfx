/**
 * Public Contact page
 * -------------------
 * Contact form (front-end only — submission is simulated with a toast),
 * plus office locations and live channels.
 */
import { useState } from "react";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export function PublicContact() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      (e.currentTarget as HTMLFormElement).reset();
      toast({ title: "Message received", description: "Our support team will reply within 24 hours." });
    }, 600);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 grid lg:grid-cols-2 gap-10">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Talk to us</h1>
        <p className="mt-2 text-muted-foreground">
          Questions about your account, the platform, or partnerships? Pick the channel that works for you.
        </p>

        <div className="mt-8 space-y-3">
          {[
            { icon: Mail, title: "Email", value: "support@xpressprofx.com" },
            { icon: Phone, title: "Phone (24/7)", value: "+1 (800) 555-0199" },
            { icon: MessageCircle, title: "Live chat", value: "Available in your dashboard" },
          ].map(({ icon: Icon, title, value }) => (
            <Card key={title}>
              <CardContent className="p-4 flex items-center gap-3">
                <span className="h-9 w-9 rounded-md bg-primary/15 text-primary flex items-center justify-center">
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
          <h2 className="font-semibold mb-3">Our offices</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {OFFICES.map((o) => (
              <Card key={o.city}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5" />
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

      <Card className="self-start">
        <CardContent className="p-6">
          <h2 className="font-semibold text-lg mb-4">Send us a message</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" required data-testid="input-contact-name" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required data-testid="input-contact-email" />
              </div>
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" required data-testid="input-contact-subject" />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" rows={5} required data-testid="input-contact-message" />
            </div>
            <Button type="submit" className="w-full" disabled={submitting} data-testid="button-contact-submit">
              {submitting ? "Sending…" : "Send message"}
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
