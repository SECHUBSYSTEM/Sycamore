import { Sequelize } from "sequelize";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

/**
 * Single Sequelize instance for the app. Uses pg for PostgreSQL.
 * Migrations are run via Sequelize CLI (config in config/config.js).
 */
export const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: process.env.NODE_ENV === "test" ? false : console.log,
  define: {
    underscored: false,
    timestamps: true,
  },
});

export type SequelizeInstance = typeof sequelize;
