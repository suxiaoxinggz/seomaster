
import os
import stripe
from ..logger import logger
from ..auth import get_supabase_client
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
        logger.warning(f"⚠️  No user_id found in session {session['id']}")
        return

    logger.info(f"✅ Payment received from {customer_email} (User: {user_id})")

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

    try:
        # Atomic Update via RPC (Transaction)
        supabase.rpc("handle_payment_success", {
            "p_user_id": user_id,
            "p_stripe_customer_id": session.get("customer"),
            "p_new_tier": new_tier,
            "p_credits_to_add": credits_to_add,
            "p_amount_total": amount_total,
            "p_stripe_session_id": session['id']
        }).execute()

        logger.info(f"🚀 User {user_id} upgraded to {new_tier} with +{credits_to_add} credits.")

    except Exception as e:
        logger.error(f"❌ Database Transaction Failed: {e}")
        # In production, you might want to retry or alert admin
        raise HTTPException(status_code=500, detail="Database update failed")
