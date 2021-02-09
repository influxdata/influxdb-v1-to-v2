import {option, requiredValidator} from '../env'

/** InfluxDB v2 options */
export const v2Options = {
  url: 'http://localhost:9999',
  token: 'my-token',
  org: 'my-org',
}

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
