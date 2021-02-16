import fetch from 'node-fetch'
import {URLSearchParams} from 'url'
import {RetentionPolicy, User, V1MetaFile, V1Response, V1Result} from '../types'
import parseRetentionPolicies from './parseRetentionPolicies'
import parseShowDatabases from './parseShowDatabases'
import logger from '../util/logger'
import parseShowUsers from './parseShowUsers'
import parseShowGrants from './parseShowGrants'
import {v1Options} from './options'
import {readFileSync} from 'fs'

let cachedV1MetaFile: V1MetaFile | undefined = undefined
let cachedMetaDumpFile = ''
function v1MetaFile(): V1MetaFile | undefined {
  if (v1Options.metaDumpFile) {
    if (v1Options.metaDumpFile !== cachedMetaDumpFile) {
      cachedV1MetaFile = JSON.parse(
        readFileSync(v1Options.metaDumpFile, {encoding: 'utf8'})
      )
      cachedMetaDumpFile = v1Options.metaDumpFile
    }
    return cachedV1MetaFile
  }
}
async function v1Query(command: string): Promise<Array<V1Result>> {
  const headers =
    v1Options.user && v1Options.password
      ? {
          authorization: `Basic ${Buffer.from(
            v1Options.user + ':' + v1Options.password,
            'binary'
          ).toString('base64')}`,
        }
      : undefined
  const params = new URLSearchParams()
  params.append('q', command)
  const url = v1Options.url + '/query' + '?' + params
  const response = await fetch(url, {
    method: 'GET',
    headers,
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(
      `v1Query ${command} failed on ${response.statusText}: ${text}`
    )
  }
  const responseJson = (await response.json()) as V1Response
  if (responseJson.error) {
    throw new Error(
      `v1Query ${command} returns error ${response.statusText}: ${responseJson.error}`
    )
  }
  if (!Array.isArray(responseJson.results)) {
    throw new Error(
      `v1Query ${command} returns no results ${
        response.statusText
      }: ${JSON.stringify(responseJson)}`
    )
  }
  return responseJson.results
}

export async function getRetentionPolicies(): Promise<RetentionPolicy[]> {
  const v1File = v1MetaFile()
  if (v1File) {
    return (v1File.dbrps || []).filter(
      (x: RetentionPolicy) => x.db !== '_internal'
    )
  }
  const databases = parseShowDatabases(await v1Query('SHOW DATABASES')).filter(
    (s: string) => s != '_internal'
  )

  const rps: RetentionPolicy[] = []
  for (const db of databases) {
    try {
      const dbRps = parseRetentionPolicies(
        db,
        await v1Query(`SHOW RETENTION POLICIES ON "${db}"`)
      )
      logger.trace('v1api:getRetentionPolicies', JSON.stringify(dbRps, null, 2))
      dbRps.forEach(x => rps.push(x))
    } catch (e) {
      logger.warn(
        'v1api',
        `Ignoring ${db} since its retention policies cannot be retrieved!`,
        e
      )
    }
  }
  return rps
}
export async function getUsers(): Promise<User[]> {
  const v1File = v1MetaFile()
  if (v1File) {
    return v1File.users || []
  }
  const users = parseShowUsers(await v1Query('SHOW USERS'))
  for (const user of users) {
    try {
      parseShowGrants(user, await v1Query(`SHOW GRANTS FOR "${user.name}"`))
    } catch (e) {
      logger.warn(
        'v1api',
        `Ignoring grants for user ${user.name}, they cannot be retrieved!`,
        e
      )
    }
  }
  logger.trace('v1api:getUsers', JSON.stringify(users, null, 2))
  return users
}
