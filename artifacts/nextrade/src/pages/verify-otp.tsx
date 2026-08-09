// /verify-otp — 6-digit OTP step for signup and login. On success, redirects
// to the mandatory connect-wallet interstitial.
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useVerifyOtp,
  useResendOtp,
  getGetSessionQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";

const RESEND_COOLDOWN_SECONDS = 30;

function useQueryParams(): URLSearchParams {
  const [location] = useLocation();
  // wouter's useLocation only returns the path; pull search from window.
  return useMemo(() => {
    const search = typeof window === "undefined" ? "" : window.location.search;
    return new URLSearchParams(search);
  }, [location]);
}

export function VerifyOtp() {
  const params = useQueryParams();
  const email = params.get("email") ?? "";
  const intent = (params.get("intent") as "signup" | "login" | null) ?? "login";

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const verify = useVerifyOtp();
  const resend = useResendOtp();

  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  // If the page was opened directly without an email param, send the user
  // back to the appropriate auth screen rather than letting them get stuck.
  useEffect(() => {
    if (!email) {
      setLocation(intent === "signup" ? "/signup" : "/login");
    }
  }, [email, intent, setLocation]);

  // Tick the resend cooldown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length !== 6) {
      toast({
        title: "Enter all 6 digits",
        description: "Your verification code should be 6 digits long.",
        variant: "destructive",
      });
      return;
    }
    try {
      await verify.mutateAsync({ data: { email, code } });
      // Refresh the session so the rest of the app sees the new cookie.
      await queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
      toast({
        title: intent === "signup" ? "Account created" : "Welcome back",
        description: "You've been signed in successfully.",
      });
      // Send everyone through the mandatory wallet interstitial. The page
      // itself will short-circuit if the user already has a wallet (e.g. a
      // returning login from a user who connected previously).
      setLocation("/connect-wallet");
    } catch (err: unknown) {
      const anyErr = err as { message?: string; response?: { data?: { error?: string } } };
      const message = anyErr.response?.data?.error || (err instanceof Error ? err.message : "Invalid or expired code.");
      toast({ title: "Verification failed", description: message, variant: "destructive" });
    }
  };

  const handleResend = async () => {
    try {
      const challenge = await resend.mutateAsync({ data: { email } });
      toast({ title: "New code sent", description: challenge.message });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not resend code.";
      toast({ title: "Resend failed", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 dark">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <Mail className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Check your email</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">{email || "your inbox"}</span>.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enter verification code</CardTitle>
            <CardDescription>
              The code expires in 10 minutes. Don't share it with anyone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(v) => setCode(v.replace(/\D/g, ""))}
                  data-testid="input-otp"
                  autoFocus
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={verify.isPending || code.length !== 6}
                data-testid="button-verify-otp"
              >
                {verify.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Verify and continue
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Didn't get a code?{" "}
              <Button
                variant="link"
                className="px-1 h-auto"
                onClick={handleResend}
                disabled={cooldown > 0 || resend.isPending}
                data-testid="button-resend-otp"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : resend.isPending ? "Sending…" : "Resend code"}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-muted-foreground">
            Wrong email?{" "}
            <Link
              href={intent === "signup" ? "/signup" : "/login"}
              className="text-primary hover:underline ml-1"
            >
              Start over
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
