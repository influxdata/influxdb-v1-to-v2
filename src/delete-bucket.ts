// a simple utility that is used during developement to drop a bucket
import {getBuckets, deleteBucket} from './v2/v2-api'
import logger from './util/logger'
import {
  listOptionParser,
  option,
  parseOptions,
  printCurrentOptions,
  toolOptionDefinitions,
  v2OptionDefinitions,
} from './env'

async function main(bucketNames: string[]): Promise<void> {
  if (!bucketNames.length) {
    logger.error('No buckets to delete specified as arguments!')
    return
  }
  logger.info('Trying to delete buckets: ', bucketNames)
  const buckets = await getBuckets()
  const deleted: Record<string, boolean> = {}

  for (const bucket of buckets) {
    if (bucketNames.indexOf(bucket.name) >= 0) {
      deleted[bucket.name] = true
      try {
        await deleteBucket(bucket.id as string)
        logger.info(bucket.name, 'bucket deleted')
      } catch (e) {
        logger.error('v2api', bucket.name, 'bucket cannot be deleted:', e)
      }
    }
  }
  bucketNames.forEach(x => {
    if (!deleted[x]) {
      logger.warn(`${x} bucket skipped, not found`)
    }
  })
}

const deleteOptions = {
  buckets: [],
}
const options = {
  opts: [
    ...v2OptionDefinitions,
    ...toolOptionDefinitions,
    option(
      '_',
      deleteOptions,
      'buckets',
      'INFLUX_BUCKETS',
      'bucket names',
      true,
      listOptionParser
    ),
  ],
}
parseOptions(options)
printCurrentOptions(options)

main(deleteOptions.buckets)
  .then(() => {
    logger.info('')
    logger.info('Finished SUCCESS')
  })
  .catch(e => {
    logger.error(e)
    logger.error('')
    logger.error('Finished FAILED')
  })
