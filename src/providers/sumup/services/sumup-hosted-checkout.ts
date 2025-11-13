import SumUpBase from "../core/sumup-base";
import { PaymentProviderKeys } from "../types";

class SumUpHostedCheckoutService extends SumUpBase {
	static identifier = PaymentProviderKeys.SUMUP_HOSTED_CHECKOUT;

	/**
	 * Returns the webhook URL for this payment provider
	 */
	get webhookUrl(): string {
		return `${this.options_.medusaUrl}/hooks/payment/${PaymentProviderKeys.SUMUP_HOSTED_CHECKOUT}_sumup`;
	}
}

export default SumUpHostedCheckoutService;
