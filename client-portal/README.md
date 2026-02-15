# Mudhro Client Portal

Separate React application for external clients to access their invoices securely.

## Features

- Password + Email OTP authentication
- View all invoices (read-only)
- View invoice details
- Download invoice PDFs
- Secure JWT-based authentication
- Auto-logout on token expiry

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```
VITE_API_URL=http://localhost:3000
```

3. Run development server:
```bash
npm run dev
```

The client portal will run on `http://localhost:5174` (different port from main app).

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Security Notes

- Tokens are stored in sessionStorage (cleared on tab close)
- All API requests include JWT token in Authorization header
- Token expiry is handled automatically
- Client-scoped access (clients can only see their own invoices)
