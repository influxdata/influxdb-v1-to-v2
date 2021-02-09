import {InfluxDB} from '@influxdata/influxdb-client'
import {
  Bucket,
  BucketsAPI,
  DBRP,
  DbrpsAPI,
  OrgsAPI,
  RetentionRules,
} from '@influxdata/influxdb-client-apis'
import {v2Options} from '../env'
import {RetentionPolicy} from '../types'
import logger from '../util/logger'

function getInfluxDB(): InfluxDB {
  return new InfluxDB({url: v2Options.url, token: v2Options.token})
}

let orgID: string | undefined
export async function getOrgID(): Promise<string> {
  if (!orgID) {
    const orgs = (
      await new OrgsAPI(getInfluxDB()).getOrgs({org: v2Options.org})
    )?.orgs
    if (!orgs || orgs.length === 0) {
      throw new Error(`No organization named ${v2Options.org} found!`)
    }
    logger.trace('v2api:getOrgID', JSON.stringify(orgs[0]))
    orgID = orgs[0].id
  }
  return orgID as string
}

export async function getBuckets(): Promise<Bucket[]> {
  const retVal =
    (await new BucketsAPI(getInfluxDB()).getBuckets())?.buckets || []
  logger.trace('v2api:getBuckets', JSON.stringify(retVal, null, 2))
  return retVal
}

export async function createBucket(
  name: string,
  rp: RetentionPolicy
): Promise<Bucket> {
  const bucketAPI = new BucketsAPI(getInfluxDB())
  const orgID = await getOrgID()
  const retentionRules: RetentionRules = rp.durationSeconds
    ? [
        {
          everySeconds: rp.durationSeconds,
          type: 'expire',
        },
      ]
    : []
  return bucketAPI.postBuckets({
    body: {
      name,
      orgID,
      description: `migrated from v1 ${rp.db}/${rp.rp}`,
      retentionRules,
    },
  })
}
export function deleteBucket(bucketID: string): Promise<void> {
  const bucketAPI = new BucketsAPI(getInfluxDB())
  return bucketAPI.deleteBucketsID({bucketID})
}

export async function getDBRPs(): Promise<DBRP[]> {
  const dbrpsAPI = new DbrpsAPI(getInfluxDB())
  const orgID = await getOrgID()
  const response = (await dbrpsAPI.getDBRPs({orgID})) as Record<string, DBRP[]>
  let retVal = response.notificationEndpoints
  if (!retVal) {
    // swagger generated API contains wrong property notificationEndpoints
    retVal = (response as Record<string, DBRP[]>).content
  }
  logger.trace('v2api:getDBRPs', JSON.stringify(retVal, null, 2))
  return retVal || []
}

export async function createDBRP(
  bucketID: string,
  rp: RetentionPolicy
): Promise<DBRP> {
  const dbrpsAPI = new DbrpsAPI(getInfluxDB())
  const orgID = await getOrgID()
  return dbrpsAPI.postDBRP({
    body: {
      bucketID,
      database: rp.db,
      // eslint-disable-next-line @typescript-eslint/camelcase
      retention_policy: rp.rp,
      default: rp.default,
      orgID: orgID,
    },
  })
}
