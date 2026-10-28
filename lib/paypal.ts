import { createHash } from "node:crypto";

import {
  Client,
  Environment,
  LogLevel,
  OrdersController,
  PaymentsController,
  SubscriptionsController,
  CheckoutPaymentIntent,
  OrderApplicationContextLandingPage,
  OrderApplicationContextUserAction,
  ApplicationContextUserAction,
  type OrderRequest,
  type Order,
  type Subscription as PayPalSubscription,
  type CreateSubscriptionRequest,
} from "@paypal/paypal-server-sdk";

import { MEMBERSHIP_WEBHOOK_EVENTS } from "./membership-webhook-events";
import { payPalVerificationBody } from "./paypal-webhook";
import { assertPayPalTestEnvironment, isProductionEnvironment } from "./preview-safety";

/**
 * PayPal Integration
 *
 * Integración directa con PayPal REST API v2
 * Soporta pagos en USD, EUR y COP para Colombia e Internacional
 */

// Configuration
export const PAYPAL_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || "",
  webhookId: process.env.PAYPAL_WEBHOOK_ID || "",
  environment: (process.env.PAYPAL_ENVIRONMENT || "sandbox") as "sandbox" | "live",
};

// Create PayPal client
function getPayPalClient(): Client {
  assertPayPalTestEnvironment(PAYPAL_CONFIG.environment);
  const environment =
    PAYPAL_CONFIG.environment === "live" ? Environment.Production : Environment.Sandbox;

  return new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: PAYPAL_CONFIG.clientId,
      oAuthClientSecret: PAYPAL_CONFIG.clientSecret,
    },
    environment,
    logging: {
      logLevel: LogLevel.Info,
      logRequest: { logBody: false },
      logResponse: { logHeaders: false },
    },
  });
}

