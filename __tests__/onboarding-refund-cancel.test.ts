import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Shared in-memory state that the mock supabase client reads/writes.
// ---------------------------------------------------------------------------
const state = {
  member: {
    id: 'm-1',
    user_id: 'u-1',
    email: 'test@example.com',
    first_name: 'Jane',
    last_name: 'Doe',
    phone: '555-1234',
    company_name: 'Test Co',
    status: 'approved' as string,
    application_id: 'app-1',
    designation: 'dedicated_desk',
    monthly_cost_cents: 50000,
    required_docs_complete: true,
    agreement_signed: true,
    onboarding_unlocked: false,
    stripe_customer_id: null as string | null,
    stripe_subscription_id: null as string | null,
    subscription_status: null as string | null,
    next_charge_date: null as string | null,
    cancellation_notice_received_at: null as string | null,
    cancellation_effective_date: null as string | null,
    last_month_credit_invoice_item_id: null as string | null,
    access_code: null as string | null,
    access_code_issued_at: null as string | null,
  },
  payment: null as any,
  lastMemberUpdate: null as any,
  lastPaymentUpdate: null as any,
  lastPaymentUpsert: null as any,
  feeAgreement: { metadata: { payment_method: 'card' } } as any,
  isAdmin: true,
};

function resetState() {
  state.member = {
    id: 'm-1',
    user_id: 'u-1',
    email: 'test@example.com',
    first_name: 'Jane',
    last_name: 'Doe',
    phone: '555-1234',
    company_name: 'Test Co',
    status: 'approved',
    application_id: 'app-1',
    designation: 'dedicated_desk',
    monthly_cost_cents: 50000,
    required_docs_complete: true,
    agreement_signed: true,
    onboarding_unlocked: false,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: null,
    next_charge_date: null,
    cancellation_notice_received_at: null,
    cancellation_effective_date: null,
    last_month_credit_invoice_item_id: null,
    access_code: null,
    access_code_issued_at: null,
  };
  state.payment = null;
  state.lastMemberUpdate = null;
  state.lastPaymentUpdate = null;
  state.lastPaymentUpsert = null;
  state.feeAgreement = { metadata: { payment_method: 'card' } };
  state.isAdmin = true;
}

// ---------------------------------------------------------------------------
// Mock supabase
// ---------------------------------------------------------------------------
vi.mock('@/lib/portal/supabaseAdmin', () => ({
  getServiceSupabase: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'u-1' } },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table === 'members') {
        return {
          select: () => ({
            eq: (_col: string, _val: string) => ({
              single: () => Promise.resolve({ data: { ...state.member }, error: null }),
              maybeSingle: () => Promise.resolve({ data: { ...state.member }, error: null }),
            }),
          }),
          update: (fields: any) => {
            state.lastMemberUpdate = fields;
            Object.assign(state.member, fields);
            return {
              eq: () => Promise.resolve({ data: null, error: null }),
            };
          },
        };
      }
      if (table === 'member_agreements') {
        return {
          select: () => ({
            eq: (_col: string, _val: string) => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: state.feeAgreement, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'payment_history') {
        return {
          select: () => ({
            eq: (_col: string, _val: string) => ({
              eq: (_col2: string, _val2: string) => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () => Promise.resolve({ data: state.payment, error: null }),
                  }),
                }),
              }),
            }),
          }),
          update: (fields: any) => {
            state.lastPaymentUpdate = fields;
            return {
              eq: () => Promise.resolve({ data: null, error: null }),
            };
          },
          upsert: (row: any, _opts?: any) => {
            state.lastPaymentUpsert = row;
            return Promise.resolve({ data: null, error: null });
          },
        };
      }
      if (table === 'admin_users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: state.isAdmin ? { user_id: 'u-1' } : null,
                }),
            }),
          }),
        };
      }
      return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      };
    },
  }),
}));

