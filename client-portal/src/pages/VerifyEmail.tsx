import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";

const VerifyEmail = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/">
            <h1 className="text-3xl font-bold text-foreground">Mudhro</h1>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-center">Verify Your Email</CardTitle>
            <CardDescription className="text-center">
              We've sent a verification link to your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-6">
              Click the link in your email to verify your account and get started.
            </p>
            <Link to="/dashboard">
              <Button className="w-full">Continue to Dashboard</Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">
              Didn't receive the email?{" "}
              <button className="text-primary hover:underline">Resend</button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;
