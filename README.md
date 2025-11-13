# SumUp Payment Provider for Medusa

A comprehensive payment provider for [Medusa](https://medusajs.com) that integrates with [SumUp's payment platform](https://developer.sumup.com), enabling businesses to accept online payments through various payment methods including credit cards, Apple Pay, and Google Pay.

## Features

- **Multiple Payment Methods**: Support for card payments, Apple Pay, Google Pay, and PayPal
- **Hosted Checkout**: Secure payment processing through SumUp's hosted checkout pages
- **Automatic Capture**: Configurable automatic payment capture
- **Refund Support**: Full and partial refund capabilities
- **Webhook Integration**: Real-time payment status updates via webhooks
- **Test Mode**: Full testing capabilities with SumUp's sandbox environment
- **TypeScript Support**: Fully typed for better developer experience

## Supported Payment Methods

- **Credit/Debit Cards**: Visa, Mastercard, American Express
- **Apple Pay**: Quick and secure payments for Apple devices
- **Google Pay**: Fast checkout for Android and web users
- **PayPal**: Secure payments through PayPal integration
- **Hosted Checkout**: Complete SumUp-hosted payment experience

## Installation

```bash
npm install @sumup/sumup-payments-medusa
# or
yarn add @sumup/sumup-payments-medusa
```

## Configuration

Add the SumUp payment provider to your `medusa-config.ts`:

```typescript
module.exports = defineConfig({
  // ...
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@sumup/sumup-payments-medusa/providers/sumup",
            id: "sumup",
            options: {
              apiKey: process.env.SUMUP_API_KEY,
              merchantCode: process.env.SUMUP_MERCHANT_CODE, // Optional
              redirectUrl: process.env.SUMUP_REDIRECT_URL,
              medusaUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
              autoCapture: true, // Optional, defaults to true
              description: "Payment via Your Store", // Optional
              debug: process.env.NODE_ENV === "development", // Optional
              environment: "test", // Optional: "test" or "live", defaults to "test"
            }
          }
        ]
      }
    }
  ]
})
```

## Environment Variables

Add these environment variables to your `.env` file:

```env
# SumUp Configuration
SUMUP_API_KEY=sup_sk_your_secret_key_here
SUMUP_MERCHANT_CODE=MC123456 # Optional, will be fetched automatically if not provided
SUMUP_REDIRECT_URL=https://your-storefront.com/order/confirmed
MEDUSA_BACKEND_URL=https://your-backend.com
```

### Getting Your SumUp Credentials

1. **Create a SumUp Account**: Sign up at [SumUp](https://me.sumup.com)
2. **Get API Keys**: 
   - For testing: Create a test account and generate test API keys
   - For production: Complete account verification and generate live API keys
3. **API Key Location**: Go to Settings → For developers → API Keys in your SumUp dashboard

## Payment Provider Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `apiKey` | string | Yes | Your SumUp secret API key (starts with `sup_sk_`) |
| `merchantCode` | string | No | Your SumUp merchant code (auto-detected if not provided) |
| `redirectUrl` | string | Yes | URL to redirect customers after payment completion |
| `medusaUrl` | string | Yes | Your Medusa backend URL for webhooks |
| `autoCapture` | boolean | No | Whether to automatically capture payments (default: true) |
| `description` | string | No | Default description for payments |
| `debug` | boolean | No | Enable debug logging (default: false) |
| `environment` | string | No | "test" or "live" (default: "test") |

## Available Payment Providers

The plugin provides multiple payment provider identifiers for different payment methods:

- `sumup-hosted-checkout`: Complete hosted payment experience
- `sumup-card`: Direct card payment processing
- `sumup-apple-pay`: Apple Pay integration
- `sumup-google-pay`: Google Pay integration
- `sumup-paypal`: PayPal integration

## Usage in Storefront

### Basic Checkout Integration

```typescript
// In your checkout component
import { usePaymentSession } from "@medusajs/medusa-react"

const CheckoutForm = () => {
  const { mutate: setPaymentSession } = usePaymentSession(cart?.id)

  const handlePaymentMethodChange = (providerId: string) => {
    setPaymentSession({
      provider_id: providerId, // e.g., "sumup-hosted-checkout"
    })
  }

  return (
    <div>
      <button onClick={() => handlePaymentMethodChange("sumup-hosted-checkout")}>
        Pay with SumUp
      </button>
      <button onClick={() => handlePaymentMethodChange("sumup-apple-pay")}>
        Apple Pay
      </button>
      <button onClick={() => handlePaymentMethodChange("sumup-google-pay")}>
        Google Pay
      </button>
      <button onClick={() => handlePaymentMethodChange("sumup-paypal")}>
        PayPal
      </button>
    </div>
  )
}
```

### Processing Payments

When using SumUp's hosted checkout, customers will be redirected to SumUp's secure payment page to complete their payment. After payment, they'll be redirected back to your `redirectUrl`.

## Webhook Configuration

The plugin automatically handles webhook endpoints for payment status updates:

- **Hosted Checkout**: `/hooks/payment/sumup-hosted-checkout_sumup`
- **Card Payments**: `/hooks/payment/sumup-card_sumup`
- **Apple Pay**: `/hooks/payment/sumup-apple-pay_sumup`
- **Google Pay**: `/hooks/payment/sumup-google-pay_sumup`
- **PayPal**: `/hooks/payment/sumup-paypal_sumup`

Make sure your `medusaUrl` is accessible from the internet for webhooks to work properly.

## Supported Currencies

SumUp supports the following currencies:

EUR, USD, GBP, CHF, SEK, DKK, NOK, PLN, CZK, HUF, BGN, RON, HRK, BRL, CLP

## Testing

### Test Cards

For testing, use SumUp's test API keys and these test card numbers:

- **Successful Payment**: 4200 0000 0000 0042
- **Failed Payment**: 4000 0000 0000 0002
- **3D Secure**: 4000 0000 0000 3220

### Test Environment

1. Create a test account in the SumUp dashboard
2. Use test API keys in your configuration
3. Set `environment: "test"` in your provider options

## Error Handling

The plugin includes comprehensive error handling:

```typescript
// Payment errors are automatically handled and logged
// Check Medusa logs for detailed error information
```

Common error scenarios:
- Invalid API credentials
- Unsupported currency
- Network connectivity issues
- Payment declined by customer's bank

## Refunds

The plugin supports both full and partial refunds through Medusa's admin interface:

```typescript
// Refunds are processed automatically through SumUp's API
// No additional configuration required
```

## Development

### Building the Plugin

```bash
yarn build
```

### Development Mode

```bash
yarn dev
```

## Support

- **SumUp Documentation**: https://developer.sumup.com
- **SumUp Support**: Contact SumUp support through your dashboard
- **Plugin Issues**: Create an issue in the repository

## Requirements

- Medusa v2.5.0 or higher
- Node.js 20 or higher
- Valid SumUp merchant account

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Changelog

### v1.0.0
- Initial release with support for SumUp payments
- Multiple payment methods (Card, Apple Pay, Google Pay, PayPal)
- Webhook integration
- Refund support
- Test environment support
