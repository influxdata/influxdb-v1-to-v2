import logger from './util/logger'
import {pairToExistingBuckets} from './util/pairRetentionPolicy'
import {getRetentionPolicies} from './v1/v1api'
import {createBucket, createDBRP, getBuckets, getDBRPs} from './v2/v2api'

async function main(): Promise<void> {
  const rps = await getRetentionPolicies()
  const buckets = await getBuckets()
  const dbrps = await getDBRPs()
  const rpsToBuckets = pairToExistingBuckets(rps, buckets, dbrps)
  for (const rpsToBucket of rpsToBuckets) {
    // create bucket if it does not exist
    const exists = !!rpsToBucket.bucket
    if (!exists) {
      try {
        rpsToBucket.bucket = await createBucket(
          rpsToBucket.bucketName,
          rpsToBucket.rp
        )
        logger.info(rpsToBucket.bucketName, 'bucket created')
      } catch (e) {
        logger.error(
          'v2api',
          rpsToBucket.bucketName,
          'bucket cannot be created:',
          e
        )
      }
    } else {
      logger.info(rpsToBucket.bucketName, 'bucket already exists')
    }
    // create mapping if it does not exit
    if (rpsToBucket.bucket) {
      if (rpsToBucket.dbrp) {
        logger.info(' DBRP mapping already exists')
      } else {
        // create DBRP mapping to bucket
        try {
          rpsToBucket.dbrp = await createDBRP(
            rpsToBucket.bucket.id as string,
            rpsToBucket.rp
          )
          logger.info(' DBRP mapping created')
        } catch (e) {
          logger.error(
            'v2api',
            rpsToBucket.bucketName,
            `DBRP maping to ${rpsToBucket.rp.db}/${rpsToBucket.rp.rp} cannot be created:`,
            e
          )
        }
      }
    }
  }
}

main()
  .then(() => {
    logger.info('')
    logger.info('Finished SUCCESS')
  })
  .catch(e => {
    logger.error(e)
    logger.error('')
    logger.error('Finished FAILED')
  })
