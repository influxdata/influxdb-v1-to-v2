import {V1Result, V1ValueType} from '../types'

export default function parseShowDatabases(results: V1Result[]): string[] {
  const result = results[0]
  if (result.error) {
    throw new Error(result.error)
  }
  if (!result.series?.[0]?.values) {
    return []
  }

  // return values, but ignore internal database
  return (result.series[0].values || [])
    .map((s: V1ValueType[]) => {
      return s[0] as string
    })
    .sort()
}
