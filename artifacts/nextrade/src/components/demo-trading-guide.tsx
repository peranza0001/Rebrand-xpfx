import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BookOpen, Play, Target, TrendingUp, Zap, CheckCircle2, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DemoTradingGuide() {
  const beginnerSteps = [
    {
      number: 1,
      title: "Choose Your Market",
      description: "Select from Forex pairs, Cryptocurrencies, Commodities, or Indices",
      icon: Target,
    },
    {
      number: 2,
      title: "Analyze the Chart",
      description: "Study price action, support/resistance levels, and technical indicators",
      icon: TrendingUp,
    },
    {
      number: 3,
      title: "Place an Order",
      description: "Click Buy (Long) or Sell (Short) with your desired position size",
      icon: Zap,
    },
    {
      number: 4,
      title: "Monitor Position",
      description: "Watch your P&L in real-time and learn from market movements",
      icon: Play,
    },
  ];

  const paidClasses = [
    {
      title: "Forex Fundamentals",
      price: "$49.99",
      duration: "4 weeks",
      lessons: 16,
      level: "Beginner",
      description: "Learn currency pairs, market structure, and basic trading strategies",
      benefits: [
        "Understanding currency correlations",
        "Reading economic calendars",
        "Entry and exit strategies",
        "Risk management fundamentals",
        "Live trading webinars",
      ],
    },
    {
      title: "Advanced Technical Analysis",
      price: "$99.99",
      duration: "6 weeks",
      lessons: 24,
      level: "Intermediate",
      description: "Master candlestick patterns, indicators, and price action analysis",
      benefits: [
        "Advanced chart patterns",
        "Indicator combination strategies",
        "Market structure analysis",
        "Elliott Wave basics",
        "One-on-one mentoring sessions",
      ],
    },
    {
      title: "Professional Trading Psychology",
      price: "$149.99",
      duration: "8 weeks",
      lessons: 32,
      level: "Advanced",
      description: "Develop winning trader mindset and emotional discipline",
      benefits: [
        "Overcoming trading fear and greed",
        "Building consistent trading plans",
        "Psychological resilience techniques",
        "Journal review with mentors",
        "Private trader community access",
      ],
    },
  ];

  const demoLimits = [
    { label: "Starting Balance", value: "$10,000 USD", icon: "💰" },
    { label: "Position Size", value: "Up to $2,500", icon: "📊" },
    { label: "Available Leverage", value: "1:10", icon: "⚡" },
    { label: "Trading Hours", value: "24/5", icon: "⏰" },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Demo Trading Quick Start Guide
          </CardTitle>
          <CardDescription>
            Master paper trading in 4 simple steps — no risk, real learning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {beginnerSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative">
                  <div className="rounded-lg border border-border p-4 bg-muted/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        {step.number}
                      </div>
                      <Icon className="h-5 w-5 text-primary opacity-50" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{step.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                    </div>
                  </div>
                  {step.number < 4 && (
                    <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Demo Account Specifications */}
          <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 space-y-3">
            <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">Demo Account Specifications</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {demoLimits.map((limit) => (
                <div key={limit.label} className="text-center">
                  <div className="text-2xl mb-1">{limit.icon}</div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold">{limit.label}</p>
                  <p className="text-sm font-bold text-blue-900 dark:text-blue-50 mt-1">{limit.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Learning Points */}
          <div className="mt-6 space-y-3">
            <h4 className="font-semibold text-sm">🎯 Key Learning Points</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Market Volatility</p>
                  <p className="text-muted-foreground text-xs">Experience real market price movements</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Risk Management</p>
                  <p className="text-muted-foreground text-xs">Learn position sizing and stop-loss placement</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Trading Psychology</p>
                  <p className="text-muted-foreground text-xs">Understand emotional trading patterns</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Strategy Testing</p>
                  <p className="text-muted-foreground text-xs">Test ideas without financial risk</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paid Trading Classes */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            Premium Trading Education
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Level up your skills with structured courses from professional traders
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {paidClasses.map((course, index) => (
            <Card key={index} className={index === 1 ? "border-primary shadow-lg" : ""}>
              {index === 1 && (
                <div className="bg-primary text-primary-foreground py-2 px-4 text-center text-sm font-semibold">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <Badge className="mt-2" variant={course.level === "Beginner" ? "secondary" : "default"}>
                      {course.level}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{course.price}</div>
                    <p className="text-xs text-muted-foreground">{course.duration}</p>
                  </div>
                </div>
                <CardDescription className="mt-2">{course.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4" />
                  <span>{course.lessons} lessons & modules</span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">What you'll learn:</p>
                  <ul className="space-y-2">
                    {course.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link href={`/education?course=${index}`}>
                  <Button className="w-full" variant={index === 1 ? "default" : "outline"}>
                    Enroll Now
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* When to Move to Live Trading */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Ready for Real Money? Let's Check Your Readiness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="checklist" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="checklist">Progression Checklist</TabsTrigger>
              <TabsTrigger value="comparison">Demo vs Live</TabsTrigger>
            </TabsList>

            <TabsContent value="checklist" className="space-y-3">
              {[
                "Complete at least 50 demo trades",
                "Achieve 55%+ win rate in demo",
                "Go 2 weeks with positive returns",
                "Develop a written trading plan",
                "Pass a risk management quiz",
                "Complete at least 1 paid course",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-green-600 flex items-center justify-center text-sm">
                    <span className="text-green-600">✓</span>
                  </div>
                  <p className="text-sm text-green-900 dark:text-green-100">{item}</p>
                </div>
              ))}

              <div className="mt-4 p-3 bg-green-100 dark:bg-green-900 rounded-lg border border-green-300 dark:border-green-700">
                <p className="text-sm text-green-900 dark:text-green-100">
                  <strong>💡 Pro Tip:</strong> Most successful traders complete 3-6 months of demo trading before going live. Take your time!
                </p>
              </div>
            </TabsContent>

            <TabsContent value="comparison" className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-green-300 dark:border-green-700">
                      <th className="text-left py-2 px-2 font-semibold text-green-900 dark:text-green-100">Feature</th>
                      <th className="text-left py-2 px-2 font-semibold text-green-900 dark:text-green-100">Demo</th>
                      <th className="text-left py-2 px-2 font-semibold text-green-900 dark:text-green-100">Live</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Capital Risk", "None", "Real money"],
                      ["Price Execution", "Simulation", "Real markets"],
                      ["Spreads & Fees", "Reduced", "Full"],
                      ["Slippage", "Minimal", "Possible"],
                      ["Emotional Pressure", "Low", "High"],
                      ["Learning Curve", "Fast", "Slower"],
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-green-200 dark:border-green-800">
                        <td className="py-2 px-2 font-medium text-green-900 dark:text-green-100">{row[0]}</td>
                        <td className="py-2 px-2 text-green-800 dark:text-green-200">{row[1]}</td>
                        <td className="py-2 px-2 text-green-800 dark:text-green-200">{row[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
