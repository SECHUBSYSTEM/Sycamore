'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Ledgers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      walletId: {
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
      type: {
        type: Sequelize.ENUM('TRANSFER', 'INTEREST', 'OTHER'),
        allowNull: false,
      },
      reference: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      transactionLogId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'TransactionLogs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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
    await queryInterface.addIndex('Ledgers', ['walletId']);
    await queryInterface.addIndex('Ledgers', ['transactionLogId']);
    await queryInterface.addIndex('Ledgers', ['createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Ledgers');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Ledgers_type";');
  },
};
