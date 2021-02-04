const UNITS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 24 * 3600,
  w: 7 * 24 * 3600,
}

/**
 * Parses duration literal as specified in
 * https://docs.influxdata.com/influxdb/v1.8/query_language/spec/#durations
 * @return number of seconds
 */
export function parseV1Duration(s: string): number {
  const regexp = /(-?[0-9]+)([^-0-9])+/g
  let retVal = 0
  for (;;) {
    const match = regexp.exec(s)
    if (!match) break
    const unit = UNITS[match[2]]
    if (unit) {
      retVal += parseInt(match[1]) * unit
    }
  }
  return retVal
}
