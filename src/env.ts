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
