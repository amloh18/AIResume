#!/bin/bash

# Script to send a notification that will appear as a toast
# Usage: ./scripts/send-notification-toast-email.sh [title] [message] [type] [email]

API_URL="${API_URL:-http://localhost:3000}"
TITLE="${1:-🧪 Test Notification Toast}"
MESSAGE="${2:-This is a test notification toast. If you see this, the system is working correctly!}"
TYPE="${3:-system_update}"
EMAIL="${4:-amarjotasl@gmail.com}"

echo "🚀 Sending notification toast to $EMAIL..."
echo "📡 API URL: $API_URL"
echo "📋 Title: $TITLE"
echo "💬 Message: $MESSAGE"
echo "🏷️  Type: $TYPE"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/api/notifications/test" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"$TITLE\",
    \"message\": \"$MESSAGE\",
    \"type\": \"$TYPE\",
    \"email\": \"$EMAIL\",
    \"channels\": [\"in-app\"],
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
else
  echo ""
  echo "❌ Failed to send notification"
  exit 1
fi
