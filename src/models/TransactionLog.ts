import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  DataTypes,
  NonAttribute,
} from "sequelize";
import { sequelize } from "../config/database";
import type { TransactionLogStatusType } from "../types";
import type { Wallet } from "./Wallet";
import type { Ledger } from "./Ledger";

export class TransactionLog extends Model<
  InferAttributes<TransactionLog>,
  InferCreationAttributes<TransactionLog>
> {
  declare id: CreationOptional<number>;
  declare idempotencyKey: string;
  declare status: TransactionLogStatusType;
  declare fromWalletId: number;
  declare toWalletId: number;
  declare amount: string | number;
  declare currency: string;
  declare reference: CreationOptional<string | null>;
  declare description: CreationOptional<string | null>;
  declare responsePayload: CreationOptional<Record<string, unknown> | null>;
  declare errorMessage: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare fromWallet?: NonAttribute<Wallet>;
  declare toWallet?: NonAttribute<Wallet>;
  declare ledgers?: NonAttribute<Ledger[]>;

  getAmountBigInt(): bigint {
    return BigInt(this.amount);
  }
}

TransactionLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    idempotencyKey: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "SUCCESS", "FAILED"),
      allowNull: false,
    },
    fromWalletId: { type: DataTypes.INTEGER, allowNull: false },
    toWalletId: { type: DataTypes.INTEGER, allowNull: false },
    amount: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    currency: { type: DataTypes.STRING(3), allowNull: false },
    reference: { type: DataTypes.STRING(255), allowNull: true },
    description: { type: DataTypes.STRING(255), allowNull: true },
    responsePayload: { type: DataTypes.JSONB, allowNull: true },
    errorMessage: { type: DataTypes.STRING(500), allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, modelName: "TransactionLog", tableName: "TransactionLogs" }
);
