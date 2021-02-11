import {User, V1Result, V1ValueType} from '../types'

export default function parseShowUsers(results: V1Result[]): User[] {
  const result = results[0]
  if (result.error) {
    throw new Error(result.error)
  }

  if (!result.series?.[0]?.values) {
    return []
  }
  const series = result.series[0]

  const columns = series.columns
  const userIndex = columns.indexOf('user')
  const adminIndex = columns.indexOf('admin')

  const retVal: User[] = []
  series.values.forEach((arr: V1ValueType[]) => {
    retVal.push({
      name: arr[userIndex] as string,
      isAdmin: arr[adminIndex] === true,
    })
  })
  retVal.sort((a, b) => a.name.localeCompare(b.name))
  return retVal
}
