# Mollie Payments for Medusa

A comprehensive payment provider plugin for Medusa V2 that integrates with Mollie's payment gateway.

## Features

- **Multiple Payment Methods**: Supports a wide range of Mollie payment methods including:

  - Mollie Hosted Checkout
  - iDEAL
  - Bancontact
  - Credit Card
  - PayPal
  - Apple Pay
  - Gift Card

- **Easily Extendable**: The modular architecture makes it easy to add support for additional Mollie payment methods.

- **Webhook Support**: Full support for Mollie webhooks for real-time payment status updates.

- **Automatic Capture**: Configurable automatic capture of payments.

## Prerequisites

- Medusa server v2.3.0 or later
- Node.js v20 or later
- A Mollie account and API key with payment methods enabled

## Installation

```bash
yarn add @variablevic/mollie-payments-medusa
```

## Configuration

Add the plugin to your `medusa-config.ts` file:

```typescript
const plugins = [
  // ... other plugins
  {
    resolve: "@variablevic/mollie-payments-medusa",
    options: {
      apiKey: process.env.MOLLIE_API_KEY,
      redirectUrl: process.env.MOLLIE_REDIRECT_URL,
      medusaUrl: process.env.MEDUSA_URL || "http://localhost:9000",
      autoCapture: true, // optional, defaults to true
      description: "Mollie payment created by Medusa", // optional, defaults to "Mollie payment created by Medusa"
      debug: false, // optional, defaults to false
    },
  },
];
```

## Configuration Options

| Option        | Description                                                                               | Default                 |
| ------------- | ----------------------------------------------------------------------------------------- | ----------------------- |
| `apiKey`      | Your Mollie API key                                                                       | Required                |
| `redirectUrl` | The URL to redirect to after payment                                                      | Required                |
| `medusaUrl`   | The URL of your Medusa server                                                             | `http://localhost:9000` |
| `autoCapture` | Whether to automatically capture payments                                                 | `true`                  |
| `description` | The description that appears on the payment.                                              | `Mollie payment created by Medusa`          |
| `debug`       | Whether to enable debug mode                                                              | `false`                 |

## Environment Variables

Create or update your `.env` file with the following variables:

```bash
MOLLIE_API_KEY=your_mollie_api_key
MOLLIE_REDIRECT_URL=https://your-store.com/checkout/payment
MEDUSA_URL=https://your-medusa-server.com
```

## Usage

Once installed and configured, the Mollie payment methods will be available in your Medusa store.

### Client-Side Integration

To integrate with your storefront, you'll need to implement the payment flow according to Mollie's documentation. Here's a basic example:

1. Create a payment session in your checkout flow
2. Redirect the customer to the Mollie payment page
3. Handle the webhook notifications to update the payment status

### Supported Payment Methods

The plugin currently supports the following Mollie payment methods:

| Payment Method  | Provider Key             |
| --------------- | ------------------------ |
| Hosted Checkout | `mollie-hosted-checkout` |
| iDEAL           | `mollie-ideal`           |
| Credit Card     | `mollie-card`            |
| Bancontact      | `mollie-bancontact`      |
| Gift Card       | `mollie-giftcard`        |
| PayPal          | `mollie-paypal`          |
| Apple Pay       | `mollie-apple-pay`       |

## Extending the Plugin

To add support for additional Mollie payment methods, create a new service in `src/providers/mollie/services` that extends the `MollieBase` class:

```typescript
import { PaymentMethod } from "@mollie/api-client";
import MollieBase from "../core/mollie-base";
import { PaymentOptions, PaymentProviderKeys } from "../types";

class MollieNewMethodService extends MollieBase {
  static identifier = "mollie-new-method";

  get paymentCreateOptions(): PaymentOptions {
    return {
      method: PaymentMethod.new - method,
    };
  }
}

export default MollieNewMethodService;
```

Then add your new service to the list of services in `src/providers/mollie/index.ts`.

## Development

```bash
# Install dependencies
yarn

# Start development server
yarn dev
```

## License

MIT
