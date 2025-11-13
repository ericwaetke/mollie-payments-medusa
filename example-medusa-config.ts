import { defineConfig, Modules } from "@medusajs/framework/utils"

export default defineConfig({
	projectConfig: {
		databaseUrl: process.env.DATABASE_URL,
		http: {
			storeCors: process.env.STORE_CORS!,
			adminCors: process.env.ADMIN_CORS!,
			authCors: process.env.AUTH_CORS!,
			jwtSecret: process.env.JWT_SECRET || "supersecret",
			cookieSecret: process.env.COOKIE_SECRET || "supersecret",
		},
	},
	admin: {
		backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
	},
	modules: [
		// ... other modules
		{
			resolve: "@medusajs/medusa/payment",
			options: {
				providers: [
					// SumUp Payment Provider
					{
						resolve: "@sumup/sumup-payments-medusa/providers/sumup",
						id: "sumup",
						options: {
							// Required: Your SumUp secret API key
							apiKey: process.env.SUMUP_API_KEY,

							// Optional: Your merchant code (will be auto-detected if not provided)
							merchantCode: process.env.SUMUP_MERCHANT_CODE,

							// Required: URL to redirect customers after payment completion
							redirectUrl: process.env.SUMUP_REDIRECT_URL || "https://your-store.com/order/confirmed",

							// Required: Your Medusa backend URL for webhooks
							medusaUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",

							// Optional: Whether to automatically capture payments (default: true)
							autoCapture: process.env.SUMUP_AUTO_CAPTURE !== "false",

							// Optional: Default description for payments
							description: process.env.SUMUP_DESCRIPTION || "Payment via Your Store",

							// Optional: Enable debug mode (default: false)
							debug: process.env.NODE_ENV === "development",

							// Optional: Environment - "test" for sandbox, "live" for production (default: "test")
							environment: process.env.SUMUP_ENVIRONMENT || "test",

							// Optional: Custom API host (for SDK initialization)
							host: process.env.SUMUP_API_HOST,

							// Optional: Additional fetch parameters for SDK requests
							baseParams: {
								timeout: parseInt(process.env.SUMUP_REQUEST_TIMEOUT || "30000"),
							},
						},
					},

					// You can add other payment providers here
					// {
					//   resolve: "@medusajs/medusa/payment-stripe",
					//   id: "stripe",
					//   options: {
					//     apiKey: process.env.STRIPE_API_KEY,
					//   }
					// }
				],
			},
		},
	],
})

/*
Environment Variables (.env):

# SumUp Configuration
SUMUP_API_KEY=sup_sk_your_secret_key_here
SUMUP_MERCHANT_CODE=MC123456
SUMUP_REDIRECT_URL=https://your-storefront.com/order/confirmed
SUMUP_DESCRIPTION=Payment via Your Amazing Store
SUMUP_AUTO_CAPTURE=true
SUMUP_ENVIRONMENT=test
SUMUP_API_HOST=https://api.sumup.com
SUMUP_REQUEST_TIMEOUT=30000

# Medusa Backend URL
MEDUSA_BACKEND_URL=https://your-backend.com

# Database
DATABASE_URL=postgres://username:password@localhost:5432/medusa_db

# CORS Settings
STORE_CORS=http://localhost:8000,https://your-storefront.com
ADMIN_CORS=http://localhost:7001,https://your-admin.com
AUTH_CORS=http://localhost:8000,https://your-storefront.com

# Security
JWT_SECRET=your_jwt_secret_here
COOKIE_SECRET=your_cookie_secret_here
*/
