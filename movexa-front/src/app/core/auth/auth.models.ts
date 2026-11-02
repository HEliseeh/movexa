export interface LoginRequest {
    username: string;
    password: string;
    rememberMe: boolean;
  }
  
  export interface LoginResponse {
    id_token: string;
  }
  
  // Forme renvoyée par GET /api/account sur un gateway JHipster
  export interface User {
    login: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    authorities: string[];
  }