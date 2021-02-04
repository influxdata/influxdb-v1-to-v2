import {printCurrentOptions} from './env'
import logger from './util/logger'
import {pairToExistingBuckets} from './util/pairRetentionPolicy'
import {getRetentionPolicies} from './v1/v1api'
import {createBucket, createDBRP, getBuckets, getDBRPs} from './v2/v2api'

async function main(): Promise<void> {
  logger.info('--- Read v1 retention policies ---')
  const rps = await getRetentionPolicies()
  logger.info('--- Read v2 buckets ---')
  const buckets = await getBuckets()
  logger.info('--- Read v2 DBRP mappings ---')
  const dbrps = await getDBRPs()
  const rpsToBuckets = pairToExistingBuckets(rps, buckets, dbrps)
  logger.info('--- Create v2 buckets and mappings ---')
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

printCurrentOptions()
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
