import {User, V1Result, V1ValueType} from '../types'

export default function parseShowGrants(user: User, results: V1Result[]): void {
  const result = results[0]
  if (result.error) {
    throw new Error(result.error)
  }

  if (!result.series?.[0]?.values) {
    return
  }
  const series = result.series[0]

  const columns = series.columns
  const databaseIndex = columns.indexOf('database')
  const privilegeIndex = columns.indexOf('privilege')
  const readDBs: string[] = []
  const writeDBs: string[] = []

  series.values.forEach((arr: V1ValueType[]) => {
    const db = arr[databaseIndex] as string
    const privilege = arr[privilegeIndex] as string
    if (privilege.startsWith('READ')) {
      readDBs.push(db)
    } else if (privilege.startsWith('WRITE')) {
      writeDBs.push(db)
    } else if (privilege.startsWith('ALL')) {
      readDBs.push(db)
      writeDBs.push(db)
    }
  })
  readDBs.sort()
  writeDBs.sort()
  user.readDBs = readDBs
  user.writeDBs = writeDBs
}
