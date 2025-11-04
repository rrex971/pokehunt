#!/bin/bash

echo "=== Cloud SQL Connection Diagnostics ==="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found!"
    exit 1
fi

echo "✓ .env.local exists"
echo ""

# Source the env file
set -a
source .env.local
set +a

echo "Connection Method: $DB_CONNECTION_METHOD"
echo ""

if [ "$DB_CONNECTION_METHOD" = "connector" ]; then
    echo "=== Cloud SQL Connector Configuration ==="
    echo "Instance Connection Name: $INSTANCE_CONNECTION_NAME"
    echo "Database: $PGDATABASE"
    echo "User: $PGUSER"
    echo "Service Account Key Path: $GOOGLE_APPLICATION_CREDENTIALS"
    echo ""
    
    # Check if service account key file exists
    if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
        echo "❌ GOOGLE_APPLICATION_CREDENTIALS not set!"
        exit 1
    fi
    
    if [ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
        echo "❌ Service account key file not found at: $GOOGLE_APPLICATION_CREDENTIALS"
        exit 1
    fi
    
    echo "✓ Service account key file exists"
    
    # Check if it's valid JSON
    if jq empty "$GOOGLE_APPLICATION_CREDENTIALS" 2>/dev/null; then
        echo "✓ Service account key is valid JSON"
        
        # Extract project ID from key
        PROJECT_ID=$(jq -r '.project_id' "$GOOGLE_APPLICATION_CREDENTIALS")
        CLIENT_EMAIL=$(jq -r '.client_email' "$GOOGLE_APPLICATION_CREDENTIALS")
        echo "  Project ID: $PROJECT_ID"
        echo "  Service Account: $CLIENT_EMAIL"
    else
        echo "⚠️  Could not parse service account key (jq not installed or invalid JSON)"
    fi
    
    echo ""
    echo "Checking if instance connection name format is correct..."
    if [[ $INSTANCE_CONNECTION_NAME =~ ^[^:]+:[^:]+:[^:]+$ ]]; then
        echo "✓ Instance connection name format looks correct"
        IFS=':' read -r proj region inst <<< "$INSTANCE_CONNECTION_NAME"
        echo "  Project: $proj"
        echo "  Region: $region"
        echo "  Instance: $inst"
    else
        echo "❌ Instance connection name format incorrect!"
        echo "   Expected: project-id:region:instance-name"
        echo "   Got: $INSTANCE_CONNECTION_NAME"
        exit 1
    fi
    
else
    echo "=== Direct Connection Configuration ==="
    echo "Host: $PGHOST"
    echo "Port: $PGPORT"
    echo "Database: $PGDATABASE"
    echo "User: $PGUSER"
fi

echo ""
echo "=== Next Steps ==="
echo "1. Make sure your Cloud SQL instance is running"
echo "2. Verify the service account has 'Cloud SQL Client' role"
echo "3. Start dev server: npm run dev"
echo "4. Test connection: http://localhost:3000/api/db-test"
