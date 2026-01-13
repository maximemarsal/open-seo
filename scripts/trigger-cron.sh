#!/bin/bash

# Script to trigger the publish-due cron endpoint
# Can be used locally or with external cron services

APP_URL="${APP_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-your-secret-here}"

echo "Triggering cron at $APP_URL/api/cron/publish-due"

response=$(curl -s -w "\n%{http_code}" -X POST "$APP_URL/api/cron/publish-due" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "HTTP Status: $http_code"
echo "Response: $body"

if [ "$http_code" -eq 200 ]; then
  echo "✅ Cron executed successfully"
  exit 0
else
  echo "❌ Cron failed"
  exit 1
fi

