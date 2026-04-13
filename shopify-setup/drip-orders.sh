#!/bin/bash
# Continuous order generator for Nova Pulse Shopify store
# Creates 1 order every 3 minutes via REST API
# Runs via cron: */3 * * * * /Users/admin/hackathon/rev-shield/shopify-setup/drip-orders.sh
#
# Strategy: Generate orders across a rolling 14-day window ending Saturday Apr 18
# Degradation pattern lands on Apr 15-17 so judges see an "active incident"
# By Saturday, data spans Apr 5 - Apr 18 with fresh, current timestamps

TOKEN="${SHOPIFY_ADMIN_TOKEN:-shpat_REPLACE_ME}"
SHOP="nova-pulse-14.myshopify.com"
API="https://${SHOP}/admin/api/2024-01"
LOG="/Users/admin/hackathon/rev-shield/shopify-setup/drip-orders.log"
STATE="/Users/admin/hackathon/rev-shield/shopify-setup/drip-state.txt"

# === TIMELINE (Apr 5 - Apr 18, 2026) ===
# Day 0-7  (Apr 5-12):  BASELINE  — normal traffic, ~92% success
# Day 8-11 (Apr 13-16): DEGRADATION — traffic drops, payment failures spike
# Day 12-13 (Apr 17-18): RECOVERY — fixing the issue, metrics returning

# Target dates
HACKATHON_DATE="2026-04-18"
START_DATE="2026-04-05"

# Stop after hackathon
TODAY=$(date +%Y-%m-%d)
if [[ "$TODAY" > "$HACKATHON_DATE" ]]; then
  echo "$(date): Past hackathon date. Stopping." >> "$LOG"
  exit 0
fi

# Products
PRODUCTS=(
  "Wireless Charging Pad:39.00"
  "MagSafe Phone Grip:24.00"
  "USB-C Travel Hub:59.00"
  "Laptop Stand - Aluminum:79.00"
  "Noise-Canceling Earbuds:89.00"
  "Minimalist Wallet:34.00"
  "Key Organizer:19.00"
  "Insulated Water Bottle:29.00"
  "Travel Pouch Set:44.00"
  "LED Desk Lamp:49.00"
  "Cable Management Kit:22.00"
  "Mousepad XL:28.00"
  "Monitor Light Bar:65.00"
  "Work From Home Bundle:149.00"
  "Travel Essentials Kit:99.00"
)

CHANNELS=("direct" "paid_social" "paid_search" "email")
FIRST_NAMES=("Emma" "Liam" "Olivia" "Noah" "Ava" "Ethan" "Sophia" "Mason" "Isabella" "James" "Mia" "Lucas" "Charlotte" "Henry" "Amelia" "Alexander" "Harper" "Benjamin" "Evelyn" "Daniel")
LAST_NAMES=("Smith" "Johnson" "Williams" "Brown" "Jones" "Garcia" "Miller" "Davis" "Rodriguez" "Martinez" "Anderson" "Taylor" "Thomas" "Moore" "Martin")
CITIES=("New York:NY" "Los Angeles:CA" "Chicago:IL" "Houston:TX" "Phoenix:AZ" "Austin:TX" "Denver:CO" "Seattle:WA")
STREETS=("Main St" "Oak Ave" "Park Rd" "Broadway" "Elm St" "Pine Dr" "Cedar Ln" "Market St")

# Day patterns: target_orders:success_rate
# Index 0 = Apr 5, Index 13 = Apr 18
TARGETS=(12 11 13 12 13 11 12 12 9 6 5 5 9 12)
SUCCESS=(92 93 91 92 93 92 91 92 80 68 60 58 84 91)

# Initialize state: day_index:orders_for_that_day
if [ ! -f "$STATE" ]; then
  echo "0:0" > "$STATE"
fi

IFS=':' read -r DAY_IDX ORDERS_TODAY < "$STATE"

# Safety: if day index is beyond our pattern, stop
if [ "$DAY_IDX" -ge 14 ]; then
  echo "$(date): All 14 days complete! Cron can be removed." >> "$LOG"
  exit 0
fi

# Calculate the actual date for this day index
if [[ "$OSTYPE" == "darwin"* ]]; then
  TARGET_DATE=$(date -j -v+${DAY_IDX}d -f "%Y-%m-%d" "$START_DATE" +"%Y-%m-%d")
else
  TARGET_DATE=$(date -d "$START_DATE + $DAY_IDX days" +"%Y-%m-%d")
fi

# Don't create orders for future dates
if [[ "$TARGET_DATE" > "$TODAY" ]]; then
  echo "$(date): Day $DAY_IDX ($TARGET_DATE) is in the future. Waiting." >> "$LOG"
  exit 0
fi

TARGET_ORDERS=${TARGETS[$DAY_IDX]}
SUCCESS_RATE=${SUCCESS[$DAY_IDX]}

# Check if this day is complete
if [ "$ORDERS_TODAY" -ge "$TARGET_ORDERS" ]; then
  DAY_IDX=$((DAY_IDX + 1))
  ORDERS_TODAY=0
  echo "${DAY_IDX}:${ORDERS_TODAY}" > "$STATE"
  echo "$(date): Day complete. Moving to day $DAY_IDX" >> "$LOG"
  exit 0
fi

# Is this a degradation day?
IS_DEGRADED=0
if [ "$DAY_IDX" -ge 8 ] && [ "$DAY_IDX" -le 11 ]; then
  IS_DEGRADED=1
fi

