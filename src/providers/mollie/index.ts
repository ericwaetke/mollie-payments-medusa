import { ModuleProvider, Modules } from "@medusajs/framework/utils";

import {
	MollieApplePayService,
	MollieBancontactService,
	MollieCardService,
	MollieGiftcardService,
	MollieIdealService,
	MolliePaypalService,
	MollieProviderService,
	MolliePaybybankService,
	MollieGooglePayService,
} from "./services";

const services = [
	MollieApplePayService,
	MollieBancontactService,
	MollieCardService,
	MollieGiftcardService,
	MollieIdealService,
	MolliePaypalService,
	MollieProviderService,
	MolliePaybybankService,
	MollieGooglePayService
];

export default ModuleProvider(Modules.PAYMENT, {
	services,
});
