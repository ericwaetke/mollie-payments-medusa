import {
	Logger,
	ProviderWebhookPayload,
	WebhookActionResult,
} from "@medusajs/framework/types";
import {
	AbstractPaymentProvider,
	BigNumber,
	MedusaError,
	PaymentActions,
	PaymentSessionStatus,
} from "@medusajs/framework/utils";
import {
	AuthorizePaymentInput,
	AuthorizePaymentOutput,
	BigNumberRawValue,
	CancelPaymentInput,
	CancelPaymentOutput,
	CapturePaymentInput,
	CapturePaymentOutput,
	DeletePaymentInput,
	DeletePaymentOutput,
	GetPaymentStatusInput,
	GetPaymentStatusOutput,
	InitiatePaymentInput,
	InitiatePaymentOutput,
	RefundPaymentInput,
	RefundPaymentOutput,
	RetrievePaymentInput,
	RetrievePaymentOutput,
	UpdatePaymentInput,
	UpdatePaymentOutput,
} from "@medusajs/types";
import { SumUpClient } from "./sumup-client";
import {
	ProviderOptions,
	SumUpCheckoutResponse,
	SumUpPaymentProcessData,
	SumUpWebhookPayload,
	PaymentProviderKeys,
} from "../types";

/**
 * Dependencies injected into the service
 */
type InjectedDependencies = {
	logger: Logger;
};

/**
 * Implementation of SumUp Payment Provider for Medusa
 */
abstract class SumUpBase extends AbstractPaymentProvider {
	protected readonly options_: ProviderOptions;
	protected logger_: Logger;
	protected client_: SumUpClient;
	protected debug_: boolean;

