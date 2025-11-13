import axios, { AxiosInstance, AxiosError } from "axios";
import { Logger } from "@medusajs/framework/types";
import { MedusaError } from "@medusajs/framework/utils";
import {
	ProviderOptions,
	SumUpCheckoutData,
	SumUpCheckoutResponse,
	SumUpPaymentProcessData,
	SumUpPaymentProcessResponse,
	SumUpRefundData,
	SumUpErrorResponse,
	SUMUP_API_ENDPOINTS,
} from "../types";

/**
 * SumUp API client for handling all interactions with SumUp's API
 */
export class SumUpClient {
	private client: AxiosInstance;
	private logger: Logger;
	private options: ProviderOptions;

	constructor(options: ProviderOptions, logger: Logger) {
		this.options = options;
		this.logger = logger;

		const baseURL = this.getBaseUrl();

		this.client = axios.create({
			baseURL,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${options.apiKey}`,
				"User-Agent": `Medusa-SumUp-Plugin/1.0.0`,
			},
			timeout: 30000,
		});

		// Add response interceptor for error handling
		this.client.interceptors.response.use(
			(response) => response,
			(error: AxiosError) => {
				this.handleApiError(error);
			}
		);

		if (options.debug) {
			this.client.interceptors.request.use((request) => {
				this.logger.info(`SumUp API Request: ${request.method?.toUpperCase()} ${request.url}`, {
					headers: { ...request.headers, Authorization: "[REDACTED]" },
					data: request.data,
				});
				return request;
			});

			this.client.interceptors.response.use((response) => {
				this.logger.info(`SumUp API Response: ${response.status}`, {
					data: response.data,
				});
				return response;
			});
		}
	}

	private getBaseUrl(): string {
		// SumUp uses the same base URL for both test and production
		// The environment is determined by the API key
		return SUMUP_API_ENDPOINTS.PRODUCTION;
	}

	private handleApiError(error: AxiosError): never {
		if (error.response?.data) {
			const sumupError = error.response.data as SumUpErrorResponse;
			this.logger.error("SumUp API Error", {
				status: error.response.status,
				error: sumupError,
			});

			throw new MedusaError(
				MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
				`SumUp API Error: ${sumupError.message || error.message}`
			);
		}

		this.logger.error("SumUp API Network Error", {
			message: error.message,
			code: error.code,
		});

		throw new MedusaError(
			MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
			`SumUp Network Error: ${error.message}`
		);
	}

	/**
	 * Get the current merchant information
	 */
	async getMerchant(): Promise<any> {
		try {
			const response = await this.client.get("/v0.1/me");
			return response.data;
		} catch (error) {
			this.logger.error("Failed to fetch merchant information", error);
			throw error;
		}
	}

	/**
	 * Create a checkout with SumUp
	 */
	async createCheckout(data: SumUpCheckoutData): Promise<SumUpCheckoutResponse> {
		try {
			this.logger.debug("Creating SumUp checkout", { data });
			const response = await this.client.post("/v0.1/checkouts", data);
			return response.data;
		} catch (error) {
			this.logger.error("Failed to create SumUp checkout", error);
			throw error;
		}
	}

	/**
	 * Process a checkout (complete the payment)
	 */
	async processCheckout(
		checkoutId: string,
		paymentData: SumUpPaymentProcessData
	): Promise<SumUpPaymentProcessResponse> {
		try {
			this.logger.debug("Processing SumUp checkout", { checkoutId, paymentData });
			const response = await this.client.put(`/v0.1/checkouts/${checkoutId}`, paymentData);
			return response.data;
		} catch (error) {
			this.logger.error("Failed to process SumUp checkout", error);
			throw error;
		}
	}

	/**
	 * Get checkout details
	 */
	async getCheckout(checkoutId: string): Promise<SumUpCheckoutResponse> {
		try {
			const response = await this.client.get(`/v0.1/checkouts/${checkoutId}`);
			return response.data;
		} catch (error) {
			this.logger.error("Failed to get SumUp checkout", error);
			throw error;
		}
	}

	/**
	 * Refund a transaction
	 */
	async refundTransaction(transactionId: string, refundData?: SumUpRefundData): Promise<void> {
		try {
			this.logger.debug("Refunding SumUp transaction", { transactionId, refundData });
			await this.client.post(`/v0.1/me/refund/${transactionId}`, refundData || {});
		} catch (error) {
			this.logger.error("Failed to refund SumUp transaction", error);
			throw error;
		}
	}

	/**
	 * Get transaction details
	 */
	async getTransaction(transactionId: string): Promise<any> {
		try {
			const response = await this.client.get(`/v0.1/me/transactions/${transactionId}`);
			return response.data;
		} catch (error) {
			this.logger.error("Failed to get SumUp transaction", error);
			throw error;
		}
	}

	/**
	 * Validate webhook signature (if SumUp provides webhook signature validation)
	 */
	validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
		// SumUp webhook signature validation would go here
		// This is a placeholder as the exact implementation depends on SumUp's webhook signature method
		return true;
	}
}
