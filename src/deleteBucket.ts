// a simple utility that is used during developement to drop a bucket
import {getBuckets, deleteBucket} from './v2/v2api'
import logger from './util/logger'

async function main(): Promise<void> {
  const toDelete = process.argv.slice(2)
  if (!toDelete.length) {
    logger.error('No buckets to delete specified as arguments!')
    return
  }
  logger.info('Trying to delete buckets: ', toDelete)
  const buckets = await getBuckets()
  const deleted: Record<string, boolean> = {}

  for (const bucket of buckets) {
    if (toDelete.indexOf(bucket.name) >= 0) {
      deleted[bucket.name] = true
      try {
        await deleteBucket(bucket.id as string)
        logger.info(bucket.name, 'bucket deleted')
      } catch (e) {
        logger.error('v2api', bucket.name, 'bucket cannot be deleted:', e)
      }
    }
  }
  toDelete.forEach(x => {
    if (!deleted[x]) {
      logger.warn(`${x} bucket skipped, not found`)
    }
  })
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
