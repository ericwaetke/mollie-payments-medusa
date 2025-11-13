import SumUpBase from "../core/sumup-base";
import { PaymentProviderKeys } from "../types";

class SumUpGooglePayService extends SumUpBase {
	static identifier = PaymentProviderKeys.SUMUP_GOOGLE_PAY;

	/**
	 * Returns the webhook URL for this payment provider
	 */
	get webhookUrl(): string {
		return `${this.options_.medusaUrl}/hooks/payment/${PaymentProviderKeys.SUMUP_GOOGLE_PAY}_sumup`;
	}
}

export default SumUpGooglePayService;
