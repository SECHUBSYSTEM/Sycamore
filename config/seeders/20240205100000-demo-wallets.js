'use strict';

/** Demo wallets for Postman/local testing. Wallet 1: 100.00 USD, Wallet 2: 0 USD. */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert('Wallets', [
      { balance: 10000, currency: 'USD', createdAt: now, updatedAt: now },
      { balance: 0, currency: 'USD', createdAt: now, updatedAt: now },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Wallets', null, {});
  },
};