function getPayPalApiBaseUrl(): string {
  assertPayPalTestEnvironment(PAYPAL_CONFIG.environment);
  return PAYPAL_CONFIG.environment === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getPayPalAccessToken(): Promise<string> {
  const response = await fetch(`${getPayPalApiBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${PAYPAL_CONFIG.clientId}:${PAYPAL_CONFIG.clientSecret}`
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Error obteniendo token PayPal: ${response.statusText}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("PayPal no devolvió access token");
  }

  return data.access_token;
}

// Types
export interface PayPalOrderParams {
  amount: number;
  currency: "USD" | "EUR" | "COP";
  description: string;
  reference: string;
  returnUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export interface PayPalOrderResult {
  success: boolean;
  orderId?: string;
  approvalUrl?: string;
  error?: string;
}

export interface PayPalCaptureResult {
  success: boolean;
  captureId?: string;
  status?: string;
  amount?: number;
  currency?: string;
  payerEmail?: string;
  error?: string;
}

export type PayPalOrderStatus =
  | "CREATED"
  | "SAVED"
  | "APPROVED"
  | "VOIDED"
  | "COMPLETED"
  | "PAYER_ACTION_REQUIRED";

export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource_type: string;
  resource: {
    id: string;
    status: string;
    amount?: {
      currency_code: string;
      value: string;
    };
    supplementary_data?: { related_ids?: { order_id?: string } };
    purchase_units?: Array<{
      reference_id: string;
      payments?: {
        captures?: Array<{
          id: string;
          status: string;
          amount: {
            currency_code: string;
            value: string;
          };
        }>;
      };
    }>;
  };
  create_time: string;
}

/**
 * Check if PayPal is configured
 */
export function isPayPalConfigured(): boolean {
  return !!(PAYPAL_CONFIG.clientId && PAYPAL_CONFIG.clientSecret);
}

/**
 * Create a PayPal order
 */
export async function createPayPalOrder(params: PayPalOrderParams): Promise<PayPalOrderResult> {
  try {
    const client = getPayPalClient();
    const ordersController = new OrdersController(client);

    const orderRequest: OrderRequest = {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          referenceId: params.reference,
          description: params.description,
          amount: {
            currencyCode: params.currency,
            value: params.amount.toFixed(2),
          },
        },
      ],
      applicationContext: {
        brandName: "Energía y Divinidad",
        landingPage: OrderApplicationContextLandingPage.Login,
        userAction: OrderApplicationContextUserAction.PayNow,
        returnUrl: params.returnUrl,
        cancelUrl: params.cancelUrl,
      },
    };

    const response = await ordersController.createOrder({
      body: orderRequest,
      prefer: "return=representation",
    });

    const order = response.result as Order;

    // Find approval URL
    const approvalLink = order.links?.find((link) => link.rel === "approve");

    if (!order.id || !approvalLink?.href) {
      return {
        success: false,
        error: "No se pudo crear la orden de PayPal",
      };
    }

    return {
      success: true,
      orderId: order.id,
      approvalUrl: approvalLink.href,
    };
  } catch (error: unknown) {
    console.error("[PAYPAL] Error creating order:", error);

    // Extract detailed error info from PayPal SDK
    let errorMessage = "Error desconocido";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    // PayPal SDK errors often have additional details
    const errorDetails = error as {
      statusCode?: number;
      body?: string;
      result?: { details?: Array<{ issue?: string; description?: string }> };
    };

    if (errorDetails.statusCode) {
      console.error("[PAYPAL] Status code:", errorDetails.statusCode);
    }
    if (errorDetails.body) {
      console.error("[PAYPAL] Error body:", errorDetails.body);
      try {
        const bodyParsed = JSON.parse(errorDetails.body);
        if (bodyParsed.details?.[0]?.description) {
          errorMessage = bodyParsed.details[0].description;
        } else if (bodyParsed.message) {
          errorMessage = bodyParsed.message;
        }
      } catch {
        // Body is not JSON, use as-is
      }
    }
    if (errorDetails.result?.details) {
      console.error("[PAYPAL] Error details:", JSON.stringify(errorDetails.result.details));
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Capture a PayPal order after approval
 */
export async function capturePayPalOrder(orderId: string): Promise<PayPalCaptureResult> {
  try {
    const client = getPayPalClient();
    const ordersController = new OrdersController(client);

    const response = await ordersController.captureOrder({
      id: orderId,
      paypalRequestId: createHash("sha256")
        .update(`eyd:capture:${orderId}`)
        .digest("hex")
        .slice(0, 38),
      prefer: "return=representation",
    });

    const order = response.result as Order;
    const captureData = order.purchaseUnits?.[0]?.payments?.captures?.[0];

    if (!captureData) {
      return {
        success: false,
        error: "No se encontró información de captura",
      };
    }

    return {
      success: true,
      captureId: captureData.id,
      status: captureData.status,
      amount: captureData.amount?.value ? parseFloat(captureData.amount.value) : undefined,
      currency: captureData.amount?.currencyCode,
      payerEmail: order.payer?.emailAddress,
    };
  } catch (error) {
    const existing = await getPayPalOrder(orderId);
    const captured = existing?.purchaseUnits?.[0]?.payments?.captures?.[0];
    if (existing?.status === "COMPLETED" && captured?.status === "COMPLETED") {
      return {
        success: true,
        captureId: captured.id,
        status: captured.status,
        amount: Number(captured.amount?.value),
        currency: captured.amount?.currencyCode,
        payerEmail: existing?.payer?.emailAddress,
      };
    }
    console.error("[PAYPAL] Capture could not be verified");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Get PayPal order details
 */
export async function getPayPalOrder(orderId: string): Promise<Order | null> {
  try {
    const client = getPayPalClient();
    const ordersController = new OrdersController(client);

    const response = await ordersController.getOrder({
      id: orderId,
    });

    return response.result as Order;
  } catch (error) {
    console.error("[PAYPAL] Error getting order:", error);
    return null;
  }
}

/**
 * Refund a PayPal capture
 */
export async function refundPayPalCapture(
  captureId: string,
  amount?: number,
  currency?: string
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  try {
    const client = getPayPalClient();
    const paymentsController = new PaymentsController(client);

    const refundRequest =
      amount && currency
        ? {
            amount: {
              currencyCode: currency,
              value: amount.toFixed(2),
            },
          }
        : undefined;

    const response = await paymentsController.refundCapturedPayment({
      captureId,
      body: refundRequest,
    });

    const refund = response.result;

    return {
      success: true,
      refundId: refund.id,
    };
  } catch (error) {
    console.error("[PAYPAL] Error refunding capture:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Verify PayPal webhook signature
 *
 * PayPal uses a different verification method - we need to call their API
 * to verify the webhook signature
 */
export async function verifyPayPalWebhook(
  headers: Headers,
  rawBody: string
): Promise<{ valid: boolean; event?: PayPalWebhookEvent; error?: string }> {
  try {
    // Get required headers
    const transmissionId = headers.get("paypal-transmission-id");
    const transmissionTime = headers.get("paypal-transmission-time");
    const certUrl = headers.get("paypal-cert-url");
    const authAlgo = headers.get("paypal-auth-algo");
    const transmissionSig = headers.get("paypal-transmission-sig");

    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
      return { valid: false, error: "Missing required headers" };
    }

    if (!PAYPAL_CONFIG.webhookId) {
      return { valid: false, error: "Webhook is not configured" };
    }
    const event = JSON.parse(rawBody) as PayPalWebhookEvent;
    if (!event.id || !event.event_type || !event.resource) {
      return { valid: false, error: "Invalid webhook payload" };
    }
    const token = await getPayPalAccessToken();
    const response = await fetch(
      `${getPayPalApiBaseUrl()}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: payPalVerificationBody(
          {
            transmission_id: transmissionId,
            transmission_time: transmissionTime,
            cert_url: certUrl,
            auth_algo: authAlgo,
            transmission_sig: transmissionSig,
            webhook_id: PAYPAL_CONFIG.webhookId,
          },
          rawBody
        ),
      }
    );
    if (!response.ok) {
      return { valid: false, error: "Webhook verification failed" };
    }
    const verification = await response.json();
    if (verification.verification_status !== "SUCCESS") {
      return { valid: false, error: "Invalid webhook signature" };
    }

    return {
      valid: true,
      event,
    };
  } catch (error) {
    console.error("[PAYPAL] Error verifying webhook:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Map PayPal order status to our internal status
 */
export function mapPayPalStatus(
  paypalStatus: string
): "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | "EXPIRED" {
  const statusMap: Record<
    string,
    "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | "EXPIRED"
  > = {
    CREATED: "PENDING",
    SAVED: "PENDING",
    APPROVED: "PENDING", // Still needs capture
    PAYER_ACTION_REQUIRED: "PENDING",
    COMPLETED: "APPROVED",
    VOIDED: "VOIDED",
    DECLINED: "DECLINED",
  };

  return statusMap[paypalStatus] || "PENDING";
}

/**
 * Map PayPal capture status
 */
export function mapPayPalCaptureStatus(
  captureStatus: string
): "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | "EXPIRED" {
  const statusMap: Record<
    string,
    "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | "EXPIRED"
  > = {
    COMPLETED: "APPROVED",
    DECLINED: "DECLINED",
    PARTIALLY_REFUNDED: "APPROVED",
    PENDING: "PENDING",
    REFUNDED: "VOIDED",
    FAILED: "ERROR",
  };

  return statusMap[captureStatus] || "PENDING";
}

// ============================================
// PAYPAL SUBSCRIPTIONS (Recurring Billing)
// ============================================

export interface PayPalSubscriptionParams {
  planId: string;
  subscriberEmail: string;
  subscriberName?: string;
  startTime?: string;
  returnUrl: string;
  cancelUrl: string;
  customId?: string;
  requestId?: string;
}

export interface PayPalSubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  approvalUrl?: string;
  error?: string;
}

export interface PayPalSubscriptionDetails {
  id: string;
  status: string;
  planId?: string;
  startTime?: string;
  subscriberEmail?: string;
  nextBillingTime?: string;
  lastPaymentAmount?: string;
  lastPaymentTime?: string;
  lastPaymentCurrency?: string;
  customId?: string;
  statusUpdatedAt?: string;
  quantity?: string;
  planOverridden?: boolean;
  failedPaymentsCount?: number;
  lastFailedPaymentTime?: string;
}

export interface PayPalBillingPlan {
  id: string;
  status: string;
  product_id?: string;
  billing_cycles?: Array<{
    tenure_type?: string;
    total_cycles?: number;
    frequency?: { interval_unit?: string; interval_count?: number };
    pricing_scheme?: { fixed_price?: { value?: string; currency_code?: string } };
  }>;
  payment_preferences?: { setup_fee?: { value?: string; currency_code?: string } };
  taxes?: { percentage?: string };
  quantity_supported?: boolean;
}

export interface PayPalSaleDetails {
  id: string;
  state: string;
  billing_agreement_id?: string;
  create_time?: string;
  amount?: { total?: string; currency?: string };
}

async function getPayPalResource<T>(path: string): Promise<T | null> {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${getPayPalApiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  return response.json() as Promise<T>;
}

export function getPayPalBillingPlan(id: string) {
  return getPayPalResource<PayPalBillingPlan>(`/v1/billing/plans/${encodeURIComponent(id)}`);
}

export function getPayPalSaleDetails(id: string) {
  return getPayPalResource<PayPalSaleDetails>(`/v1/payments/sale/${encodeURIComponent(id)}`);
}

/**
 * Resolve the PayPal plan ID from env vars for a given tier + interval.
 * Format preferred: PAYPAL_PLAN_ID_{TIER_SLUG_UPPERCASE}_{USD|EUR}_{MONTHLY|YEARLY}
 * Legacy fallback: PAYPAL_PLAN_ID_{TIER_SLUG_UPPERCASE}_{MONTHLY|YEARLY}
 */
export function getPayPalPlanId(
  tierSlug: string,
  interval: "monthly" | "yearly",
  currency: "USD" | "EUR" = "USD"
): string | null {
  const normalizedSlug = tierSlug.toUpperCase().replace(/-/g, "_");
  const intervalKey = interval.toUpperCase();
  const currencyKey = `PAYPAL_PLAN_ID_${normalizedSlug}_${currency}_${intervalKey}`;
  const legacyKey = `PAYPAL_PLAN_ID_${normalizedSlug}_${intervalKey}`;

  const prefix = isProductionEnvironment() ? "" : "PREVIEW_";
  return (
    process.env[prefix + currencyKey] ||
    (currency === "USD" ? process.env[prefix + legacyKey] : null) ||
    null
  );
}

/**
 * Create a PayPal subscription (recurring billing).
 * Returns the approval URL that the user must visit to authorize.
 */
export async function createPayPalSubscription(
  params: PayPalSubscriptionParams
): Promise<PayPalSubscriptionResult> {
  try {
    const client = getPayPalClient();
    const subscriptionsController = new SubscriptionsController(client);

    const subscriberNames = params.subscriberName?.trim().split(/\s+/).filter(Boolean) || [];
    const requestBody: CreateSubscriptionRequest = {
      planId: params.planId,
      ...(params.startTime ? { startTime: params.startTime } : {}),
      subscriber: {
        emailAddress: params.subscriberEmail,
        ...(subscriberNames.length
          ? {
              name: {
                givenName: subscriberNames[0],
                ...(subscriberNames.length > 1
                  ? { surname: subscriberNames.slice(1).join(" ") }
                  : {}),
              },
            }
          : {}),
      },
      applicationContext: {
        brandName: "Energía y Divinidad",
        userAction: ApplicationContextUserAction.SubscribeNow,
        returnUrl: params.returnUrl,
        cancelUrl: params.cancelUrl,
      },
      ...(params.customId ? { customId: params.customId } : {}),
    };

    const response = await subscriptionsController.createSubscription({
      prefer: "return=representation",
      paypalRequestId:
        params.requestId ||
        (params.customId
          ? createHash("sha256").update(`membership:${params.customId}`).digest("hex").slice(0, 38)
          : undefined),
      body: requestBody,
    });

    const subscription = response.result as PayPalSubscription;

    const approvalLink = subscription.links?.find((l) => l.rel === "approve");

    if (!subscription.id || !approvalLink?.href) {
      return { success: false, error: "No se pudo crear la suscripción de PayPal" };
    }

    return {
      success: true,
      subscriptionId: subscription.id,
      approvalUrl: approvalLink.href,
    };
  } catch (error: unknown) {
    console.error("[PAYPAL] Error creating subscription:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Get details for an existing PayPal subscription.
 */
export async function getPayPalSubscriptionDetails(
  subscriptionId: string
): Promise<PayPalSubscriptionDetails | null> {
  try {
    const accessToken = await getPayPalAccessToken();
    const response = await fetch(
      `${getPayPalApiBaseUrl()}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}?fields=last_failed_payment`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("[PAYPAL] Error getting subscription:", response.status, await response.text());
      return null;
    }

    const sub = (await response.json()) as {
      id?: string;
      status?: string;
      plan_id?: string;
      custom_id?: string;
      status_update_time?: string;
      quantity?: string;
      plan_overridden?: boolean;
      start_time?: string;
      subscriber?: {
        email_address?: string;
      };
      billing_info?: {
        next_billing_time?: string;
        last_payment?: { amount?: { value?: string; currency_code?: string }; time?: string };
        failed_payments_count?: number;
        last_failed_payment?: { time?: string };
      };
    };

    return {
      id: sub.id || subscriptionId,
      status: sub.status || "UNKNOWN",
      planId: sub.plan_id,
      customId: sub.custom_id,
      statusUpdatedAt: sub.status_update_time,
      quantity: sub.quantity,
      planOverridden: sub.plan_overridden,
      startTime: sub.start_time,
      subscriberEmail: sub.subscriber?.email_address,
      nextBillingTime: sub.billing_info?.next_billing_time,
      lastPaymentAmount: sub.billing_info?.last_payment?.amount?.value,
      lastPaymentTime: sub.billing_info?.last_payment?.time,
      lastPaymentCurrency: sub.billing_info?.last_payment?.amount?.currency_code,
      failedPaymentsCount: sub.billing_info?.failed_payments_count,
      lastFailedPaymentTime: sub.billing_info?.last_failed_payment?.time,
    };
  } catch (error) {
    console.error("[PAYPAL] Error getting subscription:", error);
    return null;
  }
}

/**
 * Cancel a PayPal subscription.
 */
export async function cancelPayPalSubscription(
  subscriptionId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const current = await getPayPalSubscriptionDetails(subscriptionId);
    if (!current) {
      return { success: false, error: "No se pudo comprobar el estado de la renovación" };
    }
    if (["CANCELLED", "EXPIRED"].includes(current.status)) {
      return { success: true };
    }
    const client = getPayPalClient();
    const subscriptionsController = new SubscriptionsController(client);

    await subscriptionsController.cancelSubscription({
      id: subscriptionId,
      body: { reason },
    });

    return { success: true };
  } catch (error) {
    console.error("[PAYPAL] Error cancelling subscription:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

/**
 * Suspend a PayPal subscription (temporary pause).
 */
export async function suspendPayPalSubscription(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getPayPalClient();
    const subscriptionsController = new SubscriptionsController(client);

    await subscriptionsController.suspendSubscription({
      id: subscriptionId,
      body: { reason: "Suspended by admin" },
    });

    return { success: true };
  } catch (error) {
    console.error("[PAYPAL] Error suspending subscription:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

/**
 * Reactivate a suspended PayPal subscription.
 */
export async function activatePayPalSubscription(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getPayPalClient();
    const subscriptionsController = new SubscriptionsController(client);

    await subscriptionsController.activateSubscription({
      id: subscriptionId,
      body: { reason: "Reactivated" },
    });

    return { success: true };
  } catch (error) {
    console.error("[PAYPAL] Error activating subscription:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

/** Test-only catalogue preparation. It never creates an agreement or charges a buyer. */
export async function ensurePayPalSandboxMembershipPlan(input: {
  key: string;
  tierName: string;
  amount: number;
  currency: "USD" | "EUR";
  interval: "monthly" | "yearly";
}): Promise<PayPalBillingPlan> {
  if (
    process.env.VERCEL_ENV !== "preview" ||
    PAYPAL_CONFIG.environment !== "sandbox" ||
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID !== "81jpalr2" ||
    process.env.NEXT_PUBLIC_SANITY_DATASET !== "preview"
  ) {
    throw new Error("La preparación de planes solo está disponible en EYD Preview sandbox");
  }
  const productId = "EYD-PREVIEW-MEMBERSHIPS-20261028";
  const productName = "PRUEBAS - NO REAL - EYD Membresias 2026-10-28";
  async function request<T>(path: string, body: object, key: string): Promise<T> {
    const token = await getPayPalAccessToken();
    const response = await fetch(`${getPayPalApiBaseUrl()}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        "PayPal-Request-Id": createHash("sha256").update(key).digest("hex").slice(0, 38),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      throw new Error(`PayPal sandbox no confirmó la preparación (${response.status})`);
    }
    return response.json() as Promise<T>;
  }
  const existingProduct = await getPayPalResource<{ id: string; name: string; type: string }>(
    `/v1/catalogs/products/${productId}`
  );
  if (
    existingProduct &&
    (existingProduct.name !== productName || existingProduct.type !== "SERVICE")
  ) {
    throw new Error("Producto de pruebas no reconocido");
  }
  if (!existingProduct) {
    await request(
      "/v1/catalogs/products",
      {
        id: productId,
        name: productName,
        type: "SERVICE",
        category: "DIGITAL_MEDIA_BOOKS_MOVIES_MUSIC",
        description:
          "Catalogo exclusivo para pruebas ficticias de Energia y Divinidad. Sin cobros reales.",
      },
      productId
    );
  }
  const name = `PRUEBA EYD 20261028 ${input.key} ${input.amount.toFixed(2)} ${input.currency}`;
  let found: { id: string; name: string } | undefined;
  for (let page = 1; page <= 20; page++) {
    const list = await getPayPalResource<{ plans: Array<{ id: string; name: string }> }>(
      `/v1/billing/plans?product_id=${productId}&page_size=20&page=${page}`
    );
    if (!list) {
      throw new Error("No se pudo revisar el catálogo de planes sandbox");
    }
    const matches = (list.plans || []).filter((plan) => plan.name === name);
    if (matches.length > 1 || (found && matches.length)) {
      throw new Error("Existen planes de prueba ambiguos; requieren revisión");
    }
    if (matches[0]) {
      found = matches[0];
    }
    if ((list.plans || []).length < 20) {
      break;
    }
    if (page === 20) {
      throw new Error("El catálogo sandbox requiere revisión manual");
    }
  }
  if (found) {
    const details = await getPayPalBillingPlan(found.id);
    if (!details) {
      throw new Error("No se pudo verificar el plan sandbox existente");
    }
    return details;
  }
  const created = await request<PayPalBillingPlan>(
    "/v1/billing/plans",
    {
      product_id: productId,
      name,
      status: "ACTIVE",
      description: `PRUEBA NO REAL - ${input.tierName}`,
      billing_cycles: [
        {
          frequency: {
            interval_unit: input.interval === "yearly" ? "YEAR" : "MONTH",
            interval_count: 1,
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: input.amount.toFixed(2), currency_code: input.currency },
          },
        },
      ],
      payment_preferences: { auto_bill_outstanding: false, payment_failure_threshold: 3 },
    },
    name
  );
  const verified = created.id ? await getPayPalBillingPlan(created.id) : null;
  if (!verified) {
    throw new Error("El plan se preparó pero falta verificar sus condiciones");
  }
  return verified;
}

/** Add only the tested sandbox events to the existing listener; keep its private URL untouched. */
export async function ensurePayPalSandboxMembershipEvents() {
  if (
    process.env.VERCEL_ENV !== "preview" ||
    PAYPAL_CONFIG.environment !== "sandbox" ||
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID !== "81jpalr2" ||
    process.env.NEXT_PUBLIC_SANITY_DATASET !== "preview" ||
    !PAYPAL_CONFIG.webhookId
  ) {
    throw new Error("La configuración de avisos solo está disponible en EYD Preview sandbox");
  }
  const path = `/v1/notifications/webhooks/${encodeURIComponent(PAYPAL_CONFIG.webhookId)}`;
  type Hook = { id: string; url: string; event_types: Array<{ name: string }> };
  const original = await getPayPalResource<Hook>(path);
  if (!original || original.id !== PAYPAL_CONFIG.webhookId) {
    throw new Error("No se encontró el webhook sandbox esperado");
  }
  const destination = new URL(original.url);
  if (
    destination.protocol !== "https:" ||
    destination.username ||
    destination.password ||
    ![
      "preview.energiaydivinidad.com",
      "energia-y-divinidad-git-preview-aleyda-paola-vargas-projects.vercel.app",
    ].includes(destination.hostname) ||
    destination.pathname !== "/api/webhooks/paypal"
  ) {
    throw new Error("El webhook no apunta al receptor aislado de EYD Preview");
  }
  const expected = new Set([
    "PAYMENT.CAPTURE.COMPLETED",
    "PAYMENT.CAPTURE.DENIED",
    ...MEMBERSHIP_WEBHOOK_EVENTS,
  ]);
  const current = original.event_types.map((event) => event.name);
  if (current.some((name) => !expected.has(name))) {
    throw new Error("El webhook contiene eventos adicionales que requieren revisión");
  }
  if ([...expected].some((name) => !current.includes(name))) {
    const token = await getPayPalAccessToken();
    const response = await fetch(`${getPayPalApiBaseUrl()}${path}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        { op: "replace", path: "/event_types", value: [...expected].map((name) => ({ name })) },
      ]),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      throw new Error(`PayPal sandbox no confirmó los eventos (${response.status})`);
    }
  }
  const verified = await getPayPalResource<Hook>(path);
  if (
    !verified ||
    verified.id !== original.id ||
    verified.url !== original.url ||
    verified.event_types.length !== expected.size ||
    verified.event_types.some((event) => !expected.has(event.name))
  ) {
    throw new Error("Falta verificar la configuración de avisos sandbox");
  }
  return { webhookId: verified.id, eventTypes: verified.event_types.map((event) => event.name) };
}
