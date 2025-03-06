import {
  Logger,
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/framework/types";
import {
  AbstractPaymentProvider,
  BigNumber,
  MedusaError,
  PaymentSessionStatus,
} from "@medusajs/framework/utils";
import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  BigNumberRawValue,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
} from "@medusajs/types";
import createMollieClient, {
  CaptureMethod,
  Payment,
  PaymentCreateParams,
  PaymentStatus,
} from "@mollie/api-client";

/**
 * Configuration options for the Mollie payment provider
 * @property apiKey - The Mollie API key
 * @property redirectUrl - The URL to redirect to after payment
 * @property medusaUrl - The URL of the Medusa instance - defaults to http://localhost:9000
 * @property autoCapture - Whether to automatically capture payments - defaults to true
 * @property description - The description that appears on the payment
 * @property debug - Whether to enable debug mode
 */
type Options = {
  apiKey: string;
  redirectUrl: string;
  medusaUrl: string;
  autoCapture?: boolean;
  description?: string;
  debug?: boolean;
};

/**
 * Dependencies injected into the service
 */
type InjectedDependencies = {
  logger: Logger;
};

/**
 * Implementation of Mollie Payment Provider for Medusa
 */
class MolliePaymentProviderService extends AbstractPaymentProvider {
  static readonly identifier = "mollie";
  protected logger: Logger;
  protected options: Options;
  protected client: ReturnType<typeof createMollieClient>;
  protected medusaUrl: string;
  protected webhookUrl: string;

  protected debug: boolean;

