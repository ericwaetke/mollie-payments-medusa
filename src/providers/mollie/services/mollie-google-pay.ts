import { CaptureMethod, PaymentMethod } from "@mollie/api-client";
import MollieBase from "../core/mollie-base";
import { PaymentOptions, PaymentProviderKeys } from "../types";

class MollieGooglePayService extends MollieBase {
	static identifier = PaymentProviderKeys.GOOGLE_PAY;

	get paymentCreateOptions(): PaymentOptions {
		return {
			method: PaymentMethod.applepay,
			webhookUrl:
				this.options_.medusaUrl +
				"/hooks/payment/" +
				PaymentProviderKeys.GOOGLE_PAY +
				"_mollie",
			captureMethod: CaptureMethod.automatic,
		};
	}
}

export default MollieGooglePayService;
