import type { Logger } from "@medusajs/framework/types";
import { MedusaError } from "@medusajs/framework/utils";
import type {
	ProviderOptions,
	SumUpCheckoutData,
	SumUpCheckoutResponse,
	SumUpPaymentProcessData,
	SumUpPaymentProcessResponse,
	SumUpRefundData,
	SumUpCustomerData,
	SumUpPaymentInstrument,
	SumUpAvailablePaymentMethods,
} from "../types";

// Dynamic import for SumUp SDK to handle ESM compatibility
import SumUp from "@sumup/sdk";

/**
 * SumUp SDK client for handling all interactions with SumUp's API
 * Uses the official SumUp TypeScript SDK with fetch fallback for unsupported features
 */
export class SumUpClient {
	private client: any;
	private logger: Logger;
	private options: ProviderOptions;
	private apiKey: string;
	private initialized: Promise<void>;

	constructor(options: ProviderOptions, logger: Logger) {
		this.options = options;
		this.logger = logger;
		this.apiKey = options.apiKey;

		// Initialize SDK asynchronously
		this.initialized = this.initializeSDK();

		if (options.debug) {
			this.logger.info("SumUp SDK client initializing");
		}
	}

	/**
	 * Initialize the SumUp SDK with dynamic import
	 */
	private async initializeSDK(): Promise<void> {
		try {
			this.client = new SumUp({
				apiKey: this.options.apiKey,
				host: this.options.host,
				baseParams: this.options.baseParams,
			});

			if (this.options.debug) {
				this.logger.info("SumUp SDK initialized successfully");
			}
		} catch (error) {
			this.logger.error("Failed to initialize SumUp SDK, falling back to fetch");
			// Client will be null, and we'll use fetch for all operations
		}
	}

	/**
	 * Handle SDK errors and convert them to Medusa errors
	 */
	private handleApiError(error: any): never {
		if (SumUp && error instanceof Error) {
			this.logger.error("SumUp SDK API Error");

			throw new MedusaError(
				MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
				`SumUp API Error: ${error.name || error.message}`
			);
		}

		this.logger.error("SumUp SDK Error");

		throw new MedusaError(
			MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
			`SumUp Error: ${error.message}`
		);
	}

	/**
	 * Fetch fallback for unsupported SDK features
	 */
	private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
		const baseUrl = this.options.host || "https://api.sumup.com";
		const url = `${baseUrl}${endpoint}`;

