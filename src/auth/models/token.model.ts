export interface Token {
  role: string;
  sub: number;
  exp?: number;
  iat?: number;
}
