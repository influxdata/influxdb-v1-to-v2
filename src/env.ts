import logger from './util/logger'

/** InfluxDB v2 options */
export const v2Options = {
  url: process.env['INFLUX_URL'] || 'http://localhost:9999',
  token: process.env['INFLUX_TOKEN'] || 'my-token',
  org: process.env['INFLUX_ORG'] || 'my-org',
}

/** InfluxDB v1 options */
export const v1Options = {
  url: process.env['V1_INFLUX_URL'] || 'http://localhost:8087',
  user: process.env['V1_INFLUX_USER'] || 'admin',
  password: process.env['V1_INFLUX_PASSWORD'] || 'changeit',
}

export function printCurrentOptions(): void {
  logger.info('--- V1 environment options ---')
  logger.info(`V1_INFLUX_URL=${v1Options.url}`)
  logger.info(`V1_INFLUX_USER=${v1Options.user}`)
  logger.info(`V1_INFLUX_PASSWORD=${v1Options.password}`)
  logger.info('--- V2 environment options ---')
  logger.info(`INFLUX_URL=${v2Options.url}`)
  logger.info(`INFLUX_ORG=${v2Options.org}`)
  logger.info(`INFLUX_TOKEN=${v2Options.token}`)
}
