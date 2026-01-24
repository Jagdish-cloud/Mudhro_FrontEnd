import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, 
  Receipt, 
  TrendingUp, 
  DollarSign,
  Shield,
  Clock,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Linkedin
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Mudhro</h1>
          </Link>
          <nav className="flex items-center gap-6">
            {/* <Link to="/pricing">
              <Button variant="secondary">Pricing</Button>
            </Link> */}
            <Link to="/auth/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth/signup">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-5">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
          <Link to="/" className="flex items-center gap-3">
            <img 
              src={`${API_BASE_URL}/uploads/logos/MudhroLogo.png`}
              alt="Mudhro Logo"
              className="h-34 w-auto object-contain py-5"
              />
          </Link>
            <h2 className="text-5xl font-bold text-foreground mb-6 leading-tight">
              Financial Operating System for Freelancers, Creators and Gig workers
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Simplify your finances with easy invoicing, expense tracking, tax
              management, and more.
            </p>
            <div className="flex gap-4">
              <Link to="/auth/signup">
                <Button size="lg">Get Started</Button>
              </Link>
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              ✨ Free for the first month
            </p>
          </div>

          {/* Overview Dashboard Preview */}
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-foreground">Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
                    <p className="text-2xl font-bold text-foreground">₹12,250</p>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Income</p>
                    <div className="flex items-end gap-1 mt-2">
                      <div
                        className="text-2xl font-bold text-foreground">₹8500</div>  
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-3 text-foreground">Recent Invoices</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-foreground">ABC Corp</p>
                      <p className="text-xs text-muted-foreground">April 18, 2024</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">₹3,500</p>
                      <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded">
                        Paid
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-foreground">XYZ Ltd</p>
                      <p className="text-xs text-muted-foreground">April 18, 2024</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">₹3,200</p>
                      <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">
                        Pending
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Expenses</p>
                  <p className="text-lg font-bold text-foreground">₹1,200</p>
                  <p className="text-xs text-muted-foreground">Office Supplies</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Taxes</p>
                  <p className="text-lg font-bold text-foreground">₹2,600</p>
                  <p className="text-xs text-muted-foreground">Estimated Tax</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            Everything You Need to Manage Your Finances
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-6">
                <FileText className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Easy Invoicing</h3>
                <p className="text-muted-foreground">
                  Create professional invoices in minutes with live preview and
                  installment support.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Receipt className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Expense Tracking</h3>
                <p className="text-muted-foreground">
                  Track all your business expenses with receipt upload and camera
                  capture.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <TrendingUp className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Tax Management</h3>
                <p className="text-muted-foreground">
                  Estimate your tax liability and get smart nudges for tax savings.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <DollarSign className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Payment Tracking</h3>
                <p className="text-muted-foreground">
                  Record and track all payments with automated status updates.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Shield className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Secure & Private</h3>
                <p className="text-muted-foreground">
                  Your financial data is encrypted and stored securely.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Clock className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Save Time</h3>
                <p className="text-muted-foreground">
                  Automate repetitive tasks and focus on growing your business.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
          Trusted by Freelancers
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4">
                "As an educator and trainer, managing multiple income streams from workshops and consultations was challenging. Mudhro's invoicing system makes it effortless to track payments from different institutions and students."
              </p>
              <p className="font-semibold text-foreground">Suman Chauhan</p>
              <p className="text-sm text-muted-foreground">Research Scholar, Teacher and Edu-Trainer</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4">
                "Mudhro has streamlined my freelance web design business perfectly. The professional invoices help me maintain credibility with clients, and the expense tracking ensures I never miss a tax deduction."
              </p>
              <p className="font-semibold text-foreground">Dilip Kumar</p>
              <p className="text-sm text-muted-foreground">Web Designer</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4">
                "Organizing exhibitions involves managing multiple vendors and clients with varying payment schedules. Mudhro's installment feature and payment tracking have made financial management so much simpler for my business."
              </p>
              <p className="font-semibold text-foreground">Syed Wiqar</p>
              <p className="text-sm text-muted-foreground">Exhibitions Organizer</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Team Members */}

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of freelancers managing their finances with Mudhro
          </p>
          <Link to="/auth/signup">
            <Button size="lg" variant="secondary">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </section>

      {/* Contact Details */}
      <section className="bg-muted py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8 text-foreground">
            Contact Us
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-foreground">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold">Mobile</p>
                <a 
                  href="https://wa.me/916362068731" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  +91 6362068731 (Whatsapp Only)
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold">Email</p>
                <a 
                  href="mailto:admin@mudhro.com"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  admin@mudhro.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Media Links */}
      <section className="bg-muted py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4">
            <h3 className="text-lg font-semibold text-foreground">Follow Us</h3>
            <div className="flex items-center gap-6">
              <a
                href="https://www.instagram.com/mudhro_in?igsh=MTR0dHN6aGw0OTFzdg=="
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-6 h-6" />
              </a>
              {/* <a
                href="https://facebook.com/mudhro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-6 h-6" />
              </a> */}
              <a
                href="https://linkedin.com/company/mudhro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 Mudhro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
