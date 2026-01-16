
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
  password?: string; // Campo opcional para manter compatibilidade
  role: UserRole;
  permissions: Module[];
}

export interface ExtraFee {
  id: string;
  description: string;
  value: number;
}

export interface FinancialInstitution {
  id: string;
  name: string;
  monthlyRate: number;
  adValorem: number;
  tac: number;
  iofDaily: number;
  iofFixed: number;
  repurchaseRate: number;    
  repurchasePenalty: number; 
  repurchaseMora: number;    
  ticketFee: number;         
  transferFee: number;       
  serasaFee: number;         
  signatureFee: number;      
  minDays: number;           
  workingDaysFloat: number;  
  observations: string;      
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
  referenceDate: string;
  institutionName: string;
  grossTotal: number;
  netTotal: number;
  discountTotal: number;
  titlesCount: number;
  attachment?: {
    name: string;
    data: string; // Base64
    type: string;
  };
  details?: {
    results: CalculationResult[];
    repurchaseItems: any[];
    repurchaseTotal: number;
    fixedFees: number;
    extraFees: ExtraFee[];
    extraFeesTotal: number;
    totals: any;
    workingDaysFloat: number;
  }
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
  ticketFeeValue: number;
  serasaFeeValue: number;
  signatureFeeValue: number;
  days: number;           
  calculationDays: number; 
}
