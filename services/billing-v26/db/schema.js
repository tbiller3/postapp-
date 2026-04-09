/*
Recommended tables

users
- id
- email
- name
- stripe_customer_id
- plan_name
- subscription_status
- created_at
- updated_at

subscriptions
- id
- user_id
- stripe_subscription_id
- stripe_price_id
- plan_name
- status
- current_period_end
- created_at
- updated_at

app_projects
- id
- user_id
- name
- platform
- status
- readiness_score
- created_at
- updated_at

purchases
- id
- user_id
- project_id
- stripe_checkout_session_id
- stripe_payment_intent_id
- purchase_type
- amount
- currency
- created_at

submission_credits
- id
- user_id
- project_id
- type
- status
- created_at
- used_at
- expires_at
*/
