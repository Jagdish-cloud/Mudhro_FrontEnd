# Frontend-Backend Integration Summary

This document summarizes the integration between the Mudhro frontend and backend.

## Overview

The frontend has been fully integrated with the backend API, replacing all mock data and localStorage-based authentication with real API calls.

## Changes Made

### 1. Authentication (`src/lib/auth.ts`)
- ✅ Replaced localStorage mock authentication with real API calls
- ✅ Integrated with `/api/auth/register` and `/api/auth/login` endpoints
- ✅ Proper JWT token management (accessToken and refreshToken)
- ✅ Updated User interface to match backend response structure

### 2. API Configuration
- ✅ API client configured in `src/lib/api.ts` with proper error handling
- ✅ Environment variable support: `VITE_API_URL` (defaults to `http://localhost:3000`)
- ✅ Automatic token injection in Authorization headers

### 3. Service Layer
Created new service modules for API integration:
- ✅ `src/lib/services/clientService.ts` - Master clients CRUD operations
- ✅ `src/lib/services/invoiceService.ts` - Invoices CRUD operations  
- ✅ `src/lib/services/itemService.ts` - Items CRUD operations

### 4. Page Updates
- ✅ **SignIn** (`src/pages/SignIn.tsx`) - Now uses real authentication API
- ✅ **SignUp** (`src/pages/SignUp.tsx`) - Updated to match backend registration schema
- ✅ **Clients** (`src/pages/Clients.tsx`) - Integrated with `/api/master-clients` endpoints
- ✅ **Invoices** (`src/pages/Invoices.tsx`) - Integrated with `/api/invoices` endpoints
- ✅ **Dashboard** (`src/pages/Dashboard.tsx`) - Integrated with real invoice data

## API Endpoints Used

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Clients
- `GET /api/master-clients` - Get all clients
- `GET /api/master-clients/:id` - Get client by ID
- `POST /api/master-clients` - Create client
- `PUT /api/master-clients/:id` - Update client
- `DELETE /api/master-clients/:id` - Delete client

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get invoice by ID
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Items
- `GET /api/items` - Get all items
- `GET /api/items/:id` - Get item by ID
- `POST /api/items` - Create item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Vendors
- `GET /api/vendors` - Get all vendors
- `GET /api/vendors/:id` - Get vendor by ID
- `POST /api/vendors` - Create vendor
- `PUT /api/vendors/:id` - Update vendor
- `DELETE /api/vendors/:id` - Delete vendor

### Expenses
- `GET /api/expenses` - Get all expenses
- `GET /api/expenses/:id` - Get expense by ID
- `POST /api/expenses` - Record a new expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Expense Items
- `GET /api/expenses/:id/items` - Get items linked to an expense
- `POST /api/expenses/:id/items` - Create expense item
- `GET /api/expense-items/:id` - Get expense item by ID
- `PUT /api/expense-items/:id` - Update expense item
- `DELETE /api/expense-items/:id` - Delete expense item

### Expense Services
- `GET /api/expense-services` - Get catalog of expense services for the authenticated user
- `GET /api/expense-services/:id` - Get expense service by ID
- `POST /api/expense-services` - Create expense service
- `PUT /api/expense-services/:id` - Update expense service
- `DELETE /api/expense-services/:id` - Delete expense service

### Expense Structure
Backend uses:
- `billDate`
- `dueDate`
- `taxPercentage` (percentage applied to subtotal)
- `totalAmount` (subtotal + tax)
- `additionalNotes`
- `vendorId`

## Setup Instructions

### 1. Environment Configuration
Create a `.env` file in the root directory:
```
VITE_API_URL=http://localhost:3000
```

### 2. Backend Setup
Ensure the backend is running:
```bash
cd backend
npm install
npm run dev
```
The backend should be running on `http://localhost:3000` (or the port specified in your backend config).

### 3. Frontend Setup
```bash
npm install
npm run dev
```
The frontend will run on `http://localhost:8080` (or next available port).

## Data Structure Mapping

### User Registration
Frontend sends:
- `fullName` (was `name`)
- `email`
- `password`
- `country`
- `mobileNumber` (combines dialCode + mobile)
- `gstin` (optional)
- `pan` (optional)

### Invoice Structure
Backend uses:
- `invoiceDate` (frontend displays as "Issue Date")
- `subTotalAmount` (frontend displays as "Subtotal")
- `totalAmount` (frontend displays as "Total")
- `gst` (GST percentage, not amount)
- Status is computed client-side based on `dueDate`

### Client Structure
Backend uses:
- `fullName` (frontend displays as "Name")
- `organization` (optional)
- `mobileNumber` (was `phone`)
- `gstin` (optional)

## Notes

1. **Invoice Status**: The backend doesn't store invoice status. The frontend computes it based on the `dueDate`:
   - `overdue` - if due date is in the past
   - `pending` - if due date is today or in the future
   - `paid` - can be set manually (not persisted to backend yet)

2. **Client Names in Invoices**: Client names are fetched separately and matched by `clientId` to display in invoice lists.

3. **Error Handling**: All API calls include proper error handling with user-friendly error messages displayed via toast notifications.

4. **Authentication**: JWT tokens are stored in localStorage and automatically included in API requests via the Authorization header.

## Testing

To test the integration:

1. Start the backend server
2. Start the frontend dev server
3. Register a new user account
4. Sign in with the credentials
5. Create a client (master client)
6. Create an invoice
7. View invoices and dashboard

## Future Enhancements

- [ ] Invoice status persistence in backend
- [ ] Refresh token rotation
- [ ] Logo upload functionality
- [ ] Expenses API integration
- [ ] Payments API integration

