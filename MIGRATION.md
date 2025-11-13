# Migration Guide: SumUp SDK Integration

This guide outlines the changes and improvements made when migrating from the custom axios-based implementation to the official SumUp TypeScript SDK.

## Overview

The SumUp Medusa payment provider has been updated to use the official SumUp TypeScript SDK (`@sumup/sdk`), replacing the previous custom implementation that used axios for API calls. This migration provides better type safety, improved error handling, and future-proofing with official SDK updates.

## What Changed

### Dependencies

**Before:**
```json
{
  "dependencies": {
    "axios": "^1.6.0"
  }
}
```

**After:**
```json
{
  "dependencies": {
    "@sumup/sdk": "^1.0.0"
  }
}
```

### Client Implementation

The `SumUpClient` class has been completely rewritten to use the official SDK instead of custom axios calls.

**Before:**
```typescript
import axios, { AxiosInstance } from "axios";

export class SumUpClient {
  private client: AxiosInstance;
  
  constructor(options: ProviderOptions, logger: Logger) {
    this.client = axios.create({
      baseURL: "https://api.sumup.com",
      headers: {
        "Authorization": `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }
  
  async createCheckout(data: SumUpCheckoutData) {
    const response = await this.client.post("/v0.1/checkouts", data);
    return response.data;
  }
}
```

**After:**
```typescript
import SumUp from "@sumup/sdk";

export class SumUpClient {
  private client: SumUp;
  
  constructor(options: ProviderOptions, logger: Logger) {
    this.client = new SumUp({
      apiKey: options.apiKey,
      host: options.host,
      baseParams: options.baseParams,
    });
  }
  
  async createCheckout(data: SumUpCheckoutData) {
    const checkout = await this.client.checkouts.create(data);
    return this.mapCheckoutResponse(checkout);
  }
}
```

## New Features

### 1. Enhanced Type Safety

The SDK provides comprehensive TypeScript definitions for all API responses and requests.

### 2. Automatic Environment Detection

The SDK automatically detects whether to use sandbox or production environments based on your API key format.

### 3. Built-in Error Handling

```typescript
try {
  const checkout = await this.client.checkouts.create(data);
} catch (error) {
  if (error instanceof SumUp.APIError) {
    // Structured error handling with status codes and detailed messages
    console.error(`API Error ${error.status}:`, error.error);
  }
}
```

### 4. Customer Management

New customer-related methods are now available:

```typescript
// Create customer
await this.client.createCustomer({
  customer_id: "cust_123",
  personal_details: {
    email: "customer@example.com",
    first_name: "John",
    last_name: "Doe"
  }
});

// List payment instruments
const instruments = await this.client.listCustomerPaymentInstruments("cust_123");
```

### 5. Additional Configuration Options

```typescript
// New provider options
{
  apiKey: "sup_sk_...",
  host: "https://api.sumup.com", // Optional custom host
  baseParams: {}, // Optional additional fetch parameters
  // ... existing options
}
```

## Breaking Changes

### 1. Error Structure

**Before:**
```typescript
// axios errors
if (error.response?.status === 401) {
  // handle unauthorized
}
```

**After:**
```typescript
// SDK errors
if (error instanceof SumUp.APIError && error.status === 401) {
  // handle unauthorized
}
```

### 2. Response Format

Some API responses may have slightly different structures due to SDK normalization. All breaking changes have been handled internally in the client wrapper.

### 3. Missing SDK Methods

Some methods that were available via direct API calls may not yet be exposed in the SDK:

- **Refunds**: Currently shows an error message indicating SDK limitation
- **Transaction retrieval**: Pending SDK implementation

These will be updated as the SDK evolves.

## Configuration Changes

### Environment Variables

No changes to environment variables are required. The same configuration works with the new SDK.

### Provider Options

Two new optional configuration options are available:

```typescript
{
  // Existing options remain the same
  apiKey: process.env.SUMUP_API_KEY,
  redirectUrl: process.env.SUMUP_REDIRECT_URL,
  // ... other existing options
  
  // New optional options
  host: "https://api.sumup.com", // Custom API host
  baseParams: { // Additional fetch parameters
    timeout: 30000
  }
}
```

## Migration Steps

### For Existing Installations

1. **Update Dependencies:**
   ```bash
   npm install @sumup/sdk@^1.0.0
   npm uninstall axios
   ```

2. **Update Configuration (Optional):**
   Add new optional configuration options if needed:
   ```typescript
   // medusa-config.ts
   {
     resolve: "@sumup/sumup-payments-medusa/providers/sumup",
     options: {
       // ... existing configuration
       host: "https://custom-api.sumup.com", // if needed
       baseParams: { timeout: 30000 }, // if needed
     }
   }
   ```

3. **Test Integration:**
   - Test payment flows in your development environment
   - Verify webhook endpoints still work correctly
   - Check that error handling behaves as expected

### For New Installations

Simply follow the updated installation guide in the README. No special migration steps are needed.

## Benefits of the Migration

### 1. **Future-Proof**
- Official SDK receives updates and new features from SumUp
- Automatic compatibility with new API versions
- Better long-term support

### 2. **Improved Developer Experience**
- Better TypeScript support with comprehensive type definitions
- Consistent error handling across all API calls
- Built-in retry logic and connection management

### 3. **Reduced Maintenance**
- Less custom code to maintain
- Automatic handling of API changes by SDK
- Standardized patterns across SumUp integrations

### 4. **Enhanced Features**
- Customer management capabilities
- Payment tokenization support
- Better webhook event handling

## Troubleshooting

### Common Issues

1. **API Key Format:**
   Ensure your API key starts with `sup_sk_` for the SDK to work properly.

2. **Environment Detection:**
   The SDK automatically detects environments. Remove any manual environment switching code.

3. **TypeScript Errors:**
   Update your TypeScript definitions if you were using custom interfaces for SumUp types.

### Getting Help

- Check the [SumUp SDK documentation](https://github.com/sumup/sumup-ts)
- Review the [SumUp Developer Portal](https://developer.sumup.com)
- Open an issue in this repository for plugin-specific problems

## Future Enhancements

As the SumUp SDK continues to evolve, this plugin will be updated to include:

- Enhanced refund capabilities through the SDK
- Additional payment methods as they become available
- Improved analytics and reporting features
- Advanced customer management features

The SDK-based approach ensures that these updates can be implemented quickly and reliably.
