// a simple utility that is used during developement to drop a bucket
import logger from './util/logger'
import {
  option,
  parseOptions,
  printCurrentOptions,
  toolOptionDefinitions,
  v2OptionDefinitions,
} from './env'

const localOptions = {
  usersFile: '',
  defaultPassword: '',
}

async function main(): Promise<void> {
  // const {usersFile, defaultPassword} = localOptions
  // logger.info('Trying to delete buckets: ', bucketNames)
  // const buckets = await getBuckets()
  // const deleted: Record<string, boolean> = {}
  // for (const bucket of buckets) {
  //   if (bucketNames.indexOf(bucket.name) >= 0) {
  //     deleted[bucket.name] = true
  //     try {
  //       await deleteBucket(bucket.id as string)
  //       logger.info(bucket.name, 'bucket deleted')
  //     } catch (e) {
  //       logger.error('v2api', bucket.name, 'bucket cannot be deleted:', e)
  //     }
  //   }
  // }
  // bucketNames.forEach(x => {
  //   if (!deleted[x]) {
  //     logger.warn(`${x} bucket skipped, not found`)
  //   }
  // })
}

const options = {
  opts: [
    ...v2OptionDefinitions,
    ...toolOptionDefinitions,
    option(
      'users-file',
      localOptions,
      'usersFile',
      'USERS_FILE',
      'path to users file',
      true
    ),
    option(
      'password',
      localOptions,
      'defaultPassword',
      'DEFAULT_PASSWORD',
      'default password, when missing in users-file'
    ),
  ],
}
parseOptions(options)
printCurrentOptions(options)

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
