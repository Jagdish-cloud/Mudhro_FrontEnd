import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import COUNTRY_OPTIONS from "@/lib/countryCodes";
import { getAvailableCurrencies, Currency, ALL_CURRENCIES } from "@/lib/currency";
import { Combobox } from "@/components/ui/combobox";
import { Upload, X, Menu } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  DollarSign,
  LogOut,
  Moon,
  Sun,
  Users,
  FolderKanban,
} from "lucide-react";
import { authService } from "@/lib/auth";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/api";
import { getLogoUrl, getLogoUrlSync } from "@/lib/services/fileStorageService";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppShellProps {
  children: ReactNode;
}

const AppShell = ({ children }: AppShellProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const user = authService.getCurrentUser();

  // Close mobile menu when route changes
  useEffect(() => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Update sidebar state based on screen size
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Invoices", href: "/invoices", icon: FileText },
    { name: "Payments", href: "/payments", icon: DollarSign },
    { name: "Expenses", href: "/expenses", icon: Receipt },
    { name: "Projects", href: "/projects", icon: FolderKanban },
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Vendors", href: "/vendors", icon: Users },
  ];

  const handleSignOut = () => {
    authService.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark");
  };

  // profile form state (used in popup)
  const [profileOpen, setProfileOpen] = useState(false);
  // Helper to get logo URL - uses sync method for immediate display, async for fresh SAS URLs
  const getLogoUrlLocal = (logo: string | null | undefined): string | null => {
    return getLogoUrlSync(logo);
  };

  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    country: user?.country ?? "",
    mobileNumber: user?.mobileNumber ?? "",
    gstin: user?.gstin ?? "",
    pan: user?.pan ?? "",
    currency: (user?.currency as Currency) || "INR",
    logoFile: null as File | null,
    logoPreview: getLogoUrlLocal(user?.logo) as string | null,
    logoRemoved: false, // Track if user explicitly removed the logo
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // plan info state
  const [planInfo, setPlanInfo] = useState<{ name: string; expiresAt?: string }>({
    name: (user as any)?.plan?.name ?? (user as any)?.planName ?? (user as any)?.plan ?? "Free",
    expiresAt:
      (user as any)?.planExpires ||
      (user as any)?.planExpiry ||
      (user as any)?.planEndsAt ||
      (user as any)?.plan_end_date ||
      (user as any)?.planExpiresAt ||
      "",
  });

  // helper to compute remaining days from an ISO/parsable date string
  const computeRemainingDays = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const t = Date.parse(expiresAt);
    if (Number.isNaN(t)) return null;
    const now = Date.now();
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = t - now;
    return Math.ceil(diff / msPerDay);
  };

  // Refresh profile form data from authService
  const refreshProfileForm = async () => {
    const u = authService.getCurrentUser();
    
    // Fetch logo URL from Azure Blob Storage if logo exists
    let logoPreview: string | null = null;
    if (u?.logo && u?.id && !profileForm.logoFile) {
      console.log('[AppShell] Fetching logo URL for user:', u.id, 'logo path:', u.logo);
      try {
        logoPreview = await getLogoUrl(u.id);
        console.log('[AppShell] Logo URL fetched:', logoPreview ? 'Success' : 'Failed');
      } catch (error) {
        console.error('[AppShell] Failed to fetch logo URL:', error);
        logoPreview = getLogoUrlLocal(u?.logo);
      }
    }
    
    setProfileForm(prev => ({
      fullName: u?.fullName ?? "",
      email: u?.email ?? "",
      country: u?.country ?? "",
      mobileNumber: u?.mobileNumber ?? "",
      gstin: u?.gstin ?? "",
      pan: u?.pan ?? "",
      currency: (u?.currency as Currency) || "INR",
      logoFile: prev.logoFile, // Keep the file if user is in the middle of selecting one
      logoPreview: prev.logoFile ? prev.logoPreview : logoPreview, // Use blob URL if file selected, otherwise use fetched URL
      logoRemoved: prev.logoRemoved, // Preserve removal flag
    }));
  };

  // Called when popup opens/closes; when opened, refresh form values and plan info from authService
  const onProfileOpenChange = async (open: boolean) => {
    setProfileOpen(open);
    if (open) {
      const u = authService.getCurrentUser();
      
      // Fetch logo URL from Azure Blob Storage if logo exists
      let logoPreview: string | null = null;
      if (u?.logo && u?.id) {
        console.log('[AppShell] Opening profile - fetching logo URL for user:', u.id, 'logo path:', u.logo);
        try {
          logoPreview = await getLogoUrl(u.id);
          console.log('[AppShell] Logo URL fetched:', logoPreview ? 'Success' : 'Failed');
        } catch (error) {
          console.error('[AppShell] Failed to fetch logo URL:', error);
          logoPreview = getLogoUrlLocal(u?.logo);
        }
      }
      
      setProfileForm({
        fullName: u?.fullName ?? "",
        email: u?.email ?? "",
        country: u?.country ?? "",
        mobileNumber: u?.mobileNumber ?? "",
        gstin: u?.gstin ?? "",
        pan: u?.pan ?? "",
        currency: (u?.currency as Currency) || "INR",
        logoFile: null,
        logoPreview: logoPreview,
        logoRemoved: false,
      });

      setPlanInfo({
        name:
          (u as any)?.plan?.name ??
          (u as any)?.planName ??
          (u as any)?.plan ??
          "Free",
        expiresAt:
          (u as any)?.planExpires ||
          (u as any)?.planExpiry ||
          (u as any)?.planEndsAt ||
          (u as any)?.plan_end_date ||
          (u as any)?.planExpiresAt ||
          "",
      });
    }
  };

  // Listen for profile updates to refresh the form
  useEffect(() => {
    const handleProfileUpdate = () => {
      // Only refresh if modal is closed (to avoid interrupting user if they're editing)
      if (!profileOpen) {
        refreshProfileForm();
      }
    };
    
    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    };
  }, [profileOpen]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Logo file size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      setProfileForm(prev => ({
        ...prev,
        logoFile: file,
        logoPreview: URL.createObjectURL(file),
        logoRemoved: false, // Clear removal flag when new file is selected
      }));
    }
  };

  const removeLogo = () => {
    setProfileForm(prev => ({
      ...prev,
      logoFile: null,
      logoPreview: null,
      logoRemoved: true, // Mark that logo was explicitly removed
    }));
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const updatedUser = await authService.updateProfile({
        fullName: profileForm.fullName,
          email: profileForm.email,
        country: profileForm.country || undefined,
        mobileNumber: profileForm.mobileNumber || undefined,
        gstin: profileForm.gstin || undefined,
        pan: profileForm.pan || undefined,
        currency: profileForm.currency,
        logoFile: profileForm.logoFile,
        logo: profileForm.logoRemoved ? null : undefined, // Pass null if logo was explicitly removed
      });
      
      // Update logoPreview with the new logo URL from server (or null if removed)
      // Fetch fresh SAS URL from Azure Blob Storage
      let newLogoPreview: string | null = null;
      if (updatedUser?.logo && updatedUser?.id) {
        try {
          const logoUrl = await getLogoUrl(updatedUser.id);
          newLogoPreview = logoUrl;
        } catch (error) {
          console.error('Failed to fetch logo URL:', error);
          newLogoPreview = getLogoUrlLocal(updatedUser?.logo);
        }
      }
      
      setProfileForm(prev => ({
        ...prev,
        logoPreview: newLogoPreview,
        logoFile: null, // Clear the file since it's been uploaded
        logoRemoved: false, // Clear removal flag after successful save
      }));
      
      toast.success("Profile updated successfully");
      setProfileOpen(false);
      
      // Dispatch custom event to notify other components of profile update
      window.dispatchEvent(new CustomEvent('userProfileUpdated'));
    } catch (err: any) {
      console.error("Failed to save profile", err);
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // remaining days for display
  const remainingDays = computeRemainingDays(planInfo.expiresAt);

  const NavigationContent = () => (
    <nav className="space-y-2">
      {navigation.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link key={item.name} to={item.href} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <Button variant={isActive ? "secondary" : "ghost"} className="w-full justify-start">
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Button>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="flex items-center justify-between px-3 sm:px-4 py-3">
          <div className="flex items-center gap-2 sm:gap-4">
            {isMobile ? (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open menu"
                  className="h-9 w-9"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <SheetContent side="left" className="w-[280px] sm:w-[300px]">
                  <SheetHeader>
                    <SheetTitle>
                      <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center">
                        <img 
                          src={`${API_BASE_URL}/uploads/logos/MudhroSymbol.png`}
                          alt="Mudhro"
                          className="h-8 w-auto object-contain"
                        />
                      </Link>
                      
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <NavigationContent />
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <Button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle sidebar"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}

            <Link to="/dashboard" className="flex items-center">
              <img 
                src={`${API_BASE_URL}/uploads/logos/MudhroSymbol.png`}
                alt="Mudhro"
                className="h-8 sm:h-10 w-auto object-contain"
              />
            </Link>
            <h1 className="text-xl font-bold text-foreground">Mudhro</h1>

          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
              {theme === "light" ? <Moon className="h-4 w-4 sm:h-5 sm:w-5" /> : <Sun className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-sm sm:text-base px-2 sm:px-3">
                  <span className="hidden sm:inline">{user?.fullName || "User"}</span>
                  <span className="sm:hidden">{user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || "U"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Dialog */}
            <Dialog open={profileOpen} onOpenChange={onProfileOpenChange}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                <DialogHeader>
                  <DialogTitle>Profile Settings</DialogTitle>
                  <DialogDescription>
                    Update your profile information. All fields are editable except your plan.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Profile Header */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-4 border-b">
                    <div className="relative">
                      {profileForm.logoPreview ? (
                        <div className="relative">
                          <img
                            src={profileForm.logoPreview}
                            alt="Profile"
                            className="h-20 w-20 rounded-full object-cover border-2 border-border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
                            onClick={removeLogo}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                      </div>
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-2xl border-2 border-border">
                          {(profileForm.fullName || "U").slice(0, 1).toUpperCase()}
                      </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                        onClick={() => logoInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="font-semibold text-base sm:text-lg">{profileForm.fullName || "User"}</p>
                      <p className="text-sm text-muted-foreground">{profileForm.email}</p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))}
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="email@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={profileForm.country}
                        onValueChange={(value) => setProfileForm((p) => ({ ...p, country: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_OPTIONS.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobileNumber">Mobile Number</Label>
                      <Input
                        id="mobileNumber"
                        value={profileForm.mobileNumber || ""}
                        onChange={(e) => setProfileForm((p) => ({ ...p, mobileNumber: e.target.value }))}
                        placeholder="+1234567890"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Combobox
                        options={getAvailableCurrencies().map((curr) => ({
                          value: curr.code,
                          label: `${curr.code} - ${curr.name} (${curr.symbol})`,
                        }))}
                        value={profileForm.currency}
                        onValueChange={(value) => setProfileForm((p) => ({ ...p, currency: value as Currency }))}
                        placeholder="Select currency"
                        searchPlaceholder="Search currency..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gstin">GSTIN</Label>
                      <Input
                        id="gstin"
                        value={profileForm.gstin || ""}
                        onChange={(e) => setProfileForm((p) => ({ ...p, gstin: e.target.value }))}
                        placeholder="15-character GSTIN"
                        maxLength={15}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pan">PAN</Label>
                      <Input
                        id="pan"
                        value={profileForm.pan || ""}
                        onChange={(e) => setProfileForm((p) => ({ ...p, pan: e.target.value.toUpperCase() }))}
                        placeholder="10-character PAN"
                        maxLength={10}
                      />
                    </div>
                  </div>

                  {/* Plan Info (Read-only) */}
                  <div className="space-y-2 pt-4 border-t">
                    <Label>Current Plan (Read-only)</Label>
                    <div className="flex items-center justify-between p-3 rounded-md border bg-muted">
                    <div>
                        <p className="font-medium">{planInfo.name || "Free"}</p>
                        <p className="text-sm text-muted-foreground">
                            {planInfo.expiresAt
                              ? remainingDays === null
                                ? "Expiry: invalid date"
                                : remainingDays > 0
                                ? `${remainingDays} day${remainingDays === 1 ? "" : "s"} remaining`
                                : remainingDays === 0
                                ? "Expires today"
                                : "Expired"
                              : "No expiry"}
                        </p>
                          </div>
                      <div className="px-3 py-1 rounded bg-primary/10 text-primary text-sm font-medium">
                          {planInfo.name || "Free"}
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setProfileOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveProfile} disabled={savingProfile}>
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        {!isMobile && sidebarOpen && (
          <aside className="w-64 border-r bg-card h-[calc(100vh-57px)] sticky top-[57px] hidden md:block">
            <nav className="p-4 space-y-2">
              <NavigationContent />
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
