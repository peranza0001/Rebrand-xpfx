import { useState } from "react";
import { useLocation } from "wouter";
import {
  useLogin,
  useGetAdminProvisioningStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, Loader2, AlertTriangle } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const loginMutation = useLogin();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: provisioning } = useGetAdminProvisioningStatus();

  const clearErrors = () => {
    setEmailError("");
    setPasswordError("");
    setFormError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    try {
      const result = await loginMutation.mutateAsync({
        data: { email, password },
      });
      // Successful credential checks return an authenticated session.
      if ("status" in result && result.status === "authenticated") {
        if (result.role !== "admin") {
          setFormError("This account does not have admin access.");
          return;
        }
        await qc.invalidateQueries();
        navigate("/");
        return;
      }
      // OTP path — non-admin user. Block access to the admin portal.
      setFormError(
        "This account is not an administrator. The admin portal is restricted to authorized staff.",
      );
    } catch (err) {
      // Try to extract structured `{ error, code, field }` from the API.
      let code: string | undefined;
      let field: string | undefined;
      let message = "Sign in failed. Please try again.";
      const anyErr = err as {
        response?: { data?: { error?: string; code?: string; field?: string } };
        message?: string;
      };
      const data = anyErr?.response?.data;
      if (data) {
        code = data.code;
        field = data.field;
        if (data.error) message = data.error;
      } else if (anyErr?.message) {
        message = anyErr.message;
      }

      if (message.includes("Invalid email or password") || code === "invalid_credentials") {
        setFormError("We could not sign you in. Please verify your email and password, or create a new account if needed.");
      } else if (code === "email_not_found" || field === "email") {
        setEmailError(message || "No account found for that email.");
      } else if (code === "wrong_password" || field === "password") {
        setPasswordError(message || "Incorrect password.");
      } else {
        setFormError(message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <Shield className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">XpressPro FX</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Admin Portal — Restricted Access
          </p>
        </div>

        {provisioning && !provisioning.provisioned && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2.5 text-yellow-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="text-xs leading-relaxed">
              <p className="font-semibold">Admin not provisioned</p>
              <p className="mt-0.5 text-yellow-200/80">
                Set the <code className="font-mono">ADMIN_EMAIL</code> and{" "}
                <code className="font-mono">ADMIN_PASSWORD</code> secrets, then
                restart the API server.
              </p>
            </div>
          </div>
        )}

        <div className="bg-card border border-card-border rounded-xl p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Admin Email
              </label>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                placeholder="admin@example.com"
                required
                aria-invalid={emailError ? true : undefined}
                className={`w-full px-3 py-2 bg-input border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${emailError ? "border-destructive" : "border-border"}`}
              />
              {emailError && (
                <p className="mt-1 text-xs text-destructive">{emailError}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                placeholder="••••••••"
                required
                aria-invalid={passwordError ? true : undefined}
                className={`w-full px-3 py-2 bg-input border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${passwordError ? "border-destructive" : "border-border"}`}
              />
              {passwordError && (
                <p className="mt-1 text-xs text-destructive">{passwordError}</p>
              )}
            </div>

            {formError && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-md px-3 py-2">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loginMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Sign In
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Authorized administrators only. All activity is logged.
        </p>
      </div>
    </div>
  );
}
