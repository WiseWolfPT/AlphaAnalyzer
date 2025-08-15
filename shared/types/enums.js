// Enum types for better type safety
export var TransactionType;
(function (TransactionType) {
    TransactionType["BUY"] = "buy";
    TransactionType["SELL"] = "sell";
})(TransactionType || (TransactionType = {}));
export var CashTransactionType;
(function (CashTransactionType) {
    CashTransactionType["DEPOSIT"] = "deposit";
    CashTransactionType["WITHDRAWAL"] = "withdrawal";
    CashTransactionType["DIVIDEND"] = "dividend";
    CashTransactionType["FEE"] = "fee";
})(CashTransactionType || (CashTransactionType = {}));
export var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["PAST_DUE"] = "past_due";
    SubscriptionStatus["CANCELED"] = "canceled";
    SubscriptionStatus["INCOMPLETE"] = "incomplete";
    SubscriptionStatus["TRIALING"] = "trialing";
})(SubscriptionStatus || (SubscriptionStatus = {}));
export var Currency;
(function (Currency) {
    Currency["USD"] = "USD";
    Currency["EUR"] = "EUR";
    Currency["GBP"] = "GBP";
    Currency["BRL"] = "BRL";
    Currency["JPY"] = "JPY";
    Currency["CHF"] = "CHF";
    Currency["CAD"] = "CAD";
    Currency["AUD"] = "AUD";
})(Currency || (Currency = {}));
// Validation helpers
export const isValidTransactionType = (type) => {
    return Object.values(TransactionType).includes(type);
};
export const isValidCashTransactionType = (type) => {
    return Object.values(CashTransactionType).includes(type);
};
export const isValidSubscriptionStatus = (status) => {
    return Object.values(SubscriptionStatus).includes(status);
};
export const isValidCurrency = (currency) => {
    return Object.values(Currency).includes(currency);
};
