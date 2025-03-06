import MollieBase from "../core/mollie-base";
import { PaymentOptions, PaymentProviderKeys } from "../types";

class MollieProviderService extends MollieBase {
  static identifier = PaymentProviderKeys.MOLLIE_HOSTED_CHECKOUT;

  get paymentCreateOptions(): PaymentOptions {
    return {};
  }
}

export default MollieProviderService;
