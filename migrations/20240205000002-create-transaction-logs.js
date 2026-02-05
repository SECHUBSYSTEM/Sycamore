'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TransactionLogs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      idempotencyKey: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'SUCCESS', 'FAILED'),
        allowNull: false,
      },
      fromWalletId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Wallets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      toWalletId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Wallets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      amount: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
      },
      reference: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      responsePayload: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      errorMessage: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex('TransactionLogs', ['status']);
    await queryInterface.addIndex('TransactionLogs', ['createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('TransactionLogs');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_TransactionLogs_status";');
  },
};
