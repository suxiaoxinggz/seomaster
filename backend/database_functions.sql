-- Create a function to handle subscription updates atomically
create or replace function handle_payment_success(
  p_user_id uuid,
  p_stripe_customer_id text,
  p_new_tier text,
  p_credits_to_add int,
  p_amount_total int,
  p_stripe_session_id text
)
returns void
language plpgsql
security definer
as $$
begin
  -- 1. Update Profile (Tier & Customer ID)
  update profiles
  set 
    subscription_tier = p_new_tier,
    stripe_customer_id = p_stripe_customer_id,
    subscription_status = 'active',
    credits_balance = credits_balance + p_credits_to_add, -- Atomic increment
    updated_at = now()
  where id = p_user_id;

  -- 2. Log Usage
  insert into usage_logs (user_id, action, cost, details)
  values (
    p_user_id, 
    'payment_received', 
    0, 
    jsonb_build_object(
      'amount', p_amount_total,
      'tier', p_new_tier,
      'credits_added', p_credits_to_add,
      'stripe_session', p_stripe_session_id
    )
  );
end;
$$;