// ---------------------------------------------------------------------------
// Mock Stripe
// ---------------------------------------------------------------------------
const mockStripeCustomerCreate = vi.fn().mockResolvedValue({ id: 'cus_test123' });
const mockStripeCheckoutCreate = vi.fn().mockResolvedValue({
  url: 'https://checkout.stripe.com/test',
  id: 'cs_test123',
});
const mockStripeSubscriptionUpdate = vi.fn().mockResolvedValue({
  id: 'sub_test123',
  cancel_at: 1700000000,
  current_period_end: 1700000000,
  cancel_at_period_end: false,
});
// Default: an active subscription with current_period_end on April 1, 2026
// (unix 1775347200) — handlers compute the final-month-end from this.
const mockStripeSubscriptionRetrieve = vi.fn().mockResolvedValue({
  id: 'sub_test123',
  status: 'active',
  customer: 'cus_test123',
  current_period_end: 1775347200,
  cancel_at: null,
  cancel_at_period_end: false,
  metadata: {},
});
const mockStripeSubscriptionCreate = vi.fn().mockResolvedValue({
  id: 'sub_test123',
  status: 'active',
});
const mockStripePaymentIntentRetrieve = vi.fn().mockResolvedValue({
  id: 'pi_test123',
  payment_method: 'pm_test123',
});
const mockStripeCustomerUpdate = vi.fn().mockResolvedValue({ id: 'cus_test123' });
const mockStripeRefundCreate = vi.fn().mockResolvedValue({
  id: 're_test123',
  amount: 50000,
  status: 'succeeded',
});
const mockStripeInvoiceItemsList = vi.fn().mockResolvedValue({ data: [] });
const mockStripeInvoiceItemsCreate = vi
  .fn()
  .mockResolvedValue({ id: 'ii_deposit_test' });
const mockStripeInvoiceItemsDel = vi.fn().mockResolvedValue({ deleted: true });
const mockStripeWebhookConstruct = vi.fn();

