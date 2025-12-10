
import os
import stripe
from fastapi import APIRouter, Request, Header, HTTPException
from supabase import create_client, Client

router = APIRouter()

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

# Initialize Supabase (Service Role for Admin updates)
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    payload = await request.body()
    event = None

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, endpoint_secret
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        await handle_checkout_completed(session)

    return {"status": "success"}

async def handle_checkout_completed(session):
    """
    Handle successful payment.
    Unlock features or add credits for the user.
    """
    user_id = session.get("client_reference_id")
    customer_email = session.get("customer_details", {}).get("email")
    amount_total = session.get("amount_total") # in cents

    if not user_id:
        print(f"⚠️  No user_id found in session {session['id']}")
        return

    print(f"✅ Payment received from {customer_email} (User: {user_id})")

    # Determine Tier/Credits based on amount (Simple Logic for MVP)
    # 2900 cents ($29) -> Pro
    # 9900 cents ($99) -> Agency
    new_tier = 'free'
    credits_to_add = 0

    if amount_total >= 9900:
        new_tier = 'agency'
        credits_to_add = 1000 # Large amount
    elif amount_total >= 2900:
        new_tier = 'pro'
        credits_to_add = 100 # Standard amount
    else:
        # Maybe a small top-up?
        credits_to_add = 10

    # UPGRADE USER in Supabase
    try:
        # 1. Update Profile (Tier)
        supabase.table("profiles").update({
            "subscription_tier": new_tier,
            "stripe_customer_id": session.get("customer"),
            "subscription_status": "active"
        }).eq("id", user_id).execute()

        # 2. Add Credits (RPC call is better for atomicity, but simple get+update works for MVP)
        # Fetch current credits
        res = supabase.table("profiles").select("credits_balance").eq("id", user_id).single().execute()
        current_credits = res.data.get("credits_balance", 0) or 0
        
        # Update with new balance
        supabase.table("profiles").update({
            "credits_balance": current_credits + credits_to_add
        }).eq("id", user_id).execute()
        
        # 3. Log Usage (Audit)
        supabase.table("usage_logs").insert({
            "user_id": user_id,
            "action": "payment_received",
            "cost": 0,
            "details": {
                "amount": amount_total,
                "tier": new_tier,
                "credits_added": credits_to_add,
                "stripe_session": session['id']
            }
        }).execute()

        print(f"🚀 User {user_id} upgraded to {new_tier} with +{credits_to_add} credits.")

    except Exception as e:
        print(f"❌ Database Update Failed: {e}")
        # In production, you might want to retry or alert admin
        raise HTTPException(status_code=500, detail="Database update failed")
