import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { authService } from "@/lib/auth";
import COUNTRY_OPTIONS from "@/lib/countryCodes";
import { getCurrencyFromCountry, getAvailableCurrencies, Currency, ALL_CURRENCIES } from "@/lib/currency";
import { Combobox } from "@/components/ui/combobox";


const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState<string>("IN"); // Preselected country: India
  const [dialCode, setDialCode] = useState<string>("+91");
  const [mobile, setMobile] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onCountryChange = (code: string) => {
    setCountry(code);
    const opt = COUNTRY_OPTIONS.find((c) => c.code === code);
    setDialCode(opt?.dial_code || "");
    // Auto-update currency based on country
    const newCurrency = getCurrencyFromCountry(code);
    setCurrency(newCurrency);
  };

  const handleLogoChange = (file: File | null) => {
    if (!file) {
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mobile || mobile.replace(/\D/g, "").length < 6) {
      toast.error("Please enter a valid mobile number.");
      return;
    }

    setLoading(true);

    try {
      // Format mobile number with dial code
      const mobileNumber = dialCode && mobile ? `${dialCode}${mobile.trim()}` : undefined;
      
      const payload = {
        fullName: name.trim(),
        email: email.trim(),
        password,
        country: country || undefined,
        mobileNumber: mobileNumber,
        gstin: gstin.trim() || undefined,
        pan: pan.trim() || undefined,
        currency: currency,
        logoFile,
      };

      const result = await authService.signUp(payload);

      if (result?.success) {
        toast.success("Account created successfully!");
        navigate("/auth/verify-email");
      } else {
        toast.error(result?.error || "Sign up failed");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <Link to="/">
            <h1 className="text-3xl font-bold text-foreground">Mudhro</h1>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Sign up to get started with Mudhro</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <select
                    id="country"
                    value={country}
                    onChange={(e) => onCountryChange(e.target.value)}
                    className="block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none"
                    required
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <div className="flex">
                  <select
                    aria-label="country dial code"
                    value={dialCode}
                    onChange={(e) => setDialCode(e.target.value)}
                    className="rounded-l-md border border-r-0 border-input px-3 py-2 text-sm"
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.dial_code}>
                        {c.code} {c.dial_code}
                      </option>
                    ))}
                  </select>

                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="1234567890"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                    className="rounded-none rounded-r-md"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll use this number for verification and contact.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gstin">GSTIN (optional)</Label>
                  <Input
                    id="gstin"
                    type="text"
                    placeholder="15 character GSTIN"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pan">PAN (optional)</Label>
                  <Input
                    id="pan"
                    type="text"
                    placeholder="ABCDE1234F"
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Combobox
                  options={getAvailableCurrencies().map((curr) => ({
                    value: curr.code,
                    label: `${curr.code} - ${curr.name} (${curr.symbol})`,
                  }))}
                  value={currency}
                  onValueChange={(value) => setCurrency(value as Currency)}
                  placeholder="Select currency..."
                  searchPlaceholder="Search currency by name or code..."
                  emptyMessage="No currency found."
                />
                <p className="text-xs text-muted-foreground">
                  Currency is automatically set based on your country, but you can change it if needed.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Logo (optional)</Label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1"
                    >
                      Upload Logo
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
                    />
                    {logoPreview && (
                      <div className="w-14 h-14 rounded-md overflow-hidden border">
                        <img src={logoPreview} alt="logo preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {logoFile && (
                    <div className="text-sm text-muted-foreground">
                      {logoFile.name} • {(logoFile.size / 1024).toFixed(0)} KB
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Sign Up"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/auth/signin" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;
