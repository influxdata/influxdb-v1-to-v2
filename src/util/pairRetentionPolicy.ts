import {Bucket, DBRP} from '@influxdata/influxdb-client-apis'
import {RetentionPolicy, RetentionPolicyToBucket} from '../types'

export function getBucketName(rp: RetentionPolicy): string {
  return `${rp.db}/${rp.rp}`
}

export function pairToExistingBuckets(
  rps: RetentionPolicy[],
  buckets: Bucket[],
  dbrps: DBRP[]
): RetentionPolicyToBucket[] {
  const bucketMap: Record<string, Bucket> = buckets.reduce(
    (acc: Record<string, Bucket>, val: Bucket) => {
      acc[val.name] = val
      return acc
    },
    {}
  )
  return rps.map(rp => {
    const bucketName = getBucketName(rp)
    const bucket = bucketMap[bucketName]
    const dbrp = dbrps.find((x: DBRP) => {
      if (!bucket) {
        return false
      }
      // if have mapping, return it
      if (
        x.bucketID === bucket.id &&
        x.database === rp.db &&
        x.retention_policy === rp.rp
      ) {
        return true
      }
      return false
    })
    return {
      bucketName,
      rp: rp,
      bucket,
      dbrp,
    } as RetentionPolicyToBucket
  })
}
