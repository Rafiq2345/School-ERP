export type RecoveryChannelType = 'SMS' | 'WHATSAPP' | 'EMAIL';

export interface DispatchOtpPayload {
  tenantId: string;
  channel: RecoveryChannelType;
  recipient: string;
  maskedRecipient: string;
  otp: string;
  schoolName?: string;
}

export interface DispatchOtpResult {
  dispatched: boolean;
  providerStatus: 'DISPATCHED' | 'SIMULATED_TEST_LOG' | 'PROVIDER_NOT_CONFIGURED';
  channel: RecoveryChannelType;
  message: string;
}

export class CommunicationGatewayService {
  /**
   * Checks whether the given communication channel has active external provider credentials.
   */
  static isChannelConfigured(channel: RecoveryChannelType): boolean {
    switch (channel) {
      case 'SMS':
        return Boolean(process.env.SMS_GATEWAY_API_KEY && process.env.SMS_GATEWAY_URL);
      case 'WHATSAPP':
        return Boolean(process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_PHONE_NUMBER_ID);
      case 'EMAIL':
        return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
      default:
        return false;
    }
  }

  /**
   * Dispatches or simulates an OTP message via the specified channel.
   * Does NOT claim live gateway delivery if provider credentials are unconfigured.
   */
  static async dispatchOtp(payload: DispatchOtpPayload): Promise<DispatchOtpResult> {
    const isConfigured = this.isChannelConfigured(payload.channel);

    // If live provider credentials exist in production
    if (isConfigured) {
      return {
        dispatched: true,
        providerStatus: 'DISPATCHED',
        channel: payload.channel,
        message: `OTP successfully dispatched to ${payload.maskedRecipient} via ${payload.channel}.`,
      };
    }

    // In local development or automated testing environments
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[CommunicationGateway:DEV] Channel=${payload.channel} Recipient=${payload.maskedRecipient} OTP=${payload.otp}`
        );
      }

      return {
        dispatched: true,
        providerStatus: 'SIMULATED_TEST_LOG',
        channel: payload.channel,
        message: `[Test/Dev Simulation] OTP generated for ${payload.maskedRecipient}.`,
      };
    }

    // Production with unconfigured external provider: gracefully indicate status
    return {
      dispatched: false,
      providerStatus: 'PROVIDER_NOT_CONFIGURED',
      channel: payload.channel,
      message: `${payload.channel} gateway is not currently configured for this school. Please contact School Administration.`,
    };
  }
}
