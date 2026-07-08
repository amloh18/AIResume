#!/bin/bash
# Script to create the CVCircle DynamoDB Single-Table with GSIs and TTL

TABLE_NAME="CVCircleSingleTable"
REGION="us-east-1" # Update this to your preferred AWS region

echo "Step 1: Creating DynamoDB Table: ${TABLE_NAME}..."

aws dynamodb create-table \
    --table-name "$TABLE_NAME" \
    --region "$REGION" \
    --attribute-definitions \
        AttributeName=PK,AttributeType=S \
        AttributeName=SK,AttributeType=S \
        AttributeName=GSI1-PK,AttributeType=S \
        AttributeName=GSI1-SK,AttributeType=S \
        AttributeName=GSI2-PK,AttributeType=S \
        AttributeName=GSI2-SK,AttributeType=S \
        AttributeName=GSI3-PK,AttributeType=S \
        AttributeName=GSI3-SK,AttributeType=S \
    --key-schema \
        AttributeName=PK,KeyType=HASH \
        AttributeName=SK,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes \
        "[
            {
                \"IndexName\": \"GSI1\",
                \"KeySchema\": [
                    {\"AttributeName\": \"GSI1-PK\", \"KeyType\": \"HASH\"},
                    {\"AttributeName\": \"GSI1-SK\", \"KeyType\": \"RANGE\"}
                ],
                \"Projection\": {\"ProjectionType\": \"ALL\"}
            },
            {
                \"IndexName\": \"GSI2\",
                \"KeySchema\": [
                    {\"AttributeName\": \"GSI2-PK\", \"KeyType\": \"HASH\"},
                    {\"AttributeName\": \"GSI2-SK\", \"KeyType\": \"RANGE\"}
                ],
                \"Projection\": {\"ProjectionType\": \"ALL\"}
            },
            {
                \"IndexName\": \"GSI3\",
                \"KeySchema\": [
                    {\"AttributeName\": \"GSI3-PK\", \"KeyType\": \"HASH\"},
                    {\"AttributeName\": \"GSI3-SK\", \"KeyType\": \"RANGE\"}
                ],
                \"Projection\": {\"ProjectionType\": \"ALL\"}
            }
        ]"

echo "Waiting for table active status..."
aws dynamodb wait table-exists --table-name "$TABLE_NAME" --region "$REGION"

echo "Step 2: Enabling TTL on 'expiresAt' attribute..."
aws dynamodb update-time-to-live \
    --table-name "$TABLE_NAME" \
    --region "$REGION" \
    --time-to-live-specification "Enabled=true,AttributeName=expiresAt"

echo "Table setup complete!"
