import {RetentionPolicy, V1Result, V1ValueType} from '../types'
import {parseV1Duration} from '../util/parseV1Duration'

export default function parseShowRetentionPolicies(
  db: string,
  results: V1Result[]
): RetentionPolicy[] {
  const result = results[0]
  if (result.error) {
    throw new Error(result.error)
  }

  if (!result.series?.[0]?.values) {
    return []
  }
  const series = result.series[0]

  const columns = series.columns
  const nameIndex = columns.indexOf('name')
  const durationIndex = columns.indexOf('duration')
  const defaultIndex = columns.indexOf('default')

  const rps: RetentionPolicy[] = []
  series.values.forEach((arr: V1ValueType[]) => {
    rps.push({
      db,
      rp: arr[nameIndex] as string,
      durationSeconds: parseV1Duration(arr[durationIndex] as string),
      isDefault: arr[defaultIndex] === true,
    })
  })
  rps.sort((a, b) => a.rp.localeCompare(b.rp))
  return rps
}
