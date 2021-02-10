import logger from './util/logger'
import minimist from 'minimist'

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
  description: string
  usage: string
  opts: Option[]
}

export function help(cmdLine: CmdLine): void {
  logger.info(cmdLine.description)
  logger.info('Usage:')
  logger.info(` ${cmdLine.usage}`)
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
  let invalid = false
  for (const option of cmdLine.opts) {
    if (option.validator && !option.validator(option, argv)) {
      invalid = true
    }
  }
  if (invalid) {
    help(cmdLine)
    process.exit(1)
  }
}
