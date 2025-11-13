/**
 * Configuration options for the SumUp payment provider
 * @property apiKey - The SumUp API key (secret key starting with sup_sk_)
 * @property merchantCode - The SumUp merchant code (optional, if not provided, will be fetched from API)
 * @property redirectUrl - The URL to redirect to after payment completion
 * @property medusaUrl - The URL of the Medusa instance - defaults to http://localhost:9000
 * @property autoCapture - Whether to automatically capture payments - defaults to true
 * @property description - The description that appears on the payment
 * @property debug - Whether to enable debug mode
 * @property environment - The environment to use (test or live) - defaults to test
 */
export type ProviderOptions = {
	apiKey: string;
	merchantCode?: string;
	redirectUrl: string;
	medusaUrl: string;
	autoCapture?: boolean;
	description?: string;
	debug?: boolean;
	environment?: "test" | "live";
};

/**
 * SumUp checkout creation data
 */
export type SumUpCheckoutData = {
	amount: number;
	currency: string;
	checkout_reference: string;
	description?: string;
	merchant_code: string;
	redirect_url?: string;
	return_url?: string;
	customer_id?: string;
	personal_details?: {
		email?: string;
		first_name?: string;
		last_name?: string;
	};
};

/**
 * SumUp checkout response
 */
export type SumUpCheckoutResponse = {
	id: string;
	checkout_reference: string;
	amount: number;
	currency: string;
	status: "PENDING" | "FAILED" | "PAID";
	date: string;
	description?: string;
	merchant_code: string;
	merchant_country: string;
	merchant_name: string;
	purpose: "CHECKOUT";
	transactions: SumUpTransaction[];
	redirect_url?: string;
	return_url?: string;
	customer_id?: string;
};

/**
 * SumUp transaction data
 */
export type SumUpTransaction = {
	id: string;
	transaction_code: string;
	merchant_code: string;
	amount: number;
	vat_amount: number;
	tip_amount: number;
	currency: string;
	timestamp: string;
	status: "PENDING" | "SUCCESSFUL" | "CANCELLED" | "FAILED";
	payment_type: "ECOM" | "POS" | "UNKNOWN";
	entry_mode: "CUSTOMER_ENTRY" | "CHIP" | "CONTACTLESS";
	installments_count: number;
	auth_code?: string;
	internal_id: number;
	payout_plan: string;
	payout_type: string;
	card?: {
		last_4_digits: string;
		type: string;
	};
};

/**
 * SumUp payment process data
 */
export type SumUpPaymentProcessData = {
	payment_type: "card" | "apple_pay" | "google_pay" | "paypal";
	card?: {
		name: string;
		number: string;
		expiry_month: string;
		expiry_year: string;
		cvv: string;
		zip_code?: string;
	};
	apple_pay?: {
		token: any;
	};
	google_pay?: {
		apiVersionMinor: number;
		apiVersion: number;
		paymentMethodData: any;
	};
	// PayPal is handled as an Alternative Payment Method (APM) by SumUp
	// Personal details are required for PayPal APM processing
	personal_details?: {
		email?: string;
		first_name?: string;
		last_name?: string;
		tax_id?: string;
		address?: {
			country?: string;
			city?: string;
			line1?: string;
			postal_code?: string;
			state?: string;
		};
	};
};

/**
 * SumUp payment process response
 */
export type SumUpPaymentProcessResponse = {
	status: "PENDING" | "FAILED" | "PAID";
	next_step?: {
		url: string;
		method: "POST" | "GET";
		redirect_url?: string;
		mechanism?: "iframe" | "browser";
		payload?: Record<string, any>;
	};
	transaction_code?: string;
	transaction_id?: string;
	checkout_reference: string;
	amount: number;
	currency: string;
};

/**
 * SumUp refund data
 */
export type SumUpRefundData = {
	amount?: number;
};

/**
 * SumUp error response
 */
export type SumUpErrorResponse = {
	error_code: string;
	message: string;
	param?: string;
};

/**
 * SumUp webhook payload
 */
export type SumUpWebhookPayload = {
	id: string;
	event_type: string;
	timestamp: string;
	resource_type: string;
	resource: {
		id: string;
		status: string;
		amount?: number;
		currency?: string;
		checkout_reference?: string;
		transaction_code?: string;
		metadata?: Record<string, any>;
	};
};

/**
 * Payment provider keys for different SumUp payment methods
 */
export const PaymentProviderKeys = {
	SUMUP_HOSTED_CHECKOUT: "sumup-hosted-checkout",
	SUMUP_CARD: "sumup-card",
	SUMUP_APPLE_PAY: "sumup-apple-pay",
	SUMUP_GOOGLE_PAY: "sumup-google-pay",
	SUMUP_PAYPAL: "sumup-paypal",
} as const;

/**
 * SumUp API endpoints
 */
export const SUMUP_API_ENDPOINTS = {
	PRODUCTION: "https://api.sumup.com",
	SANDBOX: "https://api.sumup.com",
} as const;

/**
 * SumUp supported currencies
 */
export const SUMUP_SUPPORTED_CURRENCIES = [
	"EUR",
	"USD",
	"GBP",
	"CHF",
	"SEK",
	"DKK",
	"NOK",
	"PLN",
	"CZK",
	"HUF",
	"BGN",
	"RON",
	"HRK",
	"BRL",
	"CLP",
] as const;

export type SumUpSupportedCurrency = typeof SUMUP_SUPPORTED_CURRENCIES[number];
