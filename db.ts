
import { User, FinancialInstitution, Operation, UserRole, Module } from './types';

const KEYS = {
  USERS: 'finadvanced_users',
  INSTITUTIONS: 'finadvanced_institutions',
  OPERATIONS: 'finadvanced_operations'
};

const INITIAL_MASTER: User = {
  id: '1',
  name: 'Administrador Master',
  email: 'master@finadvanced.com',
  role: UserRole.MASTER,
  permissions: [Module.ADMIN, Module.FINANCE]
};

const INITIAL_INSTITUTIONS: FinancialInstitution[] = [
  {
    id: 'default-1',
    name: 'Banco Exemplo S.A.',
    monthlyRate: 2.5,
    adValorem: 0.5,
    tac: 50,
    iofDaily: 0.0041,
    iofFixed: 0.38,
    repurchaseRate: 3.0,
    repurchasePenalty: 2.0,
    repurchaseMora: 1.0,
    ticketFee: 5.0,
    transferFee: 10.0,
    serasaFee: 12.50,
    signatureFee: 3.50,
    minDays: 15,
    observations: 'Taxas padrão conforme contrato firmado em Janeiro/2024. Prazo de liquidação D+1.'
  }
];

export const db = {
  getUsers: (): User[] => {
    const data = localStorage.getItem(KEYS.USERS);
    return data ? JSON.parse(data) : [INITIAL_MASTER];
  },
  saveUsers: (users: User[]) => {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  },
  getInstitutions: (): FinancialInstitution[] => {
    const data = localStorage.getItem(KEYS.INSTITUTIONS);
    return data ? JSON.parse(data) : INITIAL_INSTITUTIONS;
  },
  saveInstitutions: (institutions: FinancialInstitution[]) => {
    localStorage.setItem(KEYS.INSTITUTIONS, JSON.stringify(institutions));
  },
  getOperations: (): Operation[] => {
    const data = localStorage.getItem(KEYS.OPERATIONS);
    return data ? JSON.parse(data) : [];
  },
  saveOperation: (op: Operation) => {
    const ops = db.getOperations();
    localStorage.setItem(KEYS.OPERATIONS, JSON.stringify([op, ...ops]));
  },
  deleteOperation: (id: string) => {
    const ops = db.getOperations();
    const filtered = ops.filter(op => op.id !== id);
    localStorage.setItem(KEYS.OPERATIONS, JSON.stringify(filtered));
  }
};
