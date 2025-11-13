import { ModuleProvider, Modules } from "@medusajs/framework/utils";

import {
	SumUpHostedCheckoutService,
	SumUpCardService,
	SumUpApplePayService,
	SumUpGooglePayService,
	SumUpPayPalService,
} from "./services";

const services = [
	SumUpHostedCheckoutService,
	SumUpCardService,
	SumUpApplePayService,
	SumUpGooglePayService,
	SumUpPayPalService,
];

export default ModuleProvider(Modules.PAYMENT, {
	services,
});