vi.mock('stripe', () => {
  return {
    default: class StripeMock {
      customers = {
        create: mockStripeCustomerCreate,
        update: mockStripeCustomerUpdate,
      };
      checkout = { sessions: { create: mockStripeCheckoutCreate } };
      subscriptions = {
        create: mockStripeSubscriptionCreate,
        update: mockStripeSubscriptionUpdate,
        retrieve: mockStripeSubscriptionRetrieve,
      };
      paymentIntents = { retrieve: mockStripePaymentIntentRetrieve };
      refunds = { create: mockStripeRefundCreate };
      invoiceItems = {
        list: mockStripeInvoiceItemsList,
        create: mockStripeInvoiceItemsCreate,
        del: mockStripeInvoiceItemsDel,
      };
      webhooks = { constructEvent: mockStripeWebhookConstruct };
    },
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeAuthReq(url = 'http://localhost/api/test', method = 'POST', body?: any) {
  const init: RequestInit = {
    method,
    headers: { authorization: 'Bearer test-token' },
  };
  if (body) {
    (init.headers as any)['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  return new NextRequest(url, init);
}

function makeUnauthReq(url = 'http://localhost/api/test') {
  return new NextRequest(url, { method: 'POST' });
}

function makeWebhookReq(body: string) {
  return new NextRequest('http://localhost/api/webhooks/subscriptions', {
    method: 'POST',
    headers: {
      'stripe-signature': 'sig_test',
      'content-type': 'application/json',
    },
    body,
  });
}

// ---------------------------------------------------------------------------
// Import route handlers (after mocks are registered)
// ---------------------------------------------------------------------------
import { POST as createSubscription } from '@/app/api/portal/create-subscription/route';
import { POST as cancelSubscription } from '@/app/api/portal/cancel-subscription/route';
import { POST as refundPayment } from '@/app/api/admin/members/[id]/refund/route';
import { POST as webhookHandler } from '@/app/api/webhooks/subscriptions/route';

// ---------------------------------------------------------------------------
// Set required env vars
// ---------------------------------------------------------------------------
beforeEach(() => {
  resetState();
  mockStripeCustomerCreate.mockClear();
  mockStripeCheckoutCreate.mockClear();
  mockStripeSubscriptionUpdate.mockClear();
  mockStripeSubscriptionRetrieve.mockClear();
  mockStripeSubscriptionCreate.mockClear();
  mockStripeSubscriptionCreate.mockResolvedValue({
    id: 'sub_test123',
    status: 'active',
  });
  mockStripePaymentIntentRetrieve.mockClear();
  mockStripePaymentIntentRetrieve.mockResolvedValue({
    id: 'pi_test123',
    payment_method: 'pm_test123',
  });
  mockStripeCustomerUpdate.mockClear();
  mockStripeRefundCreate.mockClear();
  mockStripeInvoiceItemsList.mockClear();
  mockStripeInvoiceItemsList.mockResolvedValue({ data: [] });
  mockStripeInvoiceItemsCreate.mockClear();
  mockStripeInvoiceItemsCreate.mockResolvedValue({ id: 'ii_deposit_test' });
  mockStripeInvoiceItemsDel.mockClear();
  mockStripeInvoiceItemsDel.mockResolvedValue({ deleted: true });
  mockStripeWebhookConstruct.mockClear();
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
  process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET = 'whsec_test';
  process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
});

// ===========================================================================
// 1) CREATE SUBSCRIPTION (pre-conditions & checkout session)
// ===========================================================================
describe('create-subscription', () => {
  it('returns 400 if agreement not signed', async () => {
    state.member.agreement_signed = false;
    const res = await createSubscription(makeAuthReq());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/agreement/i);
  });

  it('returns 400 if no monthly cost assigned', async () => {
    state.member.monthly_cost_cents = null as any;
    const res = await createSubscription(makeAuthReq());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/monthly cost/i);
  });

  it('returns 400 if subscription already exists', async () => {
    state.member.stripe_subscription_id = 'sub_existing';
    const res = await createSubscription(makeAuthReq());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/already exists/i);
  });

  it('creates a Stripe customer and checkout session on first call', async () => {
    const res = await createSubscription(makeAuthReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe('https://checkout.stripe.com/test');
    expect(json.id).toBe('cs_test123');
    expect(mockStripeCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        metadata: { member_id: 'm-1' },
      })
    );
    expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        customer: 'cus_test123',
      })
    );
  });

  it('reuses existing stripe_customer_id and does not create a new customer', async () => {
    state.member.stripe_customer_id = 'cus_existing';
    const res = await createSubscription(makeAuthReq());
    expect(res.status).toBe(200);
    expect(mockStripeCustomerCreate).not.toHaveBeenCalled();
    expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing' })
    );
  });

  it('uses card+link payment methods by default', async () => {
    await createSubscription(makeAuthReq());
    expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_types: ['card', 'link'],
      })
    );
  });

  it('uses us_bank_account+card payment methods for ACH members', async () => {
    state.feeAgreement = { metadata: { payment_method: 'ach' } };
    await createSubscription(makeAuthReq());
    expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_types: ['us_bank_account', 'card'],
      })
    );
  });

  it('includes proration metadata in the checkout session', async () => {
    await createSubscription(makeAuthReq());
    const call = mockStripeCheckoutCreate.mock.calls[0][0];
    expect(call.metadata.prorated_first_charge_cents).toBeDefined();
    expect(Number(call.metadata.prorated_first_charge_cents)).toBeGreaterThan(0);
    expect(call.metadata.order_type).toBe('membership_subscription');
    expect(call.metadata.member_id).toBe('m-1');
  });

  it('charges prorated-first-month + last-month-deposit + 3.5% card fee upfront', async () => {
    await createSubscription(makeAuthReq());
    const call = mockStripeCheckoutCreate.mock.calls[0][0];
    // Three one-time line items for card-paying members: prorated first
    // month, last-month deposit, and the 3.5% card processing fee that
    // the member signed off on in their Fee Agreement. The recurring
    // subscription is created later by the webhook, not by Checkout, so
    // no recurring or subscription_data lives on this session.
    expect(call.line_items).toHaveLength(3);
    expect(call.line_items[0].price_data.recurring).toBeUndefined();
    const prorated = Number(call.metadata.prorated_first_charge_cents);
    expect(call.line_items[0].price_data.unit_amount).toBe(prorated);
    expect(call.line_items[1].price_data.recurring).toBeUndefined();
    expect(call.line_items[1].price_data.unit_amount).toBe(50000);
    const expectedFee = Math.round((prorated + 50000) * 0.035);
    expect(call.line_items[2].price_data.unit_amount).toBe(expectedFee);
    expect(Number(call.metadata.cc_fee_cents)).toBe(expectedFee);
    expect(call.subscription_data).toBeUndefined();
    // Save the payment method off-session so the webhook can attach it
    // to the subscription it creates.
    expect(call.payment_intent_data?.setup_future_usage).toBe('off_session');
    // Metadata reflects the expected initial charge and tells the
    // webhook to create the subscription afterward.
    expect(call.metadata.create_subscription).toBe('1');
    expect(call.metadata.monthly_cost_cents).toBe('50000');
    expect(call.metadata.last_month_deposit_cents).toBe('50000');
    expect(Number(call.metadata.initial_total_cents)).toBe(prorated + 50000 + expectedFee);
  });

  it('omits the 3.5% card fee for ACH members', async () => {
    state.feeAgreement = { metadata: { payment_method: 'ach' } };
    await createSubscription(makeAuthReq());
    const call = mockStripeCheckoutCreate.mock.calls[0][0];
    expect(call.line_items).toHaveLength(2);
    expect(call.metadata.cc_fee_cents).toBe('0');
    const prorated = Number(call.metadata.prorated_first_charge_cents);
    expect(Number(call.metadata.initial_total_cents)).toBe(prorated + 50000);
  });

  it('anchors billing cycle to 1st of the month after the start month', async () => {
    await createSubscription(makeAuthReq());
    const call = mockStripeCheckoutCreate.mock.calls[0][0];
    const anchorDate = new Date(
      Number(call.metadata.billing_cycle_anchor) * 1000
    );
    expect(anchorDate.getUTCDate()).toBe(1);
    expect(anchorDate.getUTCHours()).toBe(12);
  });
});

