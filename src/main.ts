import {writeFileSync} from 'fs'
import {
  printCurrentOptions,
  option,
  parseOptions,
  v1OptionDefinitions,
  v2OptionDefinitions,
  toolOptionDefinitions,
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

const localOptions = {
  outUsersFile: '',
  outMappingFile: '',
  outV1DumpMeta: '',
}

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
          `bucket ${rpsToBucket.bucket?.id} created`
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
  if (localOptions.outMappingFile) {
    logger.info('--- Write mapping file ---')
    writeFileSync(
      localOptions.outMappingFile,
      JSON.stringify(
        {
          rpsToBuckets,
          grantsToAuthorizations,
        },
        null,
        2
      ),
      {encoding: 'utf-8'}
    )
    logger.info(localOptions.outMappingFile, 'written')
  }
  if (localOptions.outUsersFile) {
    logger.info('--- Write users file ---')
    const toWrite = grantsToAuthorizations
      .filter(x => !x.user.isAdmin)
      .map(x => ({
        name: x.user.user,
        password: '',
        authorizationId: x.v1Authorization?.id || '',
      }))
    writeFileSync(localOptions.outUsersFile, JSON.stringify(toWrite, null, 2), {
      encoding: 'utf-8',
    })
    logger.info(localOptions.outUsersFile, 'written')
  }
  if (localOptions.outV1DumpMeta) {
    logger.info('--- Write dump of v1 inputs ---')
    writeFileSync(
      localOptions.outV1DumpMeta,
      JSON.stringify(
        {
          users: grantsToAuthorizations
            .filter(x => !x.user.isAdmin)
            .map(x => x.user),
          dbrps: rps,
        },
        null,
        2
      ),
      {
        encoding: 'utf-8',
      }
    )
    logger.info(localOptions.outV1DumpMeta, 'written')
  }
}

const options = {
  opts: [
    ...v1OptionDefinitions,
    ...v2OptionDefinitions,
    ...toolOptionDefinitions,
    option(
      'out-users',
      localOptions,
      'outUsersFile',
      'USERS_FILE',
      'write v1 users to a file'
    ),
    option(
      'out-mapping',
      localOptions,
      'outMappingFile',
      'OUT_MAPPING',
      'write result v1 to v2 mapping to a file'
    ),
    option(
      'out-v1-dump-meta',
      localOptions,
      'outV1DumpMeta',
      'OUT_V1_DUMP_META',
      'write v1 inputs to a file'
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