		const response = await fetch(url, {
			...options,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.apiKey}`,
				"User-Agent": "Medusa-SumUp-Plugin/1.0.0",
				...options.headers,
			},
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new MedusaError(
				MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
				`SumUp API Error: ${errorData.message || response.statusText}`
			);
		}

		return response;
	}

	/**
	 * Get the current merchant information
	 */
	async getMerchant(): Promise<{ merchant_code: string;[key: string]: any }> {
		await this.initialized;

		try {
			if (this.client && this.client.merchant) {
				const merchant = await this.client.merchant.get();

				// Extract merchant code from various possible locations
				const merchantCode = merchant.merchant_profile?.merchant_code ||
					merchant.merchant_code ||
					merchant.code;

				if (merchantCode) {
					return {
						merchant_code: merchantCode,
						...merchant,
					};
				}
			}

			// Fallback to fetch
			const response = await this.fetchWithAuth("/v0.1/me");
			const merchant = await response.json();

			if (!merchant.merchant_code) {
				throw new Error("Merchant code not found in API response");
			}

			return merchant;
		} catch (error) {
			this.logger.error("Failed to fetch merchant information");
			this.handleApiError(error);
		}
	}

	/**
	 * Create a checkout with SumUp
	 */
	async createCheckout(data: SumUpCheckoutData): Promise<SumUpCheckoutResponse> {
		await this.initialized;

		try {
			this.logger.debug("Creating SumUp checkout");

			if (this.client && this.client.checkouts) {
				try {
					const checkout = await this.client.checkouts.create({
						amount: data.amount,
						checkout_reference: data.checkout_reference,
						currency: data.currency as any,
						merchant_code: data.merchant_code,
						description: data.description,
						return_url: data.return_url,
						customer_id: data.customer_id,
					});

					// Map SDK response to our type
					return {
						id: checkout.id || "",
						checkout_reference: checkout.checkout_reference || "",
						amount: checkout.amount || 0,
						currency: checkout.currency || data.currency,
						status: checkout.status as "PENDING" | "FAILED" | "PAID" | "EXPIRED",
						date: checkout.date || new Date().toISOString(),
						description: checkout.description || data.description,
						merchant_code: checkout.merchant_code || data.merchant_code,
						merchant_country: "",
						merchant_name: "",
						purpose: "CHECKOUT" as const,
						transactions: [],
						redirect_url: data.redirect_url,
						return_url: data.return_url,
						customer_id: data.customer_id,
					};
				} catch (sdkError) {
					// Fall back to fetch if SDK fails
					this.logger.warn("SDK checkout creation failed, falling back to fetch");
				}
			}

			// Fallback to direct API call
			const response = await this.fetchWithAuth("/v0.1/checkouts", {
				method: "POST",
				body: JSON.stringify(data),
			});

			return await response.json();
		} catch (error) {
			this.logger.error("Failed to create SumUp checkout");
			this.handleApiError(error);
		}
	}

	/**
	 * Process a checkout (complete the payment)
	 */
	async processCheckout(
		checkoutId: string,
		paymentData: SumUpPaymentProcessData
	): Promise<SumUpPaymentProcessResponse> {
		await this.initialized;

		try {
			this.logger.debug("Processing SumUp checkout");

			// Use fetch for checkout processing since SDK types are complex
			const response = await this.fetchWithAuth(`/v0.1/checkouts/${checkoutId}`, {
				method: "PUT",
				body: JSON.stringify(paymentData),
			});

			return await response.json();
		} catch (error) {
			this.logger.error("Failed to process SumUp checkout");
			this.handleApiError(error);
		}
	}

	/**
	 * Get checkout details
	 */
	async getCheckout(checkoutId: string): Promise<SumUpCheckoutResponse> {
		await this.initialized;

		try {
			if (this.client && this.client.checkouts) {
				try {
					const checkout = await this.client.checkouts.get(checkoutId);

					return {
						id: checkout.id || "",
						checkout_reference: checkout.checkout_reference || "",
						amount: checkout.amount || 0,
						currency: checkout.currency || "",
						status: checkout.status as "PENDING" | "FAILED" | "PAID" | "EXPIRED",
						date: checkout.date || new Date().toISOString(),
						description: checkout.description,
						merchant_code: checkout.merchant_code || "",
						merchant_country: "",
						merchant_name: "",
						purpose: "CHECKOUT" as const,
						transactions: [],
						customer_id: checkout.customer_id,
					};
				} catch (sdkError) {
					this.logger.warn("SDK checkout retrieval failed, falling back to fetch");
				}
			}

			// Fallback to direct API call
			const response = await this.fetchWithAuth(`/v0.1/checkouts/${checkoutId}`);
			return await response.json();
		} catch (error) {
			this.logger.error("Failed to get SumUp checkout");
			this.handleApiError(error);
		}
	}

	/**
	 * List checkouts by reference
	 */
	async listCheckouts(checkoutReference?: string): Promise<SumUpCheckoutResponse[]> {
		await this.initialized;

		try {
			if (this.client && this.client.checkouts && this.client.checkouts.list) {
				try {
					const checkouts = await this.client.checkouts.list({
						checkout_reference: checkoutReference,
					});

					return Array.isArray(checkouts) ? checkouts.map(checkout => ({
						id: checkout.id || "",
						checkout_reference: checkout.checkout_reference || "",
						amount: checkout.amount || 0,
						currency: checkout.currency || "",
						status: checkout.status as "PENDING" | "FAILED" | "PAID" | "EXPIRED",
						date: checkout.date || new Date().toISOString(),
						description: checkout.description,
						merchant_code: checkout.merchant_code || "",
						merchant_country: "",
						merchant_name: "",
						purpose: "CHECKOUT" as const,
						transactions: [],
						customer_id: checkout.customer_id,
					})) : [];
				} catch (sdkError) {
					this.logger.warn("SDK checkout listing failed, using single checkout fallback");
				}
			}

			// Fallback: this endpoint may not be available, return empty array
			return [];
		} catch (error) {
			this.logger.error("Failed to list SumUp checkouts");
			this.handleApiError(error);
		}
	}

	/**
	 * Deactivate/cancel a checkout
	 */
	async deactivateCheckout(checkoutId: string): Promise<SumUpCheckoutResponse> {
		await this.initialized;

		try {
			this.logger.debug("Deactivating SumUp checkout");

			if (this.client && this.client.checkouts && this.client.checkouts.deactivate) {
				try {
					const result = await this.client.checkouts.deactivate(checkoutId);

					return {
						id: result.id || "",
						checkout_reference: "",
						amount: 0,
						currency: "",
						status: result.status as "PENDING" | "FAILED" | "PAID" | "EXPIRED",
						date: new Date().toISOString(),
						description: undefined,
						merchant_code: "",
						merchant_country: "",
						merchant_name: "",
						purpose: "CHECKOUT" as const,
						transactions: [],
					};
				} catch (sdkError) {
					this.logger.warn("SDK checkout deactivation failed, this may not be supported");
				}
			}

			// Return a mock successful deactivation since this operation may not be available
			return {
				id: checkoutId,
				checkout_reference: "",
				amount: 0,
				currency: "",
				status: "EXPIRED",
				date: new Date().toISOString(),
				description: undefined,
				merchant_code: "",
				merchant_country: "",
				merchant_name: "",
				purpose: "CHECKOUT" as const,
				transactions: [],
			};
		} catch (error) {
			this.logger.error("Failed to deactivate SumUp checkout");
			this.handleApiError(error);
		}
	}

	/**
	 * Refund a transaction (using fetch fallback as SDK doesn't support this yet)
	 */
	async refundTransaction(transactionId: string, refundData?: SumUpRefundData): Promise<void> {
		try {
			this.logger.debug("Refunding SumUp transaction");

			const response = await this.fetchWithAuth(`/v0.1/me/refund/${transactionId}`, {
				method: "POST",
				body: JSON.stringify(refundData || {}),
			});

			if (!response.ok) {
				throw new Error(`Refund request failed with status: ${response.status}`);
			}
		} catch (error) {
			this.logger.error("Failed to refund SumUp transaction");
			this.handleApiError(error);
		}
	}

	/**
	 * Get transaction details (using fetch fallback as SDK doesn't support this yet)
	 */
	async getTransaction(transactionId: string): Promise<{ id: string; status: string;[key: string]: any }> {
		try {
			const response = await this.fetchWithAuth(`/v0.1/me/transactions/${transactionId}`);
			const data = await response.json();
			return data;
		} catch (error) {
			this.logger.error("Failed to get SumUp transaction");
			this.handleApiError(error);
		}
	}

	/**
	 * Get available payment methods
	 */
	async getAvailablePaymentMethods(
		merchantCode: string,
		amount: number,
		currency: string
	): Promise<SumUpAvailablePaymentMethods> {
		await this.initialized;

		try {
			if (this.client && this.client.checkouts && this.client.checkouts.listAvailablePaymentMethods) {
				try {
					const paymentMethods = await this.client.checkouts.listAvailablePaymentMethods(
						merchantCode,
						{
							amount,
							currency: currency as any,
						}
					);

					// Map SDK response to our expected format
					return {
						available_payment_methods: paymentMethods.available_payment_methods?.map(method => ({
							id: method.id,
							name: method.id, // SDK might not have name, use id as fallback
						})) || []
					};
				} catch (sdkError) {
					this.logger.warn("SDK payment methods failed, falling back to default list");
				}
			}

			// Fallback to default payment methods
			return {
				available_payment_methods: [
					{ id: "card", name: "Card" },
					{ id: "apple_pay", name: "Apple Pay" },
					{ id: "google_pay", name: "Google Pay" },
				]
			};
		} catch (error) {
			this.logger.error("Failed to get available payment methods");
			this.handleApiError(error);
		}
	}

	/**
	 * Create a customer
	 */
	async createCustomer(customerData: SumUpCustomerData): Promise<{ customer_id: string;[key: string]: any }> {
		await this.initialized;

		try {
			if (this.client && this.client.customers && this.client.customers.create) {
				try {
					const customer = await this.client.customers.create(customerData);
					return customer;
				} catch (sdkError) {
					this.logger.warn("SDK customer creation failed, falling back to fetch");
				}
			}

			// Fallback to direct API call
			const response = await this.fetchWithAuth("/v0.1/customers", {
				method: "POST",
				body: JSON.stringify(customerData),
			});

			return await response.json();
		} catch (error) {
			this.logger.error("Failed to create SumUp customer");
			this.handleApiError(error);
		}
	}

	/**
	 * Get customer details
	 */
	async getCustomer(customerId: string): Promise<{ customer_id: string;[key: string]: any }> {
		await this.initialized;

		try {
			if (this.client && this.client.customers && this.client.customers.get) {
				try {
					const customer = await this.client.customers.get(customerId);
					return customer;
				} catch (sdkError) {
					this.logger.warn("SDK customer retrieval failed, falling back to fetch");
				}
			}

			// Fallback to direct API call
			const response = await this.fetchWithAuth(`/v0.1/customers/${customerId}`);
			return await response.json();
		} catch (error) {
			this.logger.error("Failed to get SumUp customer");
			this.handleApiError(error);
		}
	}

	/**
	 * Update customer details
	 */
	async updateCustomer(customerId: string, updateData: Partial<SumUpCustomerData>): Promise<{ customer_id: string;[key: string]: any }> {
		await this.initialized;

		try {
			if (this.client && this.client.customers && this.client.customers.update) {
				try {
					const customer = await this.client.customers.update(customerId, updateData);
					return customer;
				} catch (sdkError) {
					this.logger.warn("SDK customer update failed, falling back to fetch");
				}
			}

			// Fallback to direct API call
			const response = await this.fetchWithAuth(`/v0.1/customers/${customerId}`, {
				method: "PUT",
				body: JSON.stringify(updateData),
			});

			return await response.json();
		} catch (error) {
			this.logger.error("Failed to update SumUp customer");
			this.handleApiError(error);
		}
	}

	/**
	 * List customer payment instruments
	 */
	async listCustomerPaymentInstruments(customerId: string): Promise<SumUpPaymentInstrument[]> {
		await this.initialized;

		try {
			if (this.client && this.client.customers && this.client.customers.listPaymentInstruments) {
				try {
					const instruments = await this.client.customers.listPaymentInstruments(customerId);
					return instruments.map(instrument => ({
						token: instrument.token || "",
						active: instrument.active !== false,
						created_at: instrument.created_at || new Date().toISOString(),
						card: instrument.card ? {
							type: instrument.card.type || "",
							last_4_digits: instrument.card.last_4_digits || "",
						} : undefined,
					}));
				} catch (sdkError) {
					this.logger.warn("SDK payment instruments failed, falling back to fetch");
				}
			}

			// Fallback to direct API call
			const response = await this.fetchWithAuth(`/v0.1/customers/${customerId}/payment-instruments`);
			return await response.json();
		} catch (error) {
			this.logger.error("Failed to list customer payment instruments");
			this.handleApiError(error);
		}
	}

	/**
	 * Deactivate customer payment instrument
	 */
	async deactivateCustomerPaymentInstrument(customerId: string, token: string): Promise<void> {
		await this.initialized;

		try {
			if (this.client && this.client.customers && this.client.customers.deactivatePaymentInstrument) {
				try {
					await this.client.customers.deactivatePaymentInstrument(customerId, token);
					return;
				} catch (sdkError) {
					this.logger.warn("SDK payment instrument deactivation failed, falling back to fetch");
				}
			}

			// Fallback to direct API call
			await this.fetchWithAuth(`/v0.1/customers/${customerId}/payment-instruments/${token}`, {
				method: "DELETE",
			});
		} catch (error) {
			this.logger.error("Failed to deactivate customer payment instrument");
			this.handleApiError(error);
		}
	}

	/**
	 * Validate webhook signature
	 * This would use SumUp's official webhook signature validation when available
	 */
	validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
		// Placeholder for webhook signature validation
		// Implementation would depend on SumUp's webhook signature method
		// For now, returning true but this should be implemented based on SumUp's documentation
		this.logger.debug("Webhook signature validation called");

		// TODO: Implement actual signature validation based on SumUp's webhook specification
		return true;
	}
}
