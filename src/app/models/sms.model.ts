export interface SmsSetupRequest {
  phoneNumber: string;
}

export interface SmsVerificationRequest {
  code: string;
}

export interface SmsSetupResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface TwoFactorMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export interface SendCodeRequest {
  email: string;
  method: 'SMS' | 'EMAIL' | 'GOOGLE_AUTHENTICATOR';
}

export interface VerifyCodeRequest {
  email: string;
  code: string;
  method: 'SMS' | 'EMAIL' | 'GOOGLE_AUTHENTICATOR';
}