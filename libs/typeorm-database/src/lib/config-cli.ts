import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'path';
import * as process from 'process';

const configPg: DataSourceOptions = {
  // type: process.env['DB_TYPE'] as 'mysql' | 'postgres',
  // host: process.env['DB_HOST'],
  // port: parseInt(`${process.env['DB_PORT']}`, 10),

  type: 'postgres', //process.env['DB_TYPE'] as 'postgres' | 'postgres',
  host: "localhost", // process.env['DB_HOST'],
  port: 5432, //parseInt(`${process.env['DB_PORT']}`, 5432),
  username: "postgres", //process.env['DB_USERNAME'],
  password: "new_password", //process.env['DB_PASSWORD'],
  database: "yasser", //process.env['DB_NAME'],
  // logging: 'all', //process.env['DB_LOGGING'] === '1',
  logging: ['query', 'error'],

  // username: process.env['DB_USERNAME'],
  // password: process.env['DB_PASSWORD'],
  // database: process.env['DB_NAME'],
  // logging: process.env['DB_LOGGING'] === '1',
  migrations: [join(__dirname, '/migrations/**/*{.ts,.js}')],
  entities: [join(__dirname, '/entities/**/*{.ts,.js}')],
  ...(process.env['DB_TYPE'] === 'mysql' ? { connectorPackage: 'mysql2' } : {}),
};

const configMysql: DataSourceOptions = {
  type: process.env['DB_TYPE'] as 'mysql' | 'postgres',
  host: process.env['DB_HOST'],
  port: parseInt(`${process.env['DB_PORT']}`, 10),
  username: process.env['DB_USERNAME'],
  password: process.env['DB_PASSWORD'],
  database: process.env['DB_NAME'],
  logging: process.env['DB_LOGGING'] === '1',
  migrations: [join(__dirname, '/migrations-mysql/**/*{.ts,.js}')],
  entities: [join(__dirname, '/entities-mysql/**/*{.ts,.js}')],
  connectorPackage: 'mysql2',
};

const configSeeder = {
  seeders: ['./libs/database/src/lib/seeders/*.ts'],
  defaultSeeder: 'RootSeeder',
};

const config = process.env['DB_TYPE'] === 'mysql' ? configMysql : configPg;
export { config, configSeeder };

export default new DataSource({ ...config, ...configSeeder });
