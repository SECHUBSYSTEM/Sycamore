import { Wallet } from "./Wallet";
import { TransactionLog } from "./TransactionLog";
import { Ledger } from "./Ledger";

// Associations: Wallet <-> Ledger, Wallet <-> TransactionLog, Ledger <-> TransactionLog
Wallet.hasMany(Ledger, { foreignKey: "walletId" });
Ledger.belongsTo(Wallet, { foreignKey: "walletId" });

Wallet.hasMany(TransactionLog, { foreignKey: "fromWalletId" });
TransactionLog.belongsTo(Wallet, { foreignKey: "fromWalletId" });
Wallet.hasMany(TransactionLog, { foreignKey: "toWalletId" });
TransactionLog.belongsTo(Wallet, { foreignKey: "toWalletId" });

TransactionLog.hasMany(Ledger, { foreignKey: "transactionLogId" });
Ledger.belongsTo(TransactionLog, { foreignKey: "transactionLogId" });

export { sequelize } from "../config/database";
export { Wallet, TransactionLog, Ledger };
