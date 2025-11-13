# PayPal Integration with SumUp Payment Provider

This guide explains how to integrate PayPal payments using the SumUp Payment Provider for Medusa.

## Overview

PayPal integration with SumUp is implemented as an Alternative Payment Method (APM). When customers choose PayPal, they are redirected to SumUp's payment interface, which then handles the PayPal authentication and payment processing.

## Configuration

### Basic Setup

PayPal is automatically available when you configure the SumUp payment provider. No additional PayPal-specific configuration is required.

```typescript
// medusa-config.ts
{
  resolve: "@sumup/sumup-payments-medusa/providers/sumup",
  id: "sumup",
  options: {
    apiKey: process.env.SUMUP_API_KEY,
    redirectUrl: process.env.SUMUP_REDIRECT_URL,
    medusaUrl: process.env.MEDUSA_BACKEND_URL,
    // PayPal is automatically enabled with these settings
  }
}
```

### Prerequisites

1. **SumUp Account**: You must have a SumUp merchant account with PayPal enabled
2. **PayPal Activation**: Contact SumUp support to enable PayPal for your merchant account
3. **Country Availability**: PayPal through SumUp is available in specific countries - check with SumUp for availability

## Implementation

### 1. Adding PayPal to Your Checkout

```typescript
import { usePaymentSession } from "@medusajs/medusa-react"

const PaymentMethods = ({ cart }) => {
  const { mutate: setPaymentSession } = usePaymentSession(cart?.id)

  const selectPayPal = () => {
    setPaymentSession({
      provider_id: "sumup-paypal",
    })
  }

  return (
    <div className="payment-methods">
      <button 
        onClick={selectPayPal}
        className="paypal-button"
      >
        <img src="/paypal-logo.svg" alt="PayPal" />
        Pay with PayPal
      </button>
    </div>
  )
}
```

### 2. Payment Flow

The PayPal payment flow with SumUp follows these steps:

1. **Customer Selection**: Customer chooses PayPal as payment method
2. **Payment Session**: Medusa creates a payment session with `sumup-paypal` provider
3. **SumUp Redirect**: Customer is redirected to SumUp's payment interface
4. **PayPal Authentication**: SumUp redirects customer to PayPal for authentication
5. **Payment Processing**: Customer completes payment on PayPal
6. **Return to Store**: Customer is redirected back to your store
7. **Webhook Notification**: SumUp sends webhook to update payment status

### 3. Handling Customer Data

For PayPal payments, you can optionally provide customer information to improve the payment experience:

```typescript
// When creating the payment session, you can include customer details
const paymentSessionData = {
  provider_id: "sumup-paypal",
  data: {
    personal_details: {
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
    }
  }
}
```

## Payment States

PayPal payments through SumUp can have the following states:

- **PENDING**: Payment is being processed
- **PAID**: Payment completed successfully
- **FAILED**: Payment was declined or failed
- **CANCELLED**: Customer cancelled the payment

## Error Handling

### Common PayPal Error Scenarios

1. **PayPal Not Available**: PayPal may not be available for certain currencies or countries
2. **Customer Cancellation**: Customer cancels payment on PayPal
3. **Insufficient Funds**: Customer's PayPal account has insufficient funds
4. **Authentication Failure**: Customer fails PayPal authentication

```typescript
// Error handling in your checkout component
const handlePaymentError = (error) => {
  switch (error.code) {
    case 'PAYPAL_NOT_AVAILABLE':
      // Show alternative payment methods
      showAlternativePayments()
      break
    case 'PAYMENT_CANCELLED':
      // Customer cancelled, return to checkout
      returnToCheckout()
      break
    case 'PAYMENT_FAILED':
      // Payment failed, show error message
      showErrorMessage('Payment failed. Please try again.')
      break
    default:
      // Generic error handling
      showErrorMessage('An error occurred. Please try again.')
  }
}
```

## Testing PayPal Integration

### Test Environment

1. Use SumUp's test API keys
2. Enable test mode in your configuration
3. PayPal transactions will be simulated in test mode

```typescript
// Test configuration
{
  resolve: "@sumup/sumup-payments-medusa/providers/sumup",
  options: {
    apiKey: process.env.SUMUP_TEST_API_KEY, // Test API key
    environment: "test",
    // ... other options
  }
}
```

### Test Scenarios

- **Successful Payment**: Test complete PayPal payment flow
- **Payment Cancellation**: Test customer cancelling on PayPal
- **Payment Failure**: Test failed payment scenarios
- **Refund Processing**: Test refunding PayPal payments

## Webhook Configuration

PayPal payments use the following webhook endpoint:

```
POST /hooks/payment/sumup-paypal_sumup
```

### Webhook Events

The webhook will receive these events for PayPal payments:

- `transaction_successful`: PayPal payment completed
- `transaction_failed`: PayPal payment failed
- `transaction_cancelled`: PayPal payment cancelled

## Refunds

PayPal payments can be refunded through the Medusa admin interface:

### Full Refunds
```typescript
// Full refund is processed automatically
await orderService.refund(orderId, refundAmount)
```

### Partial Refunds
```typescript
// Partial refunds are supported
await orderService.refund(orderId, partialAmount)
```

### Refund Limitations

- Refunds must be processed within PayPal's refund window (typically 180 days)
- Refund amount cannot exceed the original payment amount
- Some PayPal payment types may have different refund restrictions

## Best Practices

### 1. User Experience

- **Clear Branding**: Use official PayPal branding and logos
- **Loading States**: Show loading indicators during redirects
- **Error Messages**: Provide clear error messages for failed payments
- **Mobile Optimization**: Ensure PayPal flow works well on mobile devices

### 2. Security

- **Webhook Validation**: Always validate webhook signatures (when available)
- **SSL/TLS**: Ensure all connections use HTTPS
- **Data Protection**: Handle customer data according to privacy regulations

### 3. Order Management

- **Payment Status Tracking**: Monitor payment status changes via webhooks
- **Reconciliation**: Regularly reconcile PayPal payments with your records
- **Dispute Handling**: Have processes in place for PayPal disputes

## Troubleshooting

### Common Issues

1. **PayPal Not Showing**: 
   - Check if PayPal is enabled in your SumUp account
   - Verify your merchant account supports PayPal
   - Ensure customer's country supports PayPal

2. **Redirect Issues**:
   - Verify `redirectUrl` is correctly configured
   - Check that URLs are accessible and use HTTPS
   - Ensure webhook endpoints are reachable

3. **Payment Status Not Updating**:
   - Check webhook configuration
   - Verify webhook endpoint is accessible from SumUp
   - Review webhook logs for errors

### Debug Mode

Enable debug mode to get detailed logging:

```typescript
{
  options: {
    debug: true,
    // ... other options
  }
}
```

## Support and Resources

- **SumUp Documentation**: https://developer.sumup.com
- **PayPal Integration**: Contact SumUp support for PayPal-specific questions
- **Medusa Documentation**: https://docs.medusajs.com
- **Technical Support**: Create issues in the plugin repository

## Country Availability

PayPal through SumUp is available in select countries. Check with SumUp for the most up-to-date list of supported countries and any specific requirements or restrictions.

## Compliance

When implementing PayPal payments:

- Follow PayPal's acceptable use policies
- Comply with local payment regulations
- Implement proper customer data protection
- Ensure accessibility compliance for payment interfaces