// ===========================================================================
// 2) WEBHOOK: checkout.session.completed — onboarding setup after payment
// ===========================================================================
describe('webhook – checkout.session.completed (onboarding setup)', () => {
  function makeMembershipSession(overrides: any = {}) {
    return {
      type: 'checkout.session.completed',
      data: {
        object: {
          mode: 'payment',
          customer: 'cus_test123',
          payment_intent: 'pi_test123',
          metadata: {
            order_type: 'membership_subscription',
            member_id: 'm-1',
            create_subscription: '1',
            monthly_cost_cents: '50000',
            billing_cycle_anchor: '1700000000',
            last_month_deposit_cents: '50000',
            selected_payment_method: 'card',
            start_date: '2026-05-15',
            ...overrides.metadata,
          },
          ...overrides.object,
        },
      },
    };
  }

  it('creates the subscription via API and unlocks onboarding after checkout', async () => {
    const event = makeMembershipSession();
    mockStripeWebhookConstruct.mockReturnValue(event);

    const res = await webhookHandler(makeWebhookReq(JSON.stringify(event)));
    expect(res.status).toBe(200);

    // The webhook pulls the saved payment method off the PaymentIntent,
    // pins it as the customer's invoice default, then creates the
    // subscription with billing_cycle_anchor + proration_behavior:'none'.
    expect(mockStripePaymentIntentRetrieve).toHaveBeenCalledWith('pi_test123');
    expect(mockStripeCustomerUpdate).toHaveBeenCalledWith(
      'cus_test123',
      expect.objectContaining({
        invoice_settings: { default_payment_method: 'pm_test123' },
      })
    );
    expect(mockStripeSubscriptionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_test123',
        billing_cycle_anchor: 1700000000,
        proration_behavior: 'none',
        default_payment_method: 'pm_test123',
        collection_method: 'charge_automatically',
      })
    );
    const subCall = mockStripeSubscriptionCreate.mock.calls[0][0];
    expect(subCall.items).toHaveLength(1);
    expect(subCall.items[0].price_data.recurring).toEqual({ interval: 'month' });
    expect(subCall.items[0].price_data.unit_amount).toBe(50000);

    expect(state.lastMemberUpdate).toEqual(
      expect.objectContaining({
        stripe_customer_id: 'cus_test123',
        stripe_subscription_id: 'sub_test123',
        subscription_status: 'active',
        onboarding_unlocked: true,
        status: 'active',
      })
    );
  });

  it('skips non-membership checkout sessions', async () => {
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { order_type: 'something_else' },
          customer: 'cus_test123',
          subscription: 'sub_test123',
        },
      },
    };
    mockStripeWebhookConstruct.mockReturnValue(event);

    const res = await webhookHandler(makeWebhookReq(JSON.stringify(event)));
    expect(res.status).toBe(200);
    expect(state.lastMemberUpdate).toBeNull();
    expect(mockStripeSubscriptionCreate).not.toHaveBeenCalled();
  });

  it('handles missing member_id gracefully', async () => {
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          mode: 'payment',
          metadata: { order_type: 'membership_subscription' },
          customer: 'cus_test123',
          payment_intent: 'pi_test123',
        },
      },
    };
    mockStripeWebhookConstruct.mockReturnValue(event);

    const res = await webhookHandler(makeWebhookReq(JSON.stringify(event)));
    expect(res.status).toBe(200);
    expect(state.lastMemberUpdate).toBeNull();
    expect(mockStripeSubscriptionCreate).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 3) WEBHOOK: invoice.paid — payment history recorded
