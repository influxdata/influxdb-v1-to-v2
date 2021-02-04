import fetch from 'node-fetch'
import {v1Options} from '../env'
import {URLSearchParams} from 'url'
import {RetentionPolicy, V1Response, V1Result} from '../types'
import parseRetentionPolicies from './parseRetentionPolicies'
import parseShowDatabases from './parseShowDatabases'
import logger from '../util/logger'

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
  const databases = parseShowDatabases(await v1Query('SHOW DATABASES'))
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
