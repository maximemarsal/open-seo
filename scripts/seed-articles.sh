#!/bin/bash

# Script to seed test articles for a user
# Usage: ./seed-articles.sh <email>

APP_URL="${APP_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-your-secret-here}"
EMAIL="${1:-maxime.marsal18@gmail.com}"

echo "Seeding articles for: $EMAIL"
echo "Target: $APP_URL/api/seed-articles"

response=$(curl -s -w "\n%{http_code}" -X POST "$APP_URL/api/seed-articles" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\"}")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "HTTP Status: $http_code"
echo "Response:"
echo "$body" | jq . 2>/dev/null || echo "$body"

if [ "$http_code" -eq 200 ]; then
  echo "✅ Articles seeded successfully"
  exit 0
else
  echo "❌ Seeding failed"
  exit 1
fi

