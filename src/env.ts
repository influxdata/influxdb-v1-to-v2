import logger from './util/logger'
import minimist from 'minimist'

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

/** Tool options */
export const toolOptions = {
  trace: !!(process.env['TRACE'] && process.env['TRACE'] !== 'off'),
  outUsersFile: process.env['OUT_USERS'],
  outMappingFile: process.env['OUT_MAPPING'],
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
  logger.info('--- Tool options ---')
  logger.info(`TRACE=${toolOptions.trace ? 'on' : 'off'}`)
  logger.info(`OUT_USERS=${toolOptions.outUsersFile || ''}`)
  logger.info(`OUT_MAPPING=${toolOptions.outMappingFile || ''}`)
}

export function loadOptions(): void {
  const argv = minimist(process.argv.slice(2))
  function setOpt(
    opt: string,
    target: Record<string, unknown>,
    targetKey: string
  ): void {
    const val = argv[opt]
    if (val) {
      target[targetKey] = val
    }
  }
  setOpt('v1-url', v1Options, 'url')
  setOpt('v1-user', v1Options, 'user')
  setOpt('v1-password', v1Options, 'password')
  setOpt('v2-url', v2Options, 'url')
  setOpt('v2-token', v2Options, 'token')
  setOpt('v2-org', v2Options, 'org')
  setOpt('trace', toolOptions, 'trace')
  setOpt('out-users', toolOptions, 'outUsersFile')
  setOpt('out-mapping', toolOptions, 'outMappingFile')
}
