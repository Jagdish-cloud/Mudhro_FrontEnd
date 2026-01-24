# URL Parameter Encoding Analysis

This document lists all URL parameters that need encoding in the Mudhro application.

## ✅ Already Encoded

### Frontend Routes (Query Parameters)
- ✅ `/invoices/create?id=...` - Encoded in `Invoices.tsx`
- ✅ `/expenses/create?id=...` - Encoded in `Expenses.tsx`

## ❌ Needs Encoding

### 1. Frontend Route Parameters

#### Monthly Report Route
- **Location**: `src/pages/MonthlyReport.tsx`
- **Route**: `/monthly-report/:userId`
- **Current**: `useParams<{ userId: string }>()`
- **Needs**: Encode userId in route, decode when reading

### 2. API Service Calls (Path Parameters)

All service files need to encode IDs in API URLs:

#### Invoice Service (`src/lib/services/invoiceService.ts`)
- ❌ `GET /api/invoices/${id}`
- ❌ `PUT /api/invoices/${id}`
- ❌ `DELETE /api/invoices/${id}`
- ❌ `POST /api/invoices/${id}/pdf`
- ❌ `POST /api/invoices/${id}/email`

#### Expense Service (`src/lib/services/expenseService.ts`)
- ❌ `GET /api/expenses/${id}`
- ❌ `PUT /api/expenses/${id}`
- ❌ `DELETE /api/expenses/${id}`
- ❌ `POST /api/expenses/${id}/pdf`

#### Expense Item Service (`src/lib/services/expenseItemService.ts`)
- ❌ `GET /api/expenses/${expenseId}/items`
- ❌ `GET /api/expense-items/${id}`
- ❌ `POST /api/expenses/${expenseId}/items`
- ❌ `PUT /api/expense-items/${id}`
- ❌ `DELETE /api/expense-items/${id}`

#### Invoice Item Service (`src/lib/services/invoiceItemService.ts`)
- ❌ `GET /api/invoices/${invoiceId}/items`
- ❌ `GET /api/invoice-items/${id}`
- ❌ `POST /api/invoices/${invoiceId}/items`
- ❌ `PUT /api/invoice-items/${id}`
- ❌ `DELETE /api/invoice-items/${id}`

#### Item Service (`src/lib/services/itemService.ts`)
- ❌ `GET /api/items/${id}`
- ❌ `PUT /api/items/${id}`
- ❌ `DELETE /api/items/${id}`

#### Client Service (`src/lib/services/clientService.ts`)
- ❌ `GET /api/master-clients/${id}`
- ❌ `PUT /api/master-clients/${id}`
- ❌ `DELETE /api/master-clients/${id}`

#### Vendor Service (`src/lib/services/vendorService.ts`)
- ❌ `GET /api/vendors/${id}`
- ❌ `PUT /api/vendors/${id}`
- ❌ `DELETE /api/vendors/${id}`

#### Expense Service Catalog (`src/lib/services/expenseServiceCatalog.ts`)
- ❌ `GET /api/expense-services/${id}`
- ❌ `PUT /api/expense-services/${id}`
- ❌ `DELETE /api/expense-services/${id}`

#### Monthly Report Service (`src/lib/services/monthlyReportService.ts`)
- ❌ `GET /api/monthly-reports/${userId}`
- ❌ `GET /api/monthly-reports/${userId}/pdf`

### 3. Direct Fetch Calls (Not Using Services)

#### Invoices Page (`src/pages/Invoices.tsx`)
- ❌ `fetch(\`${API_BASE_URL}/api/invoices/${invoiceId}/pdf\`)`

#### Expenses Page (`src/pages/Expenses.tsx`)
- ❌ `fetch(\`${API_BASE_URL}/api/expenses/${expenseId}/pdf\`)`

#### Create Invoice Page (`src/pages/CreateInvoice.tsx`)
- ❌ `fetch(\`${API_BASE_URL}/api/invoices/${editId}/pdf\`)`

#### Create Expense Page (`src/pages/CreateExpense.tsx`)
- ❌ `fetch(\`${API_BASE_URL}/api/expenses/${savedExpense.id}/attachment\`)`
- ❌ `fetch(\`${API_BASE_URL}/api/expenses/${editId}/pdf\`)`
- ❌ `fetch(\`${API_BASE_URL}/api/expenses/${editId}/attachment\`)`

## Backend Status

✅ **All backend routes are ready** - The middleware automatically decodes encoded IDs from:
- Route parameters (`req.params`)
- Query parameters (`req.query`)

The backend supports both:
- Hashids encoding (backend format)
- Base64url encoding (frontend format)
- Plain numeric IDs (backward compatibility)

## Implementation Plan

1. ✅ Create URL encoder utility (DONE)
2. ✅ Update query parameters in routes (DONE)
3. ⏳ Update all API service calls
4. ⏳ Update MonthlyReport route parameter
5. ⏳ Update direct fetch calls
6. ⏳ Test all endpoints

## Total Count

- **Service Files**: 8 files need updates
- **Direct Fetch Calls**: 5 locations need updates
- **Route Parameters**: 1 route needs update
- **Total API Endpoints**: ~30+ endpoints need encoding

