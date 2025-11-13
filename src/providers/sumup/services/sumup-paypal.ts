import SumUpBase from "../core/sumup-base";
import { PaymentProviderKeys } from "../types";

class SumUpPayPalService extends SumUpBase {
	static identifier = PaymentProviderKeys.SUMUP_PAYPAL;

	/**
	 * Returns the webhook URL for this payment provider
	 */
	get webhookUrl(): string {
		return `${this.options_.medusaUrl}/hooks/payment/${PaymentProviderKeys.SUMUP_PAYPAL}_sumup`;
	}
}

export default SumUpPayPalService;
