// Enum types for better type safety

export enum TransactionType {
  BUY = 'buy',
  SELL = 'sell'
}

export enum CashTransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  DIVIDEND = 'dividend',
  FEE = 'fee'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  INCOMPLETE = 'incomplete',
  TRIALING = 'trialing'
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  BRL = 'BRL',
  JPY = 'JPY',
  CHF = 'CHF',
  CAD = 'CAD',
  AUD = 'AUD'
}

// Validation helpers
export const isValidTransactionType = (type: string): type is TransactionType => {
  return Object.values(TransactionType).includes(type as TransactionType);
};

export const isValidCashTransactionType = (type: string): type is CashTransactionType => {
  return Object.values(CashTransactionType).includes(type as CashTransactionType);
};

export const isValidSubscriptionStatus = (status: string): status is SubscriptionStatus => {
  return Object.values(SubscriptionStatus).includes(status as SubscriptionStatus);
};

export const isValidCurrency = (currency: string): currency is Currency => {
  return Object.values(Currency).includes(currency as Currency);
};