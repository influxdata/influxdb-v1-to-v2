import fetch from 'node-fetch'
import {v2Options} from '../env'
import {URLSearchParams} from 'url'
import {getOrgID} from './v2-api'
import {V1Authorization} from '../types'
import logger from '../util/logger'

const prefixAuthorization = '/private/legacy/authorizations'

async function v2Request(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  params?: Record<string, string>,
  body?: string
): Promise<unknown> {
  const headers = {
    authorization: `Token ${v2Options.token}`,
    accept: 'application/json',
  }
  let url = v2Options.url + path
  if (params) {
    const qp = new URLSearchParams()
    for (const k of Object.keys(params)) {
      qp.set(k, params[k])
    }
    url += '?' + qp.toString()
  }
  const response = await fetch(url, {
    method,
    headers,
    body,
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(
      `v2Request at ${path} failed on ${response.statusText}: ${text}`
    )
  }
  if (method === 'DELETE') {
    return response.text()
  }
  return await response.json()
}

export async function getV1Authorizations(): Promise<V1Authorization[]> {
  const orgID = await getOrgID()
  const response = (await v2Request('GET', prefixAuthorization, {orgID})) as {
    authorizations: V1Authorization[]
  }
  const retVal = response.authorizations || []
  logger.trace('v2api:getV1Authorizations', JSON.stringify(retVal, null, 2))
  return retVal
}

export async function deleteV1Authorization(id: string): Promise<void> {
  await v2Request('DELETE', [prefixAuthorization, id].join('/'))
}
export async function postV1Authorization(
  body: V1Authorization
): Promise<V1Authorization> {
  return v2Request(
    'POST',
    prefixAuthorization,
    undefined,
    JSON.stringify(body)
  ) as Promise<V1Authorization>
}