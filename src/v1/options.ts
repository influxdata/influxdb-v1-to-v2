import {option} from '../env'

/** InfluxDB v1 options */
export const v1Options = {
  url: 'http://localhost:8087',
  user: 'admin',
  password: 'changeit',
  metaDumpFile: '',
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