// ===========================================================================
describe('webhook – invoice.paid (payment recording)', () => {
  it('records a succeeded payment in payment_history', async () => {
    state.member.stripe_customer_id = 'cus_test123';
    const event = {
      type: 'invoice.paid',
      data: {
        object: {
          id: 'inv_test123',
          customer: 'cus_test123',
          payment_intent: 'pi_test123',
          amount_paid: 50000,
          currency: 'usd',
          description: 'Membership',
          invoice_pdf: 'https://stripe.com/invoice.pdf',
          status_transitions: { paid_at: 1700000000 },
        },
      },
    };
    mockStripeWebhookConstruct.mockReturnValue(event);

    const res = await webhookHandler(makeWebhookReq(JSON.stringify(event)));
    expect(res.status).toBe(200);
    expect(state.lastPaymentUpsert).toEqual(
      expect.objectContaining({
        stripe_invoice_id: 'inv_test123',
        stripe_payment_intent_id: 'pi_test123',
        amount_cents: 50000,
        currency: 'usd',
        status: 'succeeded',
      })
    );
  });

  it('records a failed payment with status "failed"', async () => {
    state.member.stripe_customer_id = 'cus_test123';
    const event = {
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'inv_fail123',
          customer: 'cus_test123',
          payment_intent: 'pi_fail123',
          amount_paid: 0,
          amount_due: 50000,
          currency: 'usd',
          description: null,
          invoice_pdf: null,
          status_transitions: {},
        },
      },
    };
    mockStripeWebhookConstruct.mockReturnValue(event);

    const res = await webhookHandler(makeWebhookReq(JSON.stringify(event)));
    expect(res.status).toBe(200);
    expect(state.lastPaymentUpsert).toEqual(
      expect.objectContaining({
        status: 'failed',
        amount_cents: 50000,
      })
    );
  });

  it('records ACH pending payment with status "pending"', async () => {
    state.member.stripe_customer_id = 'cus_test123';
    const event = {
      type: 'invoice.payment_action_required',
      data: {
        object: {
          id: 'inv_ach123',
          customer: 'cus_test123',
          payment_intent: 'pi_ach123',
          amount_paid: 0,
          amount_due: 50000,
          currency: 'usd',
          description: null,
          invoice_pdf: null,
          status_transitions: {},
        },
      },
    };
    mockStripeWebhookConstruct.mockReturnValue(event);

    const res = await webhookHandler(makeWebhookReq(JSON.stringify(event)));
    expect(res.status).toBe(200);
    expect(state.lastPaymentUpsert).toEqual(
      expect.objectContaining({
        status: 'pending',
      })
    );
  });
});

