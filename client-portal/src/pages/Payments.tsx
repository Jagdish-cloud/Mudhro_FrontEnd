import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

const Payments = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/auth/signin");
      return;
    }
  }, [navigate]);

  return (
    <AppShell>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Construction className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Under Construction</h2>
            <p className="text-muted-foreground">
              The Payments section is currently under construction. We're working hard to bring you this feature soon!
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
};

export default Payments;
