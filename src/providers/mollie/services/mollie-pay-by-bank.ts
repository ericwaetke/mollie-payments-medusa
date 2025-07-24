import MollieBase from "../core/mollie-base";
import { PaymentOptions, PaymentProviderKeys } from "../types";

class MolliePayByBankService extends MollieBase {
  static identifier = PaymentProviderKeys.PAY_BY_BANK;

  get paymentCreateOptions(): PaymentOptions {
    return {
      webhookUrl:
        this.options_.medusaUrl +
        "/hooks/payment/" +
        PaymentProviderKeys.PAY_BY_BANK +
        "_mollie",
    };
  }
}

export default MolliePayByBankService;
