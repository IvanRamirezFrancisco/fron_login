export interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    enabled: boolean;
    emailVerified?: boolean;
    twoFactorEnabled: boolean;
    roles: string[];
    createdAt: string;
    updatedAt: string;
    googleAuthEnabled?: boolean;
    smsEnabled?: boolean;
    emailEnabled?: boolean; // <-- Para Email 2FA
    backupCodesEnabled?: boolean; // <-- Para Backup Codes
  }
  
  export interface RegisterRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }
  
  export interface LoginRequest {
    email: string;
    password: string;
    twoFactorCode?: string;
  }
  
export interface AuthResponse {
  token?: string;
  accessToken?: string; // <-- debe estar aquí
  user?: User;
  twoFactorRequired?: boolean;
  pendingUser?: User;
  message?: string;
  data?: {
    accessToken?: string; // <-- también aquí
    user?: User;
    twoFactorRequired?: boolean;
    [key: string]: any;
  };
}