	/**
	 * Validates that the required options are provided
	 * @param options - The options to validate
	 * @throws {MedusaError} If API key is missing
	 */
	static validateOptions(options: ProviderOptions): void {
		if (!options.apiKey) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				"API key is required in the provider's options."
			);
		}

		if (!options.redirectUrl) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				"Redirect URL is required in the provider's options."
			);
		}

		if (!options.medusaUrl) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				"Medusa URL is required in the provider's options."
			);
		}
	}

	/**
	 * Creates a new instance of the SumUp payment provider
	 * @param container - The dependency container
	 * @param options - Configuration options
	 */
	constructor(container: InjectedDependencies, options: ProviderOptions) {
		super(container, options);

		this.logger_ = container.logger;
		this.options_ = options;
		this.debug_ =
			options.debug ||
			process.env.NODE_ENV === "development" ||
			process.env.NODE_ENV === "test" ||
			false;

		this.client_ = new SumUpClient(options, this.logger_);
	}

	/**
	 * Normalizes payment creation parameters
	 */
	private normalizePaymentCreateParams(input: InitiatePaymentInput) {
		const res = {
			amount: this.getAmountAsNumber(input.amount),
			currency_code: input.currency_code,
			context: input.context,
		};

		return res;
	}

	/**
	 * Gets the amount as a number from BigNumber input
	 */
	private getAmountAsNumber(amount: BigNumberRawValue): number {
		return new BigNumber(amount).toNumber();
	}

	/**
	 * Initiates a payment with SumUp
	 */
	async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
		try {
			const normalizedParams = this.normalizePaymentCreateParams(input);

			// Generate a unique checkout reference
			const checkoutReference = `medusa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

			// Get merchant info if merchant code is not provided
			let merchantCode = this.options_.merchantCode;
			if (!merchantCode) {
				try {
					const merchant = await this.client_.getMerchant();
					merchantCode = merchant.merchant_code;
					if (!merchantCode) {
						throw new Error("Merchant code not found in API response");
					}
				} catch (error) {
					this.logger_.error("Failed to get merchant code", error);
					throw new MedusaError(
						MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
						"Failed to get merchant information from SumUp"
					);
				}
			}

			const createParams = {
				amount: normalizedParams.amount,
				currency: normalizedParams.currency_code,
				checkout_reference: checkoutReference,
				description: this.options_.description || "Payment via Medusa",
				merchant_code: merchantCode,
				redirect_url: this.options_.redirectUrl,
				return_url: this.options_.redirectUrl,
			};

			this.logger_.debug("Creating SumUp checkout", { createParams });

			const checkout = await this.client_.createCheckout(createParams);

			return {
				data: {
					id: checkout.id,
					checkout_reference: checkout.checkout_reference,
					amount: checkout.amount,
					currency: checkout.currency,
					status: checkout.status,
					merchant_code: checkout.merchant_code,
				},
			};
		} catch (error) {
			this.logger_.error("Failed to initiate SumUp payment", error);
			throw error;
		}
	}

	/**
	 * Authorizes a payment session
	 */
	async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
		try {
			const checkoutId = input.data?.id;

			if (!checkoutId) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					"Checkout ID is required for authorization"
				);
			}

			// Get the current checkout status
			const checkout = await this.client_.getCheckout(checkoutId);

			if (checkout.status === "PAID") {
				return {
					status: PaymentSessionStatus.AUTHORIZED,
					data: {
						...input.data,
						status: checkout.status,
						transactions: checkout.transactions,
					},
				};
			}

			if (checkout.status === "FAILED") {
				return {
					status: PaymentSessionStatus.ERROR,
					data: {
						...input.data,
						status: checkout.status,
					},
				};
			}

			return {
				status: PaymentSessionStatus.PENDING,
				data: {
					...input.data,
					status: checkout.status,
				},
			};
		} catch (error) {
			this.logger_.error("Failed to authorize SumUp payment", error);
			throw error;
		}
	}

	/**
	 * Captures a payment
	 */
	async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
		try {
			const checkoutId = input.data?.id;

			if (!checkoutId) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					"Checkout ID is required for capture"
				);
			}

			// Get the current checkout status
			const checkout = await this.client_.getCheckout(checkoutId);

			if (checkout.status !== "PAID") {
				throw new MedusaError(
					MedusaError.Types.PAYMENT_CAPTURE_ERROR,
					`Cannot capture payment with status: ${checkout.status}`
				);
			}

			// SumUp payments are automatically captured when paid
			return {
				data: {
					...input.data,
					status: checkout.status,
					transactions: checkout.transactions,
				},
			};
		} catch (error) {
			this.logger_.error("Failed to capture SumUp payment", error);
			throw error;
		}
	}

	/**
	 * Refunds a payment
	 */
	async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
		try {
			const transactions = input.data?.transactions || [];
			const refundAmount = this.getAmountAsNumber(input.amount);

			if (!transactions.length) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					"No transactions found for refund"
				);
			}

			// Use the first successful transaction for refund
			const transaction = transactions.find((t: any) => t.status === "SUCCESSFUL");

			if (!transaction) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					"No successful transaction found for refund"
				);
			}

			const refundData = refundAmount ? { amount: refundAmount } : undefined;

			await this.client_.refundTransaction(transaction.id, refundData);

			return {
				data: {
					...input.data,
					refunded_amount: refundAmount,
				},
			};
		} catch (error) {
			this.logger_.error("Failed to refund SumUp payment", error);
			throw error;
		}
	}

	/**
	 * Cancels a payment
	 */
	async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
		try {
			const checkoutId = input.data?.id;

			if (checkoutId) {
				try {
					// Try to deactivate the checkout using the SDK
					await this.client_.deactivateCheckout(checkoutId);
					this.logger_.debug("Successfully deactivated SumUp checkout", { checkoutId });
				} catch (error) {
					// If deactivation fails (e.g., already processed), just log and continue
					this.logger_.warn("Could not deactivate checkout, it may have already been processed", {
						checkoutId,
						error: error.message
					});
				}
			}

			return {
				data: {
					...input.data,
					status: "CANCELLED",
				},
			};
		} catch (error) {
			this.logger_.error("Failed to cancel SumUp payment", error);
			throw error;
		}
	}

	/**
	 * Deletes a payment session
	 */
	async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
		try {
			// SumUp doesn't require explicit deletion of payment sessions
			// They will expire automatically
			return {
				data: input.data,
			};
		} catch (error) {
			this.logger_.error("Failed to delete SumUp payment", error);
			return {
				data: input.data,
			};
		}
	}

	/**
	 * Gets the payment status
	 */
	async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
		try {
			const checkoutId = input.data?.id;

			if (!checkoutId) {
				return { status: PaymentSessionStatus.ERROR };
			}

			const checkout = await this.client_.getCheckout(checkoutId);

			const statusMap = {
				PENDING: PaymentSessionStatus.PENDING,
				FAILED: PaymentSessionStatus.ERROR,
				PAID: PaymentSessionStatus.AUTHORIZED,
			};

			const mappedStatus = statusMap[checkout.status] || PaymentSessionStatus.PENDING;

			return {
				status: mappedStatus,
				data: {
					...input.data,
					status: checkout.status,
					transactions: checkout.transactions,
				},
			};
		} catch (error) {
			this.logger_.error("Failed to get SumUp payment status", error);
			return { status: PaymentSessionStatus.ERROR };
		}
	}

	/**
	 * Retrieves payment data
	 */
	async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
		try {
			const checkoutId = input.data?.id;

			if (!checkoutId) {
				return { data: input.data };
			}

			const checkout = await this.client_.getCheckout(checkoutId);

			return {
				data: {
					...input.data,
					status: checkout.status,
					amount: checkout.amount,
					currency: checkout.currency,
					transactions: checkout.transactions,
				},
			};
		} catch (error) {
			this.logger_.error("Failed to retrieve SumUp payment", error);
			return { data: input.data };
		}
	}

	/**
	 * Updates payment data
	 */
	async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
		try {
			const checkoutId = input.data?.id;

			if (!checkoutId) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					"Checkout ID is required for update"
				);
			}

			// SumUp doesn't support updating checkouts after creation
			// Return the current data
			return {
				data: {
					...input.data,
					amount: this.getAmountAsNumber(input.amount),
					currency_code: input.currency_code,
				},
			};
		} catch (error) {
			this.logger_.error("Failed to update SumUp payment", error);
			throw error;
		}
	}

	/**
	 * Processes webhook events from SumUp
	 */
	async getWebhookActionAndData(
		payload: ProviderWebhookPayload["payload"]
	): Promise<WebhookActionResult> {
		try {
			const data = payload.data as SumUpWebhookPayload;

			switch (data.event_type) {
				case "transaction_successful":
				case "payment_captured":
				case "checkout_paid":
					return {
						action: PaymentActions.SUCCESSFUL,
						data: {
							session_id: data.resource.checkout_reference || data.resource.id || "",
							amount: new BigNumber(data.resource.amount || 0),
						},
					};

				case "transaction_failed":
				case "payment_failed":
				case "checkout_failed":
					return {
						action: PaymentActions.FAILED,
						data: {
							session_id: data.resource.checkout_reference || data.resource.id || "",
							amount: new BigNumber(data.resource.amount || 0),
						},
					};

				case "transaction_cancelled":
				case "payment_cancelled":
				case "checkout_cancelled":
				case "checkout_expired":
					return {
						action: PaymentActions.CANCELED,
						data: {
							session_id: data.resource.checkout_reference || data.resource.id || "",
							amount: new BigNumber(data.resource.amount || 0),
						},
					};

				default:
					this.logger_.warn("Unsupported webhook event type", { event_type: data.event_type });
					return {
						action: PaymentActions.NOT_SUPPORTED,
						data: {
							session_id: data.resource.checkout_reference || data.resource.id || "",
							amount: new BigNumber(data.resource.amount || 0),
						},
					};
			}
		} catch (error) {
			this.logger_.error("Failed to process SumUp webhook", error);
			return {
				action: PaymentActions.FAILED,
				data: {
					session_id: "",
					amount: new BigNumber(0),
				},
			};
		}
	}
}

export default SumUpBase;