# Random hour for the order (spread across business hours)
HOUR=$((RANDOM % 14 + 8))
MINUTE=$((RANDOM % 60))
SECOND=$((RANDOM % 60))
ORDER_DATE="${TARGET_DATE}T$(printf '%02d' $HOUR):$(printf '%02d' $MINUTE):$(printf '%02d' $SECOND)+00:00"

# Random selections
PRODUCT_IDX=$((RANDOM % ${#PRODUCTS[@]}))
IFS=':' read -r PROD_NAME PROD_PRICE <<< "${PRODUCTS[$PRODUCT_IDX]}"

# During degradation, bias toward social (affected channel)
if [ "$IS_DEGRADED" -eq 1 ]; then
  ROLL=$((RANDOM % 100))
  if [ "$ROLL" -lt 40 ]; then
    CHANNEL="paid_social"
  elif [ "$ROLL" -lt 60 ]; then
    CHANNEL="direct"
  elif [ "$ROLL" -lt 80 ]; then
    CHANNEL="paid_search"
  else
    CHANNEL="email"
  fi
else
  CHANNEL=${CHANNELS[$((RANDOM % ${#CHANNELS[@]}))]}
fi

FIRST=${FIRST_NAMES[$((RANDOM % ${#FIRST_NAMES[@]}))]}
LAST=${LAST_NAMES[$((RANDOM % ${#LAST_NAMES[@]}))]}
CITY_IDX=$((RANDOM % ${#CITIES[@]}))
IFS=':' read -r CITY PROVINCE <<< "${CITIES[$CITY_IDX]}"
STREET="${STREETS[$((RANDOM % ${#STREETS[@]}))]}"
ADDR_NUM=$((RANDOM % 9000 + 100))
ZIP=$((RANDOM % 90000 + 10000))
EMAIL=$(echo "${FIRST}.${LAST}${RANDOM}@example.com" | tr '[:upper:]' '[:lower:]')

# Determine success/failure
ROLL=$((RANDOM % 100))
if [ "$ROLL" -lt "$SUCCESS_RATE" ]; then
  FIN_STATUS="paid"
  FULFILLMENT='"fulfilled"'
  # 30% of paid orders not yet fulfilled
  if [ $((RANDOM % 100)) -lt 30 ]; then
    FULFILLMENT='null'
  fi
else
  FIN_STATUS="voided"
  FULFILLMENT='null'
fi

# Add second product sometimes (40% chance)
SECOND_ITEM=""
if [ $((RANDOM % 100)) -lt 40 ]; then
  P2_IDX=$((RANDOM % ${#PRODUCTS[@]}))
  IFS=':' read -r P2_NAME P2_PRICE <<< "${PRODUCTS[$P2_IDX]}"
  SECOND_ITEM=",{\"title\": \"${P2_NAME}\", \"price\": \"${P2_PRICE}\", \"quantity\": 1}"
fi

# Note for degraded failed orders
NOTE=""
if [ "$IS_DEGRADED" -eq 1 ] && [ "$FIN_STATUS" = "voided" ]; then
  NOTES=("Payment gateway timeout" "Card processor error" "3DS challenge failed" "Checkout session expired" "Payment method declined")
  NOTE=${NOTES[$((RANDOM % ${#NOTES[@]}))]}
fi

# Build JSON
JSON=$(cat <<ENDJSON
{
  "order": {
    "email": "${EMAIL}",
    "financial_status": "${FIN_STATUS}",
    "fulfillment_status": ${FULFILLMENT},
    "created_at": "${ORDER_DATE}",
    "line_items": [{"title": "${PROD_NAME}", "price": "${PROD_PRICE}", "quantity": 1}${SECOND_ITEM}],
    "source_name": "revshield_gen",
    "tags": "${CHANNEL}",
    "note": "${NOTE}",
    "customer": {
      "first_name": "${FIRST}",
      "last_name": "${LAST}",
      "email": "${EMAIL}"
    },
    "billing_address": {
      "first_name": "${FIRST}",
      "last_name": "${LAST}",
      "address1": "${ADDR_NUM} ${STREET}",
      "city": "${CITY}",
      "province": "${PROVINCE}",
      "country": "US",
      "zip": "${ZIP}"
    },
    "shipping_address": {
      "first_name": "${FIRST}",
      "last_name": "${LAST}",
      "address1": "${ADDR_NUM} ${STREET}",
      "city": "${CITY}",
      "province": "${PROVINCE}",
      "country": "US",
      "zip": "${ZIP}"
    }
  }
}
ENDJSON
)

# Create order
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API}/orders.json" \
  -H "X-Shopify-Access-Token: ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${JSON}" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  ORDERS_TODAY=$((ORDERS_TODAY + 1))
  echo "${DAY_IDX}:${ORDERS_TODAY}" > "$STATE"
  PHASE="BASELINE"
  [ "$IS_DEGRADED" -eq 1 ] && PHASE="DEGRADED"
  [ "$DAY_IDX" -ge 12 ] && PHASE="RECOVERY"
  echo "$(date): ✓ Day $DAY_IDX ($TARGET_DATE) #${ORDERS_TODAY}/${TARGET_ORDERS} | ${FIN_STATUS} | ${CHANNEL} | ${PHASE}" >> "$LOG"
elif [ "$HTTP_CODE" = "429" ]; then
  echo "$(date): ⏳ Rate limited. Retry next cron." >> "$LOG"
else
  BODY=$(echo "$RESPONSE" | sed '$d')
  echo "$(date): ✗ HTTP ${HTTP_CODE}: $(echo $BODY | cut -c1-200)" >> "$LOG"
fi
