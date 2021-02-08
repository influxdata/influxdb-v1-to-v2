import {writeFileSync} from 'fs'
import {
  printCurrentOptions,
  toolOptions,
  option,
  v1Options,
  v2Options,
  parseOptions,
  booleanOptionParser,
} from './env'
import logger from './util/logger'
import {
  createActualV1Authorization,
  pairGrantsToAuthorizations,
} from './util/pairGrantsToAuthorizations'
import {pairToExistingBuckets} from './util/pairRetentionPolicy'
import {getRetentionPolicies, getUsers} from './v1/v1-api'
import {
  createBucket,
  createDBRP,
  getBuckets,
  getDBRPs,
  getOrgID,
} from './v2/v2-api'
import {
  deleteV1Authorization,
  getV1Authorizations,
  postV1Authorization,
} from './v2/v2-authv1-api'

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
        logger.info(
          rpsToBucket.bucketName,
          'bucket ${rpsToBucket.bucket?.id} created'
        )
      } catch (e) {
        logger.error(
          'v2api',
          rpsToBucket.bucketName,
          'bucket cannot be created:',
          e
        )
      }
    } else {
      logger.info(
        rpsToBucket.bucketName,
        `bucket ${rpsToBucket.bucket?.id} already exists`
      )
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
  logger.info('--- Read v1 users ---')
  const users = await getUsers()
  logger.info('--- Read v2 authorizations for v1 users ---')
  const v1Authorizations = await getV1Authorizations()
  logger.info('--- Create v2 authorizations for v1 users ---')
  const grantsToAuthorizations = pairGrantsToAuthorizations(
    users,
    v1Authorizations
  )
  for (const pair of grantsToAuthorizations) {
    if (pair.user.isAdmin) {
      logger.info(
        pair.user.user,
        'user is ignored because it is an administrator'
      )
      continue
    }
    if (
      (!pair.user.readDBs || !pair.user.readDBs.length) &&
      (!pair.user.writeDBs || !pair.user.writeDBs.length)
    ) {
      logger.info(
        pair.user.user,
        'user is ignored because of no READ/WRITE to any database'
      )
      continue
    }
    const {
      v1Authorization,
      userReadBuckets,
      userWriteBuckets,
    } = createActualV1Authorization(pair, rpsToBuckets, await getOrgID())
    if (v1Authorization) {
      logger.info(pair.user.user, `user requires a new authorization in v2`)
      if (pair.v1Authorization?.id) {
        logger.info(` delete existing authorization ${pair.v1Authorization.id}`)
        await deleteV1Authorization(pair.v1Authorization.id)
      }
      pair.v1Authorization = await postV1Authorization(v1Authorization)
      logger.info(` authorization ${pair.v1Authorization?.id} created`)
    } else {
      logger.info(
        pair.user.user,
        `user has already a matching authorization ${pair?.v1Authorization?.id}`
      )
    }
    if (userReadBuckets && userReadBuckets.length) {
      logger.info(` read: ${userReadBuckets}`)
    }
    if (userWriteBuckets && userWriteBuckets.length) {
      logger.info(` write: ${userWriteBuckets}`)
    }
  }
  if (toolOptions.outMappingFile) {
    logger.info('--- Write mapping file ---')
    writeFileSync(
      toolOptions.outMappingFile,
      JSON.stringify(
        {
          rpsToBuckets,
          grantsToAuthorizations,
        },
        null,
        2
      )
    )
    logger.info(toolOptions.outMappingFile, 'written')
  }
  if (toolOptions.outUsersFile) {
    logger.info('--- Write users file ---')
    const toWrite = grantsToAuthorizations
      .filter(x => !x.user.isAdmin)
      .map(x => ({
        name: x.user.user,
        password: '',
        authorizationId: x.v1Authorization?.id || '',
      }))
    writeFileSync(toolOptions.outUsersFile, JSON.stringify(toWrite, null, 2))
    logger.info(toolOptions.outUsersFile, 'written')
  }
}

const options = {
  opts: [
    option('v1-url', v1Options, 'url', 'V1_INFLUX_URL', 'source base URL'),
    option('v1-user', v1Options, 'user', 'V1_INFLUX_USER', 'source user'),
    option(
      'v1-password',
      v1Options,
      'password',
      'V1_INFLUX_PASSWORD',
      'source password'
    ),
    option('v2-url', v2Options, 'url', 'INFLUX_URL', 'target base url'),
    option('v2-token', v2Options, 'token', 'INFLUX_TOKEN', 'target token'),
    option(
      'v2-org',
      v2Options,
      'org',
      'INFLUX_ORG',
      'target organization name'
    ),
    option(
      'trace',
      toolOptions,
      'trace',
      'TRACE',
      'turns on trace logging',
      booleanOptionParser
    ),
    option(
      'out-users',
      toolOptions,
      'outUsersFile',
      'OUT_USERS',
      'write v1 users to a file'
    ),
    option(
      'out-mapping',
      toolOptions,
      'outMappingFile',
      'OUT_MAPPING',
      'write result v1 to v2 mapping to a file'
    ),
  ],
}
parseOptions(options)
printCurrentOptions(options)
// continue unless environment printout is requested
if (String(process.argv.slice(2).shift()).indexOf('env') === -1) {
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
}
