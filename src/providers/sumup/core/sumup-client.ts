import SumUp from "@sumup/sdk";
import type { AuthorizePaymentInput, AuthorizePaymentOutput, Logger } from "@medusajs/framework/types";
import { AbstractPaymentProvider, MedusaError } from "@medusajs/framework/utils";
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

type Options = {
	apiKey: string
	host: string
	baseParams: Record<string, string>
}

type InjectedDependencies = {
	logger: Logger
}

/**
 * SumUp client using the official TypeScript SDK for supported features
 * and fetch for features not yet available in the SDK
 */
export class SumUpClient extends AbstractPaymentProvider<Options> {
	static identifier = "sumup"

	protected logger_: Logger
	protected options_: Options
	protected client: SumUp

	constructor(
		container: InjectedDependencies,
		options: Options
	) {
		super(container, options)

		this.logger_ = container.logger
		this.options_ = options

		this.client = new SumUp({
			apiKey: options.apiKey,
			host: options.host,
			baseParams: options.baseParams,
		});
	}

	async authorizePayment(
		input: AuthorizePaymentInput
	): Promise<AuthorizePaymentOutput> {
		try {
			// Get the checkout ID that was stored during initiatePayment
			const checkoutId = input.data?.checkoutId;

			if (!checkoutId) {
				throw new Error("No checkout ID found in payment data");
			}

			// Retrieve the checkout to verify its status
			const checkout = await this.client.checkouts.get(checkoutId);

			// Process the checkout if it hasn't been processed yet
			let paymentData = checkout;

			if (checkout.status === "PENDING") {
				// Process the checkout with stored or new payment details
				paymentData = await this.client.checkouts.process(checkoutId, {
					payment_type: "card",
					token: input.data?.token, // Use stored token if available
					customer_id: input.data?.customerId
				});
			}

			// Return the authorized payment data
			return {
				data: {
					checkoutId: paymentData.id,
					transactionId: paymentData.transaction_id,
					status: paymentData.status,
					amount: paymentData.amount,
					currency: paymentData.currency,
					// Store additional data for later capture
					raw_response: paymentData
				},
				status: "authorized" // Medusa expects this status
			};
		} catch (error) {
			throw new Error(`SumUp authorization failed: ${error.message}`);
		}
	}
}
