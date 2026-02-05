import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  DataTypes,
  NonAttribute,
} from "sequelize";
import { sequelize } from "../config/database";
import type { Ledger } from "./Ledger";
import type { TransactionLog } from "./TransactionLog";

export class Wallet extends Model<
  InferAttributes<Wallet>,
  InferCreationAttributes<Wallet>
> {
  declare id: CreationOptional<number>;
  declare balance: string | number;
  declare currency: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare ledgers?: NonAttribute<Ledger[]>;
  declare fromTransfers?: NonAttribute<TransactionLog[]>;
  declare toTransfers?: NonAttribute<TransactionLog[]>;

  getBalanceBigInt(): bigint {
    const v = this.getDataValue("balance");
    return BigInt(v == null ? 0 : v);
  }
}

Wallet.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    balance: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "USD",
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, modelName: "Wallet", tableName: "Wallets" }
);
