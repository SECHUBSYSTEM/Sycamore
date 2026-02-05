'use strict';

require('dotenv').config();

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL must be set (e.g. copy .env.example to .env)');
}

/** @type {import('sequelize').Options} */
const base = {
  url,
  dialect: 'postgres',
  logging: false,
};

module.exports = {
  development: base,
  test: base,
  production: base,
};
