import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertTriangle, Clock, FileText, Lock, Globe, Download, ExternalLink } from "lucide-react";

interface ComplianceStatus {
  category: string;
  status: "compliant" | "warning" | "pending" | "expired";
  expiryDate?: Date;
  percentage?: number;
  description: string;
}

interface ComplianceDashboardProps {
  status?: ComplianceStatus[];
  kycVerified?: boolean;
  amlStatus?: string;
  accountType?: string;
  regulationText?: string;
}

function getDefaultComplianceStatus(kycVerified: boolean, amlStatus: string): ComplianceStatus[] {
  return [
    {
      category: "Identity verification",
      status: kycVerified ? "compliant" : "pending",
      description: kycVerified ? "Your identity has been verified." : "Complete identity verification to unlock all account features.",
    },
    {
      category: "AML screening",
      status: amlStatus.toLowerCase() === "clear" ? "compliant" : "pending",
      description: amlStatus,
    },
  ];
}

export function ComplianceDashboard({
  status,
  kycVerified = false,
  amlStatus = "Not screened",
  accountType = "Standard",
  regulationText = "Your access depends on completed verification and applicable regulatory requirements.",
}: ComplianceDashboardProps) {
  const complianceStatus = status ?? getDefaultComplianceStatus(kycVerified, amlStatus);
  const compliantCount = complianceStatus.filter((s) => s.status === "compliant").length;
  const compliancePercentage = complianceStatus.length > 0
    ? (compliantCount / complianceStatus.length) * 100
    : 0;

  const getStatusIcon = (statusType: string) => {
    switch (statusType) {
      case "compliant":
        return <CheckCircle className="h-5 w-5 text-emerald-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "expired":
        return <AlertTriangle className="h-5 w-5 text-rose-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (statusType: string) => {
    switch (statusType) {
      case "compliant":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300";
      case "warning":
        return "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300";
      case "pending":
        return "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300";
      case "expired":
        return "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Overall Compliance Score */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Compliance Status
            </span>
            <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
              {compliancePercentage.toFixed(0)}% Compliant
            </Badge>
          </CardTitle>
          <CardDescription>{regulationText}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall Compliance Score</span>
              <span className="font-mono font-bold">{compliancePercentage.toFixed(0)}/100</span>
            </div>
            <Progress value={compliancePercentage} className="h-2" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-sm text-muted-foreground mb-1">KYC Status</div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-sm">
                  {kycVerified ? "Verified" : "Pending"}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-sm text-muted-foreground mb-1">AML Check</div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-sm">{amlStatus}</span>
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-sm text-muted-foreground mb-1">Account Type</div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">{accountType}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Compliance Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance Requirements</CardTitle>
          <CardDescription>Track your compliance with regulatory requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {complianceStatus.map((item) => (
            <div
              key={item.category}
              className={`rounded-lg border p-4 ${getStatusColor(item.status)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(item.status)}
                  <div className="flex-1">
                    <div className="font-semibold">{item.category}</div>
                    <p className="text-sm mt-1 opacity-90">{item.description}</p>
                  </div>
                </div>
                <Badge variant="outline" className="ml-2 shrink-0">
                  {item.status}
                </Badge>
              </div>

              {item.percentage !== undefined && (
                <div className="mt-2 pt-2 border-t border-current/20">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Completion</span>
                    <span className="font-mono">{item.percentage}%</span>
                  </div>
                  <Progress value={item.percentage} className="h-1.5" />
                </div>
              )}

              {item.expiryDate && (
                <div className="mt-2 pt-2 border-t border-current/20 text-xs">
                  Expires: {item.expiryDate.toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Regulatory Information */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { name: "Terms of Service", icon: FileText },
              { name: "Privacy Policy", icon: FileText },
              { name: "Risk Disclosure", icon: AlertTriangle },
              { name: "Regulatory Info", icon: Globe },
            ].map((doc) => (
              <Button
                key={doc.name}
                variant="outline"
                className="w-full justify-between"
                size="sm"
              >
                <span className="flex items-center gap-2">
                  <doc.icon className="h-4 w-4" />
                  {doc.name}
                </span>
                <Download className="h-4 w-4" />
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Regulated By
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                name: "FCA (UK)",
                url: "https://www.fca.org.uk",
                status: "Active",
              },
              {
                name: "CFTC (USA)",
                url: "https://www.cftc.gov",
                status: "Active",
              },
              {
                name: "ASIC (Australia)",
                url: "https://www.asic.gov.au",
                status: "Active",
              },
            ].map((regulator) => (
              <div
                key={regulator.name}
                className="flex items-center justify-between rounded-lg border border-border p-2"
              >
                <div>
                  <div className="font-semibold text-sm">{regulator.name}</div>
                  <div className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="mt-1">
                      {regulator.status}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  asChild
                >
                  <a href={regulator.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Risk Disclosure */}
      <Card className="border-amber-500/30 bg-amber-500/10">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            Important Risk Disclosure
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-700 dark:text-amber-300 space-y-2">
          <p>
            • Trading in financial markets carries substantial risk of loss. This is especially true for leveraged products.
          </p>
          <p>
            • Past performance is not indicative of future results. Your capital is at risk.
          </p>
          <p>
            • Please ensure you understand the risks involved before trading.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 border-amber-500/50 hover:bg-amber-500/10"
          >
            Read Full Risk Disclosure
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

