import SumUpBase from "../core/sumup-base";
import { PaymentProviderKeys } from "../types";

class SumUpCardService extends SumUpBase {
	static identifier = PaymentProviderKeys.SUMUP_CARD;

	/**
	 * Returns the webhook URL for this payment provider
	 */
	get webhookUrl(): string {
		return `${this.options_.medusaUrl}/hooks/payment/${PaymentProviderKeys.SUMUP_CARD}_sumup`;
	}
}

export default SumUpCardService;
