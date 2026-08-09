import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLogin, useStartDemoSession, getGetSessionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [location, setLocation] = useLocation();
  const queryParams = new URLSearchParams(location.split("?")[1]);
  const isDemoLanding = queryParams.get("demo") === "1";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useLogin();
  const demoMutation = useStartDemoSession();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await loginMutation.mutateAsync({
        data: { email, password },
      });
      // Successful credential checks now create a session immediately.
      if (result.status === "authenticated") {
        queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
        toast({ title: "Welcome back" });
        setLocation("/");
        return;
      }
      toast({
        title: "Check your email",
        description: result.message,
      });
      setLocation(
        `/verify-otp?email=${encodeURIComponent(result.email)}&intent=login`,
      );
    } catch (error: unknown) {
      const anyErr = error as {
        message?: string;
        response?: { data?: { error?: string; code?: string; field?: string } };
      };
      const data = anyErr?.response?.data;
      const description = data?.error || anyErr?.message || "Please check your credentials and try again.";
      toast({
        title: "Login failed",
        description,
        variant: "destructive",
      });
    }
  };

  const handleDemo = async () => {
    try {
      await demoMutation.mutateAsync();
      queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Demo start failed",
        description: error.message || "Could not start demo session.",
        variant: "destructive",
      });
    }
  };

  const showDemoButton = true;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 dark">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-8">
          <img
            src="/logo.jpeg"
            alt="XpressPro FX"
            className="h-20 w-auto mx-auto mb-4 rounded-xl object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <h1 className="text-3xl font-bold text-primary tracking-tight">XpressPro FX</h1>
          <p className="text-muted-foreground mt-2">Sign in to your trading account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Enter your credentials to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Sign In
              </Button>
            </form>

            {showDemoButton ? (
              <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                <div className="font-medium text-primary">
                  {isDemoLanding ? "Ready for demo trading" : "Need a quick demo account?"}
                </div>
                <p className="mt-2">
                  {isDemoLanding
                    ? "Click Try Demo Account to launch your seeded demo session instantly."
                    : "Use the demo credentials below or tap Try Demo Account to start a demo session with pre-funded balances."}
                </p>
                {!isDemoLanding && (
                  <p className="mt-2">
                    <span className="font-medium">Email:</span> demo@xpressprofx.com<br />
                    <span className="font-medium">Password:</span> demo-password
                  </p>
                )}
              </div>
            ) : null}

            {showDemoButton ? (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  type="button"
                  className="w-full"
                  onClick={handleDemo}
                  disabled={demoMutation.isPending}
                >
                  {demoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Try Demo Account
                </Button>
              </>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <div className="text-sm text-center text-muted-foreground w-full">
              <Link href="/forgot-password" className="text-primary hover:underline">
                Forgot your password?
              </Link>
            </div>
            <div className="text-sm text-center text-muted-foreground w-full">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