// ===========================================================================
// 4) WEBHOOK: subscription events — sync status
// ===========================================================================
describe('webhook – subscription events', () => {
  it('syncs subscription status on customer.subscription.updated', async () => {
    const event = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test123',
          metadata: { member_id: 'm-1' },
          status: 'active',
          current_period_end: 1700000000,
        },
      },
    };
    mockStripeWebhookConstruct.mockReturnValue(event);

    const res = await webhookHandler(makeWebhookReq(JSON.stringify(event)));
    expect(res.status).toBe(200);
    expect(state.lastMemberUpdate).toEqual(
      expect.objectContaining({
        stripe_subscription_id: 'sub_test123',
        subscription_status: 'active',
      })
    );
    // next_charge_date should be set from current_period_end
    expect(state.lastMemberUpdate.next_charge_date).toBeTruthy();
  });

  it('does not touch member status on a non-cancellation update', async () => {
    state.member.status = 'active';
    const event = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test123',
          metadata: { member_id: 'm-1' },
          status: 'active',
          current_period_end: 1700000000,
        },
      },
    };
    mockStripeWebhookConstruct.mockReturnValue(event);

    const res = await webhookHandler(makeWebhookReq(JSON.stringify(event)));
    expect(res.status).toBe(200);
    // No cancellation signal -> status must be left untouched.
    expect(state.lastMemberUpdate.status).toBeUndefined();
  });

  it('flips member status to cancelled when the sub is scheduled to cancel', async () => {
    // Regression: member (or admin) cancels directly in Stripe, so the sub is
    // still 'active' but has cancel_at_period_end / cancel_at set. The member
    // row must follow into 'cancelled' instead of staying 'active'.
    state.member.status = 'active';
    const event = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test123',
          metadata: { member_id: 'm-1' },
          status: 'active',
          current_period_end: 1700000000,
          cancel_at_period_end: true,
          cancel_at: 1777939199, // 2026-05-04 UTC
          canceled_at: 1775347200,
        },
      },
    };
    mockStripeWebhookConstruct.mockReturnValue(event);

    const res = await webhookHandler(makeWebhookReq(JSON.stringify(event)));
    expect(res.status).toBe(200);
    expect(state.lastMemberUpdate).toEqual(
      expect.objectContaining({
        status: 'cancelled',
        subscription_status: 'active',
        cancellation_effective_date: '2026-05-04',
      })
    );
    expect(state.lastMemberUpdate.cancellation_notice_received_at).toBeTruthy();
    expect(state.member.status).toBe('cancelled');
  });

  it('handles subscription deleted event and marks the member cancelled', async () => {
    state.member.status = 'active';
    const event = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_test123',
          metadata: { member_id: 'm-1' },
          status: 'canceled',
          current_period_end: 1700000000,
          ended_at: 1777939199, // 2026-05-04 UTC
          canceled_at: 1775347200,
        },
      },
    };
    mockStripeWebhookConstruct.mockReturnValue(event);

    const res = await webhookHandler(makeWebhookReq(JSON.stringify(event)));
    expect(res.status).toBe(200);
    expect(state.lastMemberUpdate).toEqual(
      expect.objectContaining({
        subscription_status: 'canceled',
        status: 'cancelled',
        stripe_subscription_id: null,
        cancellation_effective_date: '2026-05-04',
      })
    );
  });
});

// ===========================================================================
// 5) REFUND (admin-only)
// ===========================================================================
const refundParams = { params: Promise.resolve({ id: 'm-1' }) };

