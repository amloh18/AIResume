-- SQL Script to add user Jamie L
-- Database: Circle CV App Users Table

-- Note: This script assumes you have a users table with the following structure
-- based on the Mongoose User schema

-- Hash the password: Jamie@123 (using bcrypt with salt rounds 12)
-- In a real implementation, you would hash this password using bcrypt
-- For this example, we'll use a placeholder hash

INSERT INTO users (
    email,
    password,
    first_name,
    last_name,
    avatar,
    is_email_verified,
    email_verification_token,
    email_verification_expires,
    reset_password_token,
    reset_password_expires,
    subscription_plan,
    subscription_status,
    subscription_start_date,
    subscription_end_date,
    subscription_seats,
    subscription_storage_used,
    settings_theme,
    settings_notifications_email,
    settings_notifications_push,
    created_at,
    updated_at
) VALUES (
    'jamie@gmail.com',
    -- Note: In production, this should be a properly hashed password using bcrypt
    -- For demonstration: '$2a$12$' + bcrypt hash of 'Jamie@123'
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/5KqQKqG', -- Jamie@123 hashed
    'Jamie',
    'L',
    NULL, -- avatar (default null)
    false, -- is_email_verified (default false)
    NULL, -- email_verification_token
    NULL, -- email_verification_expires
    NULL, -- reset_password_token
    NULL, -- reset_password_expires
    'basic', -- subscription_plan (default 'basic')
    'inactive', -- subscription_status (default 'inactive')
    CURRENT_TIMESTAMP, -- subscription_start_date (default current timestamp)
    NULL, -- subscription_end_date
    3, -- subscription_seats (default 3)
    0, -- subscription_storage_used (default 0)
    'auto', -- settings_theme (default 'auto')
    true, -- settings_notifications_email (default true)
    true, -- settings_notifications_push (default true)
    CURRENT_TIMESTAMP, -- created_at
    CURRENT_TIMESTAMP  -- updated_at
);

-- Alternative simplified version if you only want to insert the essential fields:
/*
INSERT INTO users (
    email,
    password,
    first_name,
    last_name,
    is_email_verified,
    subscription_plan,
    subscription_status,
    subscription_start_date,
    subscription_seats,
    subscription_storage_used,
    settings_theme,
    settings_notifications_email,
    settings_notifications_push,
    created_at,
    updated_at
) VALUES (
    'jamie@gmail.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/5KqQKqG', -- Jamie@123 hashed
    'Jamie',
    'L',
    false,
    'basic',
    'inactive',
    CURRENT_TIMESTAMP,
    3,
    0,
    'auto',
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
*/

-- Verify the insertion
SELECT 
    id,
    email,
    first_name,
    last_name,
    is_email_verified,
    subscription_plan,
    subscription_status,
    created_at
FROM users 
WHERE email = 'jamie@gmail.com'; 