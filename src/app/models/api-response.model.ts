export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
  }
  
  export interface PasswordResetRequest {
    email: string;
  }
  
  export interface PasswordResetConfirm {
    token: string;
    newPassword: string;
    confirmPassword: string;
  }
  
  export interface ForgotPasswordRequest {
    email: string;
  }
  
  export interface ResetPasswordRequest {
    token: string;
    password: string;
    confirmPassword: string;
  }
  
  export interface VerifyEmailRequest {
    token: string;
  }
  
  export interface TwoFactorSetup {
    qrCodeUrl: string;
    secret: string;
    backupCodes: string[];
  }