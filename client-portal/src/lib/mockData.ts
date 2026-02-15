export interface Client {
  id: string;
  name: string;
  email: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'paid' | 'pending' | 'overdue';
  notes?: string;
  installments?: number;
  currentInstallment?: number;
  installmentAmount?: number;
  inclusiveGST?: boolean;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  method: string;
  reference: string;
  date: string;
  currency: "INR" | "USD";
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  currency: "INR" | "USD";
  proof?: string;
}

// Mock data store
class MockDataStore {
  private clients: Client[] = [
    {
      id: '1',
      name: 'Acme Inc.',
      email: 'contact@acme.com',
      address: '123 Main Street',
      city: 'Bengaluru',
      postalCode: '550001',
    },
    {
      id: '2',
      name: 'Ananya Designs',
      email: 'hello@ananya.design',
      address: '456 Design Ave',
      city: 'Mumbai',
      postalCode: '400001',
    },
    {
      id: '3',
      name: 'Meera Creations',
      email: 'meera@creations.com',
      address: '789 Art Street',
      city: 'Delhi',
      postalCode: '110001',
    },
    {
      id: '4',
      name: 'Alex Media',
      email: 'alex@media.com',
      address: '321 Media Blvd',
      city: 'Bangalore',
      postalCode: '560001',
    },
  ];

  private invoices: Invoice[] = [
    {
      id: '1',
      invoiceNumber: 'INV-101',
      clientId: '2',
      clientName: 'Ananya Designs',
      clientEmail: 'hello@ananya.design',
      issueDate: '2024-09-15',
      dueDate: '2024-09-30',
      items: [
        { id: '1', description: 'Website Design', quantity: 1, rate: 12000, amount: 12000 },
      ],
      subtotal: 12000,
      tax: 0,
      total: 12000,
      status: 'paid',
    },
    {
      id: '2',
      invoiceNumber: 'INV-100',
      clientId: '3',
      clientName: 'Meera Creations',
      clientEmail: 'meera@creations.com',
      issueDate: '2024-09-14',
      dueDate: '2024-09-28',
      items: [
        { id: '1', description: 'SEO Services', quantity: 1, rate: 8500, amount: 8500 },
      ],
      subtotal: 8500,
      tax: 0,
      total: 8500,
      status: 'pending',
    },
    {
      id: '3',
      invoiceNumber: 'INV-099',
      clientId: '4',
      clientName: 'Alex Media',
      clientEmail: 'alex@media.com',
      issueDate: '2024-09-13',
      dueDate: '2024-09-20',
      items: [
        { id: '1', description: 'Content Writing', quantity: 1, rate: 5000, amount: 5000 },
      ],
      subtotal: 5000,
      tax: 0,
      total: 5000,
      status: 'overdue',
    },
  ];

  private payments: Payment[] = [
    {
      id: '1',
      invoiceId: '1',
      invoiceNumber: 'INV-101',
      clientName: 'Ananya Designs',
      amount: 12000,
      method: 'UPI',
      reference: '1234567890',
      date: '2024-09-16',
      currency: 'INR'
    },
  ];

  private expenses: Expense[] = [
    {
      id: '1',
      description: 'Office Supplies',
      amount: 1200,
      date: '2024-09-10',
      category: 'Office',
      currency: 'INR'
    },
    {
      id: '2',
      description: 'Software Subscription',
      amount: 2500,
      date: '2024-09-05',
      category: 'Software',
      currency: "INR"
    },
  ];

  // Clients
  getClients(): Client[] {
    return [...this.clients];
  }

  addClient(client: Omit<Client, 'id'>): Client {
    const newClient = { ...client, id: Date.now().toString() };
    this.clients.push(newClient);
    return newClient;
  }

  // Invoices
  getInvoices(): Invoice[] {
    return [...this.invoices];
  }

  getInvoiceById(id: string): Invoice | undefined {
    return this.invoices.find((inv) => inv.id === id);
  }

  addInvoice(invoice: Omit<Invoice, 'id'>): Invoice {
    const newInvoice = { ...invoice, id: Date.now().toString() };
    this.invoices.push(newInvoice);
    return newInvoice;
  }

  updateInvoice(updated: Invoice): Invoice | undefined {
    const idx = this.invoices.findIndex((inv) => inv.id === updated.id);
    if (idx === -1) return undefined;
    // preserve insertion position, replace with updated object
    this.invoices[idx] = { ...updated };
    return this.invoices[idx];
  }


  updateInvoiceStatus(id: string, status: Invoice['status']): void {
    const invoice = this.invoices.find((inv) => inv.id === id);
    if (invoice) {
      invoice.status = status;
    }
  }

  // Payments
  getPayments(): Payment[] {
    return [...this.payments];
  }

  addPayment(payment: Omit<Payment, 'id'>): Payment {
    const newPayment = { ...payment, id: Date.now().toString() };
    this.payments.push(newPayment);
    // Update invoice status
    this.updateInvoiceStatus(payment.invoiceId, 'paid');
    return newPayment;
  }

  // Expenses
  getExpenses(): Expense[] {
    return [...this.expenses];
  }

  addExpense(expense: Omit<Expense, 'id'>): Expense {
    const newExpense = { ...expense, id: Date.now().toString() };
    this.expenses.push(newExpense);
    return newExpense;
  }

  // Reset
  reset(): void {
    this.clients = [];
    this.invoices = [];
    this.payments = [];
    this.expenses = [];
  }
}

export const mockDataStore = new MockDataStore();
