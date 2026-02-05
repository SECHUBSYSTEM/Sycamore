import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  DataTypes,
  NonAttribute,
} from "sequelize";
import { sequelize } from "../config/database";
import type { LedgerTypeValue } from "../types";
import type { TransactionLog } from "./TransactionLog";
import type { Wallet } from "./Wallet";

export class Ledger extends Model<
  InferAttributes<Ledger>,
  InferCreationAttributes<Ledger>
> {
  declare id: CreationOptional<number>;
  declare walletId: number;
  declare amount: string | number;
  declare type: LedgerTypeValue;
  declare reference: CreationOptional<string | null>;
  declare transactionLogId: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare wallet?: NonAttribute<Wallet>;
  declare transactionLog?: NonAttribute<TransactionLog | null>;

  getAmountBigInt(): bigint {
    return BigInt(this.amount);
  }
}

Ledger.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    walletId: { type: DataTypes.INTEGER, allowNull: false },
    amount: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("TRANSFER", "INTEREST", "OTHER"),
      allowNull: false,
    },
    reference: { type: DataTypes.STRING(255), allowNull: true },
    transactionLogId: { type: DataTypes.INTEGER, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, modelName: "Ledger", tableName: "Ledgers" }
);
