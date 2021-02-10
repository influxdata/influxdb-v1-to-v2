import {option} from '../env'
import logger from '../util/logger'

/** InfluxDB v1 options */
export const v1Options = {
  url: '',
  user: '',
  password: '',
  metaDumpFile: '',
}

function v1OptionsValidator(): boolean {
  if (v1Options.metaDumpFile) {
    logger.info(`Using ${v1Options.metaDumpFile} to provide v1 inputs`)
    return true
  }
  for (const option of ['url', 'user', 'password']) {
    if (!(v1Options as Record<string, unknown>)[option]) {
      logger.error(`Missing required option --v1-${option}`)
      return false
    }
  }
  return true
}

export const v1OptionDefinitions = [
  option(
    'v1-url',
    v1Options,
    'url',
    'V1_INFLUX_URL',
    'source base URL',
    v1OptionsValidator
  ),
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
