#!/bin/bash

# Script to send a notification that will appear as a toast
# Usage: ./scripts/send-notification-toast.sh [title] [message] [type]

API_URL="${API_URL:-http://localhost:3000}"
TITLE="${1:-🧪 Test Notification Toast}"
MESSAGE="${2:-This is a test notification toast. If you see this, the system is working correctly!}"
TYPE="${3:-system_update}"

echo "🚀 Sending notification toast..."
echo "📡 API URL: $API_URL"
echo "📋 Title: $TITLE"
echo "💬 Message: $MESSAGE"
echo "🏷️  Type: $TYPE"
echo ""

# Send the notification
# Allow userId to be passed as 4th argument, or use default
USER_ID="${4:-69419104a1791cdcbd077437}"

RESPONSE=$(curl -s -X POST "$API_URL/api/notifications/test" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"$TITLE\",
    \"message\": \"$MESSAGE\",
    \"type\": \"$TYPE\",
    \"userId\": \"$USER_ID\",
    \"interactive\": false
  }")

# Check if jq is available for pretty printing
if command -v jq &> /dev/null; then
  echo "$RESPONSE" | jq .
else
  echo "$RESPONSE"
fi

# Check if the request was successful
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo ""
  echo "✅ Notification sent successfully!"
  echo "🍞 A toast should appear in your browser within a few seconds..."
  echo "👀 Watch the top-right corner of your browser for the toast notification."
  echo ""
  echo "💡 Make sure you have the dashboard open at: $API_URL/dashboard"
else
  echo ""
  echo "❌ Failed to send notification"
  echo "💡 Check that:"
  echo "   - The server is running on $API_URL"
  echo "   - You are logged in"
  echo "   - The API endpoint is accessible"
  exit 1
fi

