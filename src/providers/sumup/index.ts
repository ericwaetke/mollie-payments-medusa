import { ModuleProvider, Modules } from "@medusajs/framework/utils";

import {
	SumUpHostedCheckoutService,
	SumUpCardService,
	SumUpApplePayService,
	SumUpGooglePayService,
} from "./services";

const services = [
	SumUpHostedCheckoutService,
	SumUpCardService,
	SumUpApplePayService,
	SumUpGooglePayService,
];

export default ModuleProvider(Modules.PAYMENT, {
	services,
});
