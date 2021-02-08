import logger from './util/logger'
import minimist from 'minimist'

/** InfluxDB v2 options */
export const v2Options = {
  url: 'http://localhost:9999',
  token: 'my-token',
  org: 'my-org',
}

/** InfluxDB v1 options */
export const v1Options = {
  url: 'http://localhost:8087',
  user: 'admin',
  password: 'changeit',
}

/** Tool options */
export const toolOptions = {
  trace: false,
  outUsersFile: '',
  outMappingFile: '',
}
export interface Option {
  option: string
  target: Record<string, unknown>
  key: string
  envKey: string
  help: string
  convertValue?: (v: unknown) => unknown
}
const identityFn = (v: unknown): unknown => v
export const booleanOptionParser = (v: unknown): unknown => !!v
export function option(
  option: string,
  target: Record<string, unknown>,
  key: string,
  envKey: string,
  help: string,
  convertValue: (v: unknown) => unknown = identityFn
): Option {
  return {option, target, key, envKey, help, convertValue}
}
export interface CmdLine {
  opts: Option[]
}

export function help(cmdLine: CmdLine): void {
  logger.info('Available arguments:')
  for (const opt of cmdLine.opts) {
    const currentValue =
      opt.key.endsWith('token') || opt.key.endsWith('password')
        ? '***'
        : opt.target[opt.key]
    logger.info(
      ` --${opt.option}`.padEnd(15),
      `${opt.help} (${opt.envKey}=${currentValue})`
    )
  }
}
export function printCurrentOptions(cmdLine: CmdLine): void {
  for (const opt of cmdLine.opts) {
    const currentValue =
      opt.key.endsWith('token') || opt.key.endsWith('password')
        ? '***'
        : opt.target[opt.key]
    logger.info(`${opt.envKey}=${currentValue}`)
  }
}

export function parseOptions(
  cmdLine: CmdLine,
  parseOptions: {allowExtraArgs?: boolean} = {}
): string[] {
  // parse arguments
  const argv = minimist(process.argv.slice(2))
  if (!parseOptions.allowExtraArgs && argv._ && argv._.length) {
    logger.error('Unrecognized arguments:', argv._)
    help(cmdLine)
    process.exit(1)
  }
  // setup default from ENV
  cmdLine.opts.forEach(opt => {
    if (opt.envKey) {
      const val = process.env[opt.envKey]
      if (val) opt.target[opt.key] = val
    }
  })
  // setup arguments to targets
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
      option.target[option.key] = (option.convertValue || identityFn)(val)
    }
  }
  return argv._
}
