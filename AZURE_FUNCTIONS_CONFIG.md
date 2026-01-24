# Azure Functions Configuration for Monthly Reports and Reminders

## Backend URL
Replace `[YOUR_BACKEND_URL]` with your Azure App Service backend URL (e.g., `https://your-app-name.azurewebsites.net`)

## Frontend URL
Replace `[YOUR_FRONTEND_URL]` with your Azure App Service frontend URL (e.g., `https://your-frontend-app.azurewebsites.net`)

---

## 1. Monthly Report (Run on 2nd of every month)

### URL:
```
https://[YOUR_BACKEND_URL]/api/monthly-reports/generate-all-pdfs?frontendUrl=[YOUR_FRONTEND_URL]
```

### Example:
```
https://mudhro-backend.azurewebsites.net/api/monthly-reports/generate-all-pdfs?frontendUrl=https://mudhro-frontend.azurewebsites.net
```

### Azure Functions Cron Expression:
```
0 0 2 * *  (Runs at 00:00 UTC on the 2nd day of every month)
```

**Note:** 
- The endpoint automatically calculates the previous month when no month/year parameters are provided
- Perfect for running on the 2nd of every month to generate reports for the previous month
- It generates PDFs for all active users and sends them via email

---

## 2. Payment Reminders (Run every day)

### URL:
```
https://[YOUR_BACKEND_URL]/api/invoices/reminders/due
```

### Example:
```
https://mudhro-backend.azurewebsites.net/api/invoices/reminders/due
```

### Azure Functions Cron Expression:
```
0 9 * * *  (Runs at 09:00 UTC every day)
```

**Alternative schedules:**
- `0 0 * * *` - Runs at midnight UTC every day
- `0 9 * * *` - Runs at 9 AM UTC every day
- `0 */6 * * *` - Runs every 6 hours
- `0 9,15,21 * * *` - Runs at 9 AM, 3 PM, and 9 PM UTC

**Note:**
- This endpoint analyzes invoices with status != "paid"
- Sends reminder emails for:
  - 3 days before due date
  - On due date
  - 7 days after due date
- Creates reminder records in the `payment_reminders` table

---

## Azure Functions HTTP Trigger Setup

### For Monthly Report:
1. Create a new HTTP Trigger Azure Function
2. Set the URL to: `https://[YOUR_BACKEND_URL]/api/monthly-reports/generate-all-pdfs?frontendUrl=[YOUR_FRONTEND_URL]`
3. Set HTTP method to: `GET`
4. Configure Timer Trigger with cron: `0 0 2 * *`
5. Make an HTTP GET request to the backend URL in the function code

### For Reminders:
1. Create a new HTTP Trigger Azure Function
2. Set the URL to: `https://[YOUR_BACKEND_URL]/api/invoices/reminders/due`
3. Set HTTP method to: `GET`
4. Configure Timer Trigger with cron: `0 9 * * *` (or your preferred schedule)
5. Make an HTTP GET request to the backend URL in the function code

---

## Sample Azure Function Code (C# - HTTP Trigger with Timer)

### Monthly Report Function:

```csharp
using System.Net.Http;
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Logging;

public static class MonthlyReportFunction
{
    private static readonly HttpClient client = new HttpClient();

    [FunctionName("MonthlyReport")]
    public static async Task Run(
        [TimerTrigger("0 0 2 * *")] TimerInfo myTimer,
        ILogger log)
    {
        log.LogInformation($"Monthly Report function executed at: {DateTime.Now}");
        
        var backendUrl = Environment.GetEnvironmentVariable("BACKEND_URL");
        var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL");
        var url = $"{backendUrl}/api/monthly-reports/generate-all-pdfs?frontendUrl={frontendUrl}";
        
        try
        {
            var response = await client.GetAsync(url);
            var content = await response.Content.ReadAsStringAsync();
            log.LogInformation($"Response: {response.StatusCode} - {content}");
        }
        catch (Exception ex)
        {
            log.LogError($"Error calling monthly report endpoint: {ex.Message}");
            throw;
        }
    }
}
```

### Reminder Function:

```csharp
using System.Net.Http;
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Logging;

public static class ReminderFunction
{
    private static readonly HttpClient client = new HttpClient();

    [FunctionName("PaymentReminders")]
    public static async Task Run(
        [TimerTrigger("0 9 * * *")] TimerInfo myTimer,
        ILogger log)
    {
        log.LogInformation($"Payment Reminder function executed at: {DateTime.Now}");
        
        var backendUrl = Environment.GetEnvironmentVariable("BACKEND_URL");
        var url = $"{backendUrl}/api/invoices/reminders/due";
        
        try
        {
            var response = await client.GetAsync(url);
            var content = await response.Content.ReadAsStringAsync();
            log.LogInformation($"Response: {response.StatusCode} - {content}");
        }
        catch (Exception ex)
        {
            log.LogError($"Error calling reminder endpoint: {ex.Message}");
            throw;
        }
    }
}
```

---

## Testing the Endpoints

### Test Monthly Report:
```bash
curl -X GET "https://[YOUR_BACKEND_URL]/api/monthly-reports/generate-all-pdfs?frontendUrl=[YOUR_FRONTEND_URL]"
```

### Test Reminders:
```bash
curl -X GET "https://[YOUR_BACKEND_URL]/api/invoices/reminders/due"
```

---

## Environment Variables for Azure Functions

Set these in your Azure Function App Configuration:

- `BACKEND_URL` - Your backend Azure App Service URL
- `FRONTEND_URL` - Your frontend Azure App Service URL (optional, can be passed as query param)

---

## Important Notes

1. **Monthly Report**: 
   - No month/year parameters needed - it automatically uses the previous month
   - Generates PDFs for ALL active users
   - Sends emails with PDF attachments

2. **Reminders**:
   - Processes all invoices with status != "paid"
   - Only sends reminders for specific conditions (3 days before, on due date, 7 days after)
   - Creates new reminder records in the database each time

3. **CORS**: Ensure your backend CORS settings allow requests from Azure Functions IP ranges, or use `*` for public endpoints

4. **Authentication**: If your endpoints require authentication, you'll need to pass authentication tokens in the Azure Function code