  /**
   * Validates that the required options are provided
   * @param options - The options to validate
   * @throws {MedusaError} If API key is missing
   */
  static validateOptions(options: Record<string, unknown>): void {
    if (!options.apiKey || !options.redirectUrl || !options.medusaUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "API key, redirect URL, and Medusa URL are required in the provider's options."
      );
    }
  }

  /**
   * Creates a new instance of the Mollie payment provider
   * @param container - The dependency container
   * @param options - Configuration options
   */
  constructor(container: InjectedDependencies, options: Options) {
    super(container, options);

    this.logger = container.logger;
    this.options = options;
    this.medusaUrl = options.medusaUrl || "http://localhost:9000";
    this.debug =
      options.debug ||
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test" ||
      false;
    this.webhookUrl = `${
      options.medusaUrl.endsWith("/")
        ? options.medusaUrl.slice(0, -1)
        : options.medusaUrl
    }/hooks/payment/${MolliePaymentProviderService.identifier}_${
      MolliePaymentProviderService.identifier
    }`;

    this.client = createMollieClient({
      apiKey: options.apiKey,
    });
  }

  /**
   * Initiates a new payment with Mollie
   * @param input - The payment initiation input
   * @returns The initiated payment details
   */
  async initiatePayment({
    context,
    amount,
    currency_code,
  }: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    try {
      const createParams: PaymentCreateParams = {
        billingAddress: {
          streetAndNumber: context?.customer?.billing_address?.address_1 || "",
          postalCode: context?.customer?.billing_address?.postal_code || "",
          city: context?.customer?.billing_address?.city || "",
          country: context?.customer?.billing_address?.country_code || "",
        },
        billingEmail: context?.customer?.email || "",
        amount: {
          value: parseFloat(amount.toString()).toFixed(2),
          currency: currency_code.toUpperCase(),
        },
        description:
          this.options.description || "Mollie payment created by Medusa",
        captureMode: this.options.autoCapture
          ? CaptureMethod.automatic
          : CaptureMethod.manual,
        redirectUrl: this.options.redirectUrl,
        webhookUrl: this.webhookUrl,
        metadata: {
          idempotency_key: context?.idempotency_key,
        },
      };

      const data = await this.client.payments
        .create(createParams)
        .then((payment) => {
          return payment as Record<string, any>;
        })
        .catch((error) => {
          this.logger.error(`Mollie payment creation failed: ${error.message}`);
          throw new MedusaError(MedusaError.Types.INVALID_DATA, error.message);
        });

      this.debug &&
        this.logger.info(
          `Mollie payment ${data.id} successfully created with amount ${amount}`
        );

      return {
        id: data.id,
        data: data,
      };
    } catch (error) {
      this.logger.error(`Error initiating Mollie payment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Checks if a payment is authorized with Mollie
   * @param input - The payment authorization input
   * @returns The authorization result
   */
  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const externalId = input.data?.id;

    if (!externalId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Payment ID is required"
      );
    }

    try {
      const { status } = await this.getPaymentStatus({
        data: {
          id: externalId,
        },
      });

      if (!["captured", "authorized", "paid"].includes(status)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Payment is not authorized: current status is ${status}`
        );
      }

      this.debug &&
        this.logger.info(
          `Mollie payment ${externalId} successfully authorized with status ${status}`
        );

      return {
        data: input.data,
        status,
      };
    } catch (error) {
      this.logger.error(
        `Error authorizing payment ${externalId}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Captures an authorized payment if autoCapture is disabled
   * @param input - The payment capture input
   * @returns The capture result
   */
  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const externalId = input.data?.id as string;

    if (!externalId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Payment ID is required"
      );
    }

    try {
      let status = await this.getPaymentStatus({
        data: {
          id: externalId,
        },
      }).then((res) => res.status);

      if (status === "authorized" && !this.options.autoCapture) {
        await this.client.paymentCaptures.create({
          paymentId: externalId,
        });

        status = await this.getPaymentStatus({
          data: {
            id: externalId,
          },
        }).then((res) => res.status);
      }

      if (status !== "captured") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Payment is not captured: current status is ${status}`
        );
      }

      this.debug &&
        this.logger.info(
          `Mollie payment ${externalId} captured with amount ${
            (input.data?.amount as BigNumberRawValue).currency_code
          } ${(input.data?.amount as BigNumberRawValue).value}`
        );

      const payment = await this.retrievePayment({
        data: {
          id: externalId,
        },
      });

      return {
        data: payment.data,
      };
    } catch (error) {
      this.logger.error(
        `Error capturing payment ${externalId}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Refunds a payment
   * @param input - The payment refund input
   * @returns The refund result
   */
  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const externalId = input.data?.id as string;

    if (!externalId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Payment ID is required"
      );
    }

    try {
      const payment = await this.retrievePayment({
        data: {
          id: externalId,
        },
      });

      const value = (input.data?.amount as BigNumberRawValue).value;
      const currency: string = (payment.data as Record<string, any>)?.amount
        ?.currency as string;

      if (!currency) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Currency information is missing from payment data"
        );
      }

      const refund = await this.client.paymentRefunds.create({
        paymentId: externalId,
        amount: {
          value: parseFloat(value.toString()).toFixed(2),
          currency: currency.toUpperCase(),
        },
      });

      this.debug &&
        this.logger.info(
          `Refund for Mollie payment ${externalId} created with amount ${currency.toUpperCase()} ${parseFloat(
            value.toString()
          ).toFixed(2)}`
        );

      return {
        data: { ...refund },
      };
    } catch (error) {
      this.logger.error(
        `Error refunding payment ${externalId}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Cancels a payment
   * @param input - The payment cancellation input
   * @returns The cancellation result
   */
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const { id } = input.data as Record<string, any>;

    try {
      const payment = await this.client.payments.get(id);

      if (payment.status === PaymentStatus.expired) {
        this.debug &&
          this.logger.info(
            `Mollie payment ${id} is already expired, no need to cancel`
          );
        return {
          data: {
            id: input.data?.id,
          },
        };
      }

      const newPayment = await this.client.payments
        .cancel(id)
        .catch((error) => {
          this.logger.warn(
            `Could not cancel Mollie payment ${id}: ${error.message}`
          );
          return { data: payment as Record<string, any> };
        });

      this.debug &&
        this.logger.info(`Mollie payment ${id} cancelled successfully`);

      return {
        data: newPayment as Record<string, any>,
      };
    } catch (error) {
      this.logger.error(`Error cancelling payment ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deletes a payment (equivalent to cancellation as Mollie does not support deletion)
   * @param input - The payment deletion input
   * @returns The deletion result
   */
  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return this.cancelPayment(input);
  }

  /**
   * Gets the status of a payment by mapping Mollie statuses to Medusa statuses
   * @param input - The payment status input
   * @returns The payment status
   */
  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const paymentId = input.data?.id as string;

    try {
      const { status } = await this.client.payments.get(paymentId);

      const statusMap = {
        [PaymentStatus.open]: PaymentSessionStatus.REQUIRES_MORE,
        [PaymentStatus.canceled]: PaymentSessionStatus.CANCELED,
        [PaymentStatus.pending]: PaymentSessionStatus.PENDING,
        [PaymentStatus.authorized]: PaymentSessionStatus.AUTHORIZED,
        [PaymentStatus.expired]: PaymentSessionStatus.ERROR,
        [PaymentStatus.failed]: PaymentSessionStatus.ERROR,
        [PaymentStatus.paid]: PaymentSessionStatus.CAPTURED,
      };

      const mappedStatus = statusMap[status] as PaymentSessionStatus;

      this.debug &&
        this.logger.debug(
          `Mollie payment ${paymentId} status: ${status} (mapped to: ${mappedStatus})`
        );

      return {
        status: mappedStatus,
      };
    } catch (error) {
      this.logger.error(
        `Error retrieving payment status for ${paymentId}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Retrieves payment details
   * @param input - The payment retrieval input
   * @returns The payment details
   */
  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    const paymentId = input.data?.id as string;

    try {
      const data = await this.client.payments.get(paymentId);
      return {
        data: data as Record<string, any>,
      };
    } catch (error) {
      this.logger.error(
        `Error retrieving Mollie payment ${paymentId}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Updates a payment
   * @param input - The payment update input
   * @returns The updated payment details
   */
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const { id, ...rest } = input.data as Record<string, any>;

    try {
      const data = await this.client.payments.update(id, {
        ...rest,
      });

      this.debug &&
        this.logger.info(`Mollie payment ${id} successfully updated`);

      return {
        data: data as Record<string, any>,
      };
    } catch (error) {
      this.logger.error(
        `Error updating Mollie payment ${id}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Processes webhook data from Mollie
   * @param payload - The webhook payload
   * @returns The action and data to be processed
   */
  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const { data } = payload;

    try {
      const { data: payment } = await this.retrievePayment({
        data: {
          id: data.id,
        },
      }).catch((e) => {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, e.message);
      });

      if (!payment) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, "Payment not found");
      }

      const status = payment?.status;
      const session_id = (payment?.metadata as Record<string, any>)
        ?.idempotency_key;
      const amount = new BigNumber(payment?.amount as number);

      const baseData = {
        amount,
        session_id,
        ...payment,
      };

      switch (status) {
        case "authorized":
          return {
            action: "authorized",
            data: baseData,
          };
        case "paid":
          return {
            action: "captured",
            data: baseData,
          };
        case "expired":
        case "failed":
          return {
            action: "failed",
            data: baseData,
          };
        case "canceled":
          return {
            action: "canceled",
            data: baseData,
          };
        case "pending":
          return {
            action: "pending",
            data: baseData,
          };
        case "open":
          return {
            action: "requires_more",
            data: baseData,
          };
        default:
          return {
            action: "not_supported",
            data: baseData,
          };
      }
    } catch (error) {
      this.logger.error(
        `Error processing webhook for payment ${data.id}: ${error.message}`
      );

      // Even with errors, try to construct a valid response if we have the payment
      const { data: payment } = await this.retrievePayment({
        data: { id: data.id },
      }).catch(() => ({ data: null }));

      if (payment) {
        return {
          action: "failed",
          data: {
            session_id: (payment?.metadata as Record<string, any>)?.session_id,
            amount: new BigNumber(payment?.amount as number),
            ...payment,
          },
        };
      }

      throw error;
    }
  }
}

export default MolliePaymentProviderService;