describe('refund (admin-only)', () => {
  it('returns 403 for non-admin callers', async () => {
    state.isAdmin = false;
    const res = await refundPayment(
      makeAuthReq('http://localhost/api/admin/members/m-1/refund'),
      refundParams
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 when no succeeded payment exists', async () => {
    state.payment = null;
    const res = await refundPayment(
      makeAuthReq('http://localhost/api/admin/members/m-1/refund'),
      refundParams
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/no refundable payment/i);
  });

  it('returns 400 when payment has no payment_intent', async () => {
    state.payment = {
      id: 'ph-1',
      member_id: 'm-1',
      stripe_payment_intent_id: null,
      amount_cents: 50000,
      status: 'succeeded',
    };
    const res = await refundPayment(
      makeAuthReq('http://localhost/api/admin/members/m-1/refund'),
      refundParams
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/payment intent/i);
  });

  it('issues a full refund and updates payment_history status', async () => {
    state.payment = {
      id: 'ph-1',
      member_id: 'm-1',
      stripe_payment_intent_id: 'pi_test123',
      amount_cents: 50000,
      status: 'succeeded',
    };

    const res = await refundPayment(
      makeAuthReq('http://localhost/api/admin/members/m-1/refund'),
      refundParams
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.refund_id).toBe('re_test123');
    expect(json.amount_refunded).toBe(50000);
    expect(json.status).toBe('succeeded');

    // Verify Stripe was called with the correct payment intent
    expect(mockStripeRefundCreate).toHaveBeenCalledWith({
      payment_intent: 'pi_test123',
    });

    // Verify local payment_history was updated
    expect(state.lastPaymentUpdate).toEqual({ status: 'refunded' });
  });

  it('returns 401 for unauthenticated requests', async () => {
    const res = await refundPayment(
      makeUnauthReq('http://localhost/api/admin/members/m-1/refund'),
      refundParams
    );
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// 6) CANCEL SUBSCRIPTION
// ===========================================================================
describe('cancel-subscription', () => {
  it('returns 400 when member has no subscription', async () => {
    state.member.stripe_subscription_id = null;
    const res = await cancelSubscription(
      makeAuthReq('http://localhost/api/portal/cancel-subscription')
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/no active subscription/i);
  });

  it('credits the upcoming invoice and hard-cancels at end of final calendar month', async () => {
    state.member.stripe_subscription_id = 'sub_test123';
    state.member.monthly_cost_cents = 50000;
    // current_period_end = April 1, 2026 → final month = April → cancel_at = April 30, 23:59:59 UTC.
    const expectedCancelAt = Math.floor(Date.UTC(2026, 4, 0, 23, 59, 59) / 1000);

    const res = await cancelSubscription(
      makeAuthReq('http://localhost/api/portal/cancel-subscription')
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.cancellation_effective_date).toBe('2026-04-30');
    expect(json.last_month_credit_invoice_item_id).toBe('ii_deposit_test');

    // Verify the last-month deposit was credited as a negative invoice item
    // attached to the subscription (so it auto-applies to the next draft).
    expect(mockStripeInvoiceItemsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_test123',
        subscription: 'sub_test123',
        amount: -50000,
        currency: 'usd',
      })
    );

    // Verify the subscription was updated with a hard cancel_at, not
    // cancel_at_period_end (which would have ended access too early).
    expect(mockStripeSubscriptionUpdate).toHaveBeenCalledWith(
      'sub_test123',
      expect.objectContaining({
        cancel_at: expectedCancelAt,
        cancel_at_period_end: false,
        proration_behavior: 'none',
      })
    );

    // Verify local member record reflects the cancellation tracking fields.
    expect(state.lastMemberUpdate).toEqual(
      expect.objectContaining({
        subscription_status: 'cancel_at_period_end',
        status: 'cancelled',
        cancellation_effective_date: '2026-04-30',
        last_month_credit_invoice_item_id: 'ii_deposit_test',
      })
    );
    expect(state.lastMemberUpdate.cancellation_notice_received_at).toBeTruthy();
  });

  it('is idempotent when subscription is already cancelled', async () => {
    state.member.stripe_subscription_id = 'sub_test123';
    state.member.monthly_cost_cents = 50000;
    mockStripeSubscriptionRetrieve.mockResolvedValueOnce({
      id: 'sub_test123',
      status: 'active',
      customer: 'cus_test123',
      current_period_end: 1775347200,
      cancel_at: 1777939199,
      cancel_at_period_end: false,
      metadata: {},
    });

    const res = await cancelSubscription(
      makeAuthReq('http://localhost/api/portal/cancel-subscription')
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.already_cancelled).toBe(true);
    // No new credit should have been issued on the idempotent path.
    expect(mockStripeInvoiceItemsCreate).not.toHaveBeenCalled();
    expect(mockStripeSubscriptionUpdate).not.toHaveBeenCalled();
  });

  it('reconciles a drifted local status when Stripe is already cancelled', async () => {
    // Regression: the member cancelled on their end (or it was cancelled
    // directly in Stripe) so Stripe shows cancel_at, but the local member row
    // never got flipped and still reads 'active'. Cancelling again must repair
    // the local status instead of just reporting "already cancelled" and
    // leaving the member stuck as active.
    state.member.stripe_subscription_id = 'sub_test123';
    state.member.monthly_cost_cents = 50000;
    state.member.status = 'active';
    state.member.cancellation_effective_date = null;
    // 1777939199 -> 2026-05-04 (UTC)
    mockStripeSubscriptionRetrieve.mockResolvedValueOnce({
      id: 'sub_test123',
      status: 'active',
      customer: 'cus_test123',
      current_period_end: 1775347200,
      cancel_at: 1777939199,
      cancel_at_period_end: false,
      metadata: {},
    });

    const res = await cancelSubscription(
      makeAuthReq('http://localhost/api/portal/cancel-subscription')
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.already_cancelled).toBe(true);
    expect(json.reconciled).toBe(true);

    // Local record must now reflect the cancellation.
    expect(state.member.status).toBe('cancelled');
    expect(state.lastMemberUpdate).toEqual(
      expect.objectContaining({
        status: 'cancelled',
        subscription_status: 'cancel_at_period_end',
        cancellation_effective_date: '2026-05-04',
      })
    );
    // Must not re-credit the invoice or re-touch the cancel schedule.
    expect(mockStripeInvoiceItemsCreate).not.toHaveBeenCalled();
    expect(mockStripeSubscriptionUpdate).not.toHaveBeenCalled();
  });

  it('does not re-update when local status already matches Stripe', async () => {
    // When the local row is already in sync, the idempotent path should be a
    // true no-op (no DB write, no reconcile flag).
    state.member.stripe_subscription_id = 'sub_test123';
    state.member.monthly_cost_cents = 50000;
    state.member.status = 'cancelled';
    state.member.cancellation_effective_date = '2026-05-04';
    mockStripeSubscriptionRetrieve.mockResolvedValueOnce({
      id: 'sub_test123',
      status: 'active',
      customer: 'cus_test123',
      current_period_end: 1775347200,
      cancel_at: 1777939199,
      cancel_at_period_end: false,
      metadata: {},
    });

    const res = await cancelSubscription(
      makeAuthReq('http://localhost/api/portal/cancel-subscription')
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.already_cancelled).toBe(true);
    expect(json.reconciled).toBe(false);
    expect(state.lastMemberUpdate).toBeNull();
  });

  it('returns 401 for unauthenticated requests', async () => {
    const res = await cancelSubscription(
      makeUnauthReq('http://localhost/api/portal/cancel-subscription')
    );
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// 7) FULL FLOW: payment → onboarding setup → refund → cancel
// ===========================================================================
describe('full flow: subscribe → onboarding → refund → cancel', () => {
  it('completes the entire onboarding, refund, and cancellation flow', async () => {
    // Step 1: Create subscription checkout session
    const subRes = await createSubscription(makeAuthReq());
    expect(subRes.status).toBe(200);
    const subJson = await subRes.json();
    expect(subJson.url).toBeTruthy();

    // Step 2: Simulate webhook — checkout completed, onboarding unlocked
    const checkoutEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { order_type: 'membership_subscription', member_id: 'm-1' },
          customer: 'cus_test123',
          subscription: 'sub_test123',
        },
      },
    };
    mockStripeWebhookConstruct.mockReturnValue(checkoutEvent);
    const webhookRes = await webhookHandler(makeWebhookReq(JSON.stringify(checkoutEvent)));
    expect(webhookRes.status).toBe(200);

    // Verify onboarding is now set up
    expect(state.member.onboarding_unlocked).toBe(true);
    expect(state.member.status).toBe('active');
    expect(state.member.stripe_customer_id).toBe('cus_test123');
    expect(state.member.stripe_subscription_id).toBe('sub_test123');
    expect(state.member.subscription_status).toBe('active');

    // Step 3: Simulate webhook — invoice paid
    state.lastPaymentUpsert = null;
    const invoiceEvent = {
      type: 'invoice.paid',
      data: {
        object: {
          id: 'inv_first',
          customer: 'cus_test123',
          payment_intent: 'pi_first',
          amount_paid: 50000,
          currency: 'usd',
          description: 'Membership',
          invoice_pdf: 'https://stripe.com/inv.pdf',
          status_transitions: { paid_at: Math.floor(Date.now() / 1000) },
        },
      },
    };
    mockStripeWebhookConstruct.mockReturnValue(invoiceEvent);
    const invRes = await webhookHandler(makeWebhookReq(JSON.stringify(invoiceEvent)));
    expect(invRes.status).toBe(200);
    expect(state.lastPaymentUpsert).toEqual(
      expect.objectContaining({
        status: 'succeeded',
        stripe_invoice_id: 'inv_first',
        stripe_payment_intent_id: 'pi_first',
      })
    );

    // Step 4: Admin issues immediate refund
    state.payment = {
      id: 'ph-1',
      member_id: 'm-1',
      stripe_payment_intent_id: 'pi_first',
      amount_cents: 50000,
      status: 'succeeded',
    };
    const refundRes = await refundPayment(
      makeAuthReq('http://localhost/api/admin/members/m-1/refund'),
      { params: Promise.resolve({ id: 'm-1' }) }
    );
    expect(refundRes.status).toBe(200);
    const refundJson = await refundRes.json();
    expect(refundJson.ok).toBe(true);
    expect(refundJson.refund_id).toBe('re_test123');
    expect(state.lastPaymentUpdate).toEqual({ status: 'refunded' });

    // Step 5: Cancel membership
    state.member.stripe_subscription_id = 'sub_test123';
    const cancelRes = await cancelSubscription(
      makeAuthReq('http://localhost/api/portal/cancel-subscription')
    );
    expect(cancelRes.status).toBe(200);
    const cancelJson = await cancelRes.json();
    expect(cancelJson.ok).toBe(true);
    expect(state.member.subscription_status).toBe('cancel_at_period_end');
    expect(state.member.status).toBe('cancelled');
  });
});
