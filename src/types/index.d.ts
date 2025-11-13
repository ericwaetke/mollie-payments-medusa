declare module "@sumup/sumup-payments-medusa" {
	export * from "./providers/sumup/types";
	export { default as SumUpProvider } from "./providers/sumup";
}

declare module "@sumup/sumup-payments-medusa/providers/sumup" {
	export { default } from "../providers/sumup";
}

declare module "@sumup/sumup-payments-medusa/providers/sumup/types" {
	export * from "../providers/sumup/types";
}

declare module "@sumup/sumup-payments-medusa/providers/sumup/services" {
	export * from "../providers/sumup/services";
}

// Global type augmentations for Medusa
declare global {
	namespace Medusa {
		interface PaymentProviders {
			"sumup-hosted-checkout": any;
			"sumup-card": any;
			"sumup-apple-pay": any;
			"sumup-google-pay": any;
		}
	}
}

// Environment variable declarations
declare namespace NodeJS {
	interface ProcessEnv {
		SUMUP_API_KEY?: string;
		SUMUP_MERCHANT_CODE?: string;
		SUMUP_REDIRECT_URL?: string;
		SUMUP_DESCRIPTION?: string;
		SUMUP_AUTO_CAPTURE?: string;
		SUMUP_ENVIRONMENT?: "test" | "live";
		MEDUSA_BACKEND_URL?: string;
	}
}

export { };
