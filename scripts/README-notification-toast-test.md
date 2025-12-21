# Notification Toast Test Scripts

This directory contains scripts to test the notification toast system in the CVCircle application.

## Quick Start

### Method 1: Simple Browser Console Test (Recommended)

1. **Open your browser** and navigate to an authenticated page:
   - `/dashboard`
   - `/resume-enhancer`
   - Any page where you're logged in

2. **Open the browser console**:
   - Chrome/Edge: `F12` or `Ctrl+Shift+J` (Windows) / `Cmd+Option+I` (Mac)
   - Firefox: `F12` or `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)
   - Safari: `Cmd+Option+C` (Mac)

3. **Copy and paste** the contents of `test-notification-toast-simple.js` into the console

4. **Press Enter** - The script will automatically:
   - Check if NotificationCenter is visible
   - Create a test notification via API
   - The toast should appear automatically in the top-right corner

### Method 2: Full Test Script

For more advanced testing, use `test-notification-toast.js`:

```javascript
// After loading the script, you can use:

// Quick test
window.testNotificationToast.quick()

// Custom notification
window.testNotificationToast.api({
  title: 'Custom Title',
  message: 'Custom message here',
  type: 'system_update'
})

// Interactive notification with action button
window.testNotificationToast.interactive()

// Test all notification types
window.testNotificationToast.allTypes()

// Check NotificationCenter visibility
window.testNotificationToast.checkVisibility()
```

## How It Works

1. **API Call**: The script calls `/api/notifications/test` to create a notification
2. **Server-Sent Events (SSE)**: The NotificationContext listens for new notifications via SSE
3. **Automatic Toast**: When a new notification arrives, `showToastForNotification` is called
4. **Toast Display**: The toast appears using the `useToast` hook from `src/hooks/use-toast.ts`

## Expected Behavior

When the test runs successfully, you should see:

1. **Console Output**:
   ```
   ✅ Notification created successfully!
   🍞 A toast should appear automatically...
   ```

2. **Visual Toast** (top-right corner):
   - Title: "🧪 Test Notification Toast"
   - Description: "If you see this toast notification..."
   - Close button (X)
   - Auto-dismisses after a few seconds

3. **NotificationCenter**:
   - The notification should also appear in the NotificationCenter dropdown
   - Click the bell icon in the header to view all notifications

## Troubleshooting

### Toast doesn't appear

1. **Check authentication**: Make sure you're logged in
2. **Check route**: You must be on an authenticated page (not `/sign-in`, `/`, etc.)
3. **Check console errors**: Look for any errors in the browser console
4. **Check NotificationContext**: Verify the NotificationProvider is mounted
5. **Check SSE connection**: Look for SSE connection logs in console

### NotificationCenter not found

- The NotificationCenter only appears on authenticated, non-admin routes
- It may be closed - click the bell icon in the header to open it
- Check the DOM path provided in your query to locate it

### API errors

- **401 Unauthorized**: You're not logged in
- **404 Not Found**: User not found (check the default email in the API)
- **500 Server Error**: Check server logs for details

## Testing Different Notification Types

The script supports all notification types defined in `src/models/Notification.ts`:

- `system_update`
- `job_applied`
- `job_stage_moved`
- `deadline_approaching`
- `deadline_due_today`
- `deadline_missed`
- `follow_up`
- `achievement`
- `documents_ready`
- `interview_follow_up`
- And more...

## DOM Path Reference

Based on your query, the NotificationCenter element is located at:
```
div.dashboard-page.resume-enhancer-page > 
header > 
div.w-full.px-4.py-1.5 > 
div.flex.items-center.justify-between > 
div.flex.items-center.space-x-2 > 
div.relative > 
div.absolute.right-0.top-12.z-50.w-96.rounded-2xl...
```

The toast itself appears in a separate viewport, typically rendered by the `Toaster` component.

## Related Files

- `src/contexts/NotificationContext.tsx` - Notification state management
- `src/components/notifications/NotificationCenter.tsx` - Notification UI
- `src/hooks/use-toast.ts` - Toast hook
- `src/components/ui/toaster.tsx` - Toast renderer
- `src/app/api/notifications/test/route.ts` - Test API endpoint

