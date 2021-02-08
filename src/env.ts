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
  trace: process.env['TRACE'],
  outUsersFile: process.env['OUT_USERS'],
  outMappingFile: process.env['OUT_MAPPING'],
}
export interface Option {
  option: string
  target: Record<string, unknown>
  key: string
  envKey: string
  help: string
}
export function option(
  option: string,
  target: Record<string, unknown>,
  key: string,
  envKey: string,
  help: string
): Option {
  return {option, target, key, envKey, help}
}
export interface CmdLine {
  opts: Option[]
}

export function help(cmdLine: CmdLine): void {
  logger.info('Available arguments:')
  for (const opt of cmdLine.opts) {
    logger.info(
      ` --${opt.option}`.padEnd(15),
      `${opt.help} (${opt.envKey}=${opt.target[opt.key] || ''})`
    )
  }
}
export function printCurrentOptions(cmdLine: CmdLine): void {
  for (const opt of cmdLine.opts) {
    logger.info(`${opt.envKey}=${opt.target[opt.key] || ''}`)
  }
}

export function parseOptions(
  cmdLine: CmdLine,
  parseOptions: {allowExtraArgs?: boolean} = {}
): string[] {
  const argv = minimist(process.argv.slice(2))
  if (!parseOptions.allowExtraArgs && argv._ && argv._.length) {
    logger.error('Unrecognized arguments:', argv._)
    help(cmdLine)
    process.exit(1)
  }
  const optionMap = cmdLine.opts.reduce((acc, val) => {
    acc[val.option] = val
    return acc
  }, {} as Record<string, Option>)
  for (const key of Object.keys(argv)) {
    if (key === '_' || key === '--') {
      continue // ignore minimist builtins
    }
    const option = optionMap[key]
    if (!option) {
      logger.error('Unrecognized option:', key)
      help(cmdLine)
      process.exit(1)
    }
    const val = argv[key]
    if (val) {
      option.target[option.key] = val
    }
  }
  return argv._
}
