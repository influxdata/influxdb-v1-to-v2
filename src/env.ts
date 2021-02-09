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
  metaDumpFile: '',
}

/** Tool options */
export const toolOptions = {
  trace: false,
}
export interface Option {
  option: string
  target: Record<string, unknown>
  key: string
  envKey: string
  help: string
  convertValue?: (v: unknown) => unknown
  validator?: (option: Option, argv: Record<string, unknown>) => boolean
}
const identityFn = (v: unknown): unknown => v
export const booleanOptionParser = (v: unknown): unknown => !!v
export const listOptionParser = (v: unknown): unknown => {
  if (Array.isArray(v)) {
    return v
  }
  if (typeof v === 'string') {
    return v.split(',')
  }
  return []
}
export function option(
  option: string,
  target: Record<string, unknown>,
  key: string,
  envKey: string,
  help: string,
  validator?: (option: Option, argv: Record<string, unknown>) => boolean,
  convertValue: (v: unknown) => unknown = identityFn
): Option {
  return {option, target, key, envKey, help, convertValue, validator}
}

export function requiredValidator(option: Option): boolean {
  const val = option.target[option.key]
  if (
    val === null ||
    val === undefined ||
    ((typeof val === 'string' || Array.isArray(val)) && !val.length)
  ) {
    logger.error(
      `Missing required ${
        option.option === '_' ? 'arguments' : 'option --' + option.option
      }`
    )
    return false
  }
  return true
}

export const v1OptionDefinitions = [
  option('v1-url', v1Options, 'url', 'V1_INFLUX_URL', 'source base URL'),
  option('v1-user', v1Options, 'user', 'V1_INFLUX_USER', 'source user'),
  option(
    'v1-password',
    v1Options,
    'password',
    'V1_INFLUX_PASSWORD',
    'source password'
  ),
  option(
    'v1-meta',
    v1Options,
    'metaDumpFile',
    'V1_META_DUMP_FILE',
    'file with v1 inputs to retrieve from'
  ),
]
export const v2OptionDefinitions = [
  option(
    'v2-url',
    v2Options,
    'url',
    'INFLUX_URL',
    'target base url',
    requiredValidator
  ),
  option(
    'v2-token',
    v2Options,
    'token',
    'INFLUX_TOKEN',
    'target token',
    requiredValidator
  ),
  option(
    'v2-org',
    v2Options,
    'org',
    'INFLUX_ORG',
    'target organization name',
    requiredValidator
  ),
]
export const toolOptionDefinitions = [
  option(
    'trace',
    toolOptions,
    'trace',
    'TRACE',
    'turns on trace logging',
    undefined,
    booleanOptionParser
  ),
]

export interface CmdLine {
  opts: Option[]
}

export function help(cmdLine: CmdLine): void {
  logger.info('Options:')
  let args: Option | undefined = undefined
  for (const opt of cmdLine.opts) {
    const currentValue =
      (opt.key.endsWith('token') || opt.key.endsWith('password')) &&
      opt.target[opt.key]
        ? '***'
        : opt.target[opt.key]
    if (opt.option === '_') {
      args = opt
      continue
    }
    logger.info(
      ` --${opt.option}`.padEnd(15),
      `${opt.help} (${opt.validator === requiredValidator ? 'required, ' : ''}${
        opt.envKey
      }=${currentValue})`
    )
  }
  if (args) {
    logger.info('Arguments:')
    logger.info(
      ` ${args.help} (${
        args.validator === requiredValidator ? 'required, ' : ''
      }${args.envKey}=${args.target[args.key]})`
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

export function parseOptions(cmdLine: CmdLine): void {
  // create option map
  const optionMap = cmdLine.opts.reduce((acc, val) => {
    acc[val.option] = val
    return acc
  }, {} as Record<string, Option>)
  // parse arguments
  const argv = minimist(process.argv.slice(2))
  if (!optionMap['_'] && argv._ && argv._.length) {
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
  // copy arguments to targets
  for (const key of Object.keys(argv)) {
    const option = optionMap[key]
    if ((key === '_' || key === '--') && !option) {
      continue // ignore minimist builtins
    }
    if (!option) {
      logger.error('Unrecognized option:', key, argv[key])
      help(cmdLine)
      process.exit(1)
    }
    const val = argv[key]
    if (val) {
      option.target[option.key] = (option.convertValue || identityFn)(val)
    }
  }
  // run validators
  for (const option of cmdLine.opts) {
    if (option.validator && !option.validator(option, argv)) {
      help(cmdLine)
      process.exit(1)
    }
  }
}
