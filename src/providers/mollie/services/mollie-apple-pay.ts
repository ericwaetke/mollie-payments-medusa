import { CaptureMethod, PaymentMethod } from "@mollie/api-client";
import MollieBase from "../core/mollie-base";
import { PaymentOptions, PaymentProviderKeys } from "../types";

class MollieApplePayService extends MollieBase {
  static identifier = PaymentProviderKeys.APPLE_PAY;

  get paymentCreateOptions(): PaymentOptions {
    console.log("vic logs apple pay");
    try {
      return {
        method: PaymentMethod.applepay,
        webhookUrl:
          this.options_.medusaUrl +
          "/hooks/payment/" +
          PaymentProviderKeys.APPLE_PAY +
          "_mollie",
        captureMethod: CaptureMethod.automatic,
      };
    } catch (error) {
      console.log("vic logs apple pay error", error);
      throw error;
    }
  }
}

export default MollieApplePayService;
