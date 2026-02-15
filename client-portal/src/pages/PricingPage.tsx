import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  features: string[];
  popular?: boolean;
  comingSoon?: boolean;
  teaser?: string;
}

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 149,
    features: ["Create unlimited invoices", "Send invoices to clients", "Organise services and payments", "Invoices paid/pending/overdue"],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 349,
    features: ["Everything in Starter", "Record expenses", "Automated Invoice Emails", "Monthly earnings summary"],
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    priceMonthly: 999,
    features: ["GST filing and registrtion", "Priority support", "Advanced summary reports", "AI invoice creation"],
    comingSoon: true,
  },
];

type Currency = "INR" | "USD";

const FIXED_USD_MONTHLY: Record<string, number> = {
  starter: 4.99,
  pro: 9.99,
  premium: 3,
};

const PriceCard: React.FC<{
  plan: Plan;
  currency: Currency;
}> = ({ plan, currency }) => {
  const priceInINR = plan.priceMonthly;
  const periodLabel = "/month";

  const formatPrice = () => {
    if (currency === "INR") {
      return `₹${priceInINR}`;
    } else {
      const usd = FIXED_USD_MONTHLY[plan.id] ?? 0;
      return `$${usd}`;
    }
  };

  return (
    <Card className={`relative shadow-md hover:shadow-lg transition-shadow duration-200 ${plan.popular ? "border-2 border-primary" : ""} ${plan.comingSoon ? "opacity-95 border-dashed border-gray-200" : ""}`}>
      {/* Coming soon ribbon */}
      {plan.comingSoon && (
        <div className="absolute -top-3 right-3 bg-gradient-to-r from-primary to-indigo-600 text-white text-xs px-3 py-1 rounded-full shadow-lg">
          Coming Soon
        </div>
      )}

      {/* 1 month free ribbon */}
      {plan.popular && !plan.comingSoon && (
        <div className="absolute -top-3 right-3 bg-gradient-to-r from-primary to-indigo-600 text-white text-xs px-3 py-1 rounded-full shadow-lg">
          1 month free!
        </div>
      )}

      <CardHeader className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{plan.name}</CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">
              {plan.popular ? "Most popular: Free for initial 1 month!" : plan.comingSoon ? "Premium features coming soon!" : "For independent freelancers"}
            </CardDescription>
          </div>
          {plan.popular && !plan.comingSoon && (
            <div className="flex items-center gap-2 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
              <Star className="w-4 h-4" /> Popular
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-0 border-t">
        {/* Price area */}
        <div className="mb-6">
          {!plan.comingSoon ? (
            <>
              <div className="flex items-end gap-2">
                <div className="text-4xl font-extrabold">{formatPrice()}</div>
                <div className="text-sm text-muted-foreground">{periodLabel}</div>
              </div>
            </>
          ) : (
            <div>
              <div className="text-2xl font-extrabold">GST Registration & Filing</div>
            </div>
          )}
        </div>

        {/* Features */}
        <ul className={`mb-6 space-y-3 ${plan.comingSoon ? "opacity-100 blur-[4px]" : ""}`}>
          {plan.features.map((f) => (
            <li key={f} className="flex items-center gap-3">
              <span className={`flex items-center justify-center w-6 h-6 rounded-full ${plan.comingSoon ? "bg-muted" : "bg-primary/10"}`}>
                <Check className={`w-4 h-4 ${plan.comingSoon ? "text-muted-foreground" : ""}`} />
              </span>
              <span className={`text-sm transition-[padding] duration-300 ease-in-out hover:pl-2 ${plan.comingSoon ? "text-foreground" : ""}`}>{f}</span>
            </li>
          ))}
        </ul>

        {/* CTA area */}
        <div className="flex flex-col gap-3">
          {!plan.comingSoon ? (
            <Link to="/auth/signup" className="w-full">
              <Button className="w-full">Start Free Trial</Button>
            </Link>
          ) : (
            <Button variant="outline" className="w-full">Notify me</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const PricingPage: React.FC = () => {
  // currency state (INR for India, USD for others)
  const [currency, setCurrency] = useState<Currency>("INR");

  useEffect(() => {
    // Determine user's timezone from browser
    let timeZone: string | undefined;
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      timeZone = undefined;
    }

    const indiaTimeZones = new Set(["Asia/Kolkata", "Asia/Calcutta"]);
    const isIndia = timeZone ? indiaTimeZones.has(timeZone) : false;

    setCurrency(isIndia ? "INR" : "USD");
  }, []);

  return (
    <>
      <header>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Mudhro</h1>
          <nav className="flex items-center gap-4">
            <Link to="/" className="text-foreground hover:text-primary">Home</Link>
            <Link to="/auth/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
          </nav>
        </div>
      </header>

      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground">&lt; Simple pricing based on your needs &gt;</h1>
            <p className="mt-4 text-muted-foreground">Choose a plan that fits how you work — change or cancel anytime.</p>
          </div>

          {/* Cards grid */}
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-3">
            {plans.map((p) => (
              <PriceCard key={p.id} plan={p} currency={currency} />
            ))}
          </div>

          {/* Comparison / small note */}
          <p className="text-xs text-muted-foreground text-center mt-8">All prices shown in {currency === "INR" ? "INR" : "USD"}. Taxes may apply.</p>
        </div>
      </div>
    </>
  );
};

export default PricingPage;
