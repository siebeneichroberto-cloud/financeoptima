
export enum UserRole {
  MASTER = 'MASTER',
  USER = 'USER'
}

export enum Module {
  FINANCE = 'FINANCE',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: Module[];
}

export interface FinancialInstitution {
  id: string;
  name: string;
  monthlyRate: number;
  adValorem: number;
  tac: number;
  iofDaily: number;
  iofFixed: number;
  repurchaseRate: number;    // Juros Recompra Mensal (% a.m.)
  repurchasePenalty: number; // Multa Recompra (%)
  repurchaseMora: number;    // Mora Recompra Mensal (% a.m.)
  ticketFee: number;         // Valor emissão boleto (R$)
  transferFee: number;       // Valor transferência (R$)
  minDays: number;           // Prazo Mínimo de Antecipação (Dias)
}

export interface Title {
  id: string;
  payer: string; 
  invoiceNumber: string;
  value: number;
  dueDate: string;
}

export interface Operation {
  id: string;
  date: string;
  institutionName: string;
  grossTotal: number;
  netTotal: number;
  discountTotal: number;
  titlesCount: number;
}

export interface CalculationResult {
  titleId: string;
  payer: string;
  invoiceNumber: string;
  dueDate: string;
  grossValue: number;
  netValue: number;
  discountValue: number;
  adValoremValue: number;
  iofValue: number;
  days: number;           // Dias reais
  calculationDays: number; // Dias utilizados para o cálculo (respeitando o mínimo)
}
