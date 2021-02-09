import {writeFileSync} from 'fs'
import {
  printCurrentOptions,
  option,
  parseOptions,
  toolOptionDefinitions,
} from './env'
import {V1MetaFile} from './types'
import logger from './util/logger'
import {
  createActualV1Authorization,
  pairGrantsToAuthorizations,
} from './util/pairGrantsToAuthorizations'
import {getBucketName, pairToExistingBuckets} from './util/pairRetentionPolicy'
import {v1OptionDefinitions} from './v1/options'
import {getRetentionPolicies, getUsers} from './v1/v1-api'
import {v2OptionDefinitions} from './v2/options'
import {
  createBucket,
  createDBRP,
  deleteBucket,
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
  outV1Meta: '',
  delete: false,
}

async function create(): Promise<void> {
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
  if (localOptions.outV1Meta) {
    logger.info('--- Write v1 inputs ---')
    writeFileSync(
      localOptions.outV1Meta,
      JSON.stringify(
        {
          users: grantsToAuthorizations
            .filter(x => !x.user.isAdmin)
            .map(x => x.user),
          dbrps: rps,
        } as V1MetaFile,
        null,
        2
      ),
      {
        encoding: 'utf-8',
      }
    )
    logger.info(localOptions.outV1Meta, 'written')
  }
}

async function remove(): Promise<void> {
  logger.info('--- Read v1 retention policies ---')
  const dbrps = await getRetentionPolicies()
  logger.info('--- Read v2 buckets ---')
  const buckets = await getBuckets()
  logger.info('--- Delete v2 buckets ---')
  const bucketNameToID = buckets.reduce((acc, val) => {
    acc[val.name] = val.id as string
    return acc
  }, {} as Record<string, string>)
  for (const dbrp of dbrps) {
    const bucketName = getBucketName(dbrp)
    const id = bucketNameToID[bucketName]
    if (!id) {
      logger.info(bucketName, `skipped, bucket does not exist`)
      continue
    }
    try {
      await deleteBucket(id)
      logger.info(bucketName, `bucket ${id} deleted`)
    } catch (e) {
      logger.error('v2api', bucketName, `bucket ${id} cannot be deleted:`, e)
    }
  }
  logger.info('--- Read v2 authorizations for v1 users ---')
  const v1Authorizations = await getV1Authorizations()
  logger.info('--- Read v1 users ---')
  const users = await getUsers()
  const userToAuthorizationID = v1Authorizations.reduce((acc, val) => {
    acc[val.token] = val.id as string
    return acc
  }, {} as Record<string, string>)
  logger.info('--- Delete v2 authorizations for v1 users ---')
  for (const user of users) {
    if (user.isAdmin) {
      logger.info(user.user, 'user is ignored because it is an administrator')
      continue
    }
    const name = user.user
    const id = userToAuthorizationID[name]
    if (!id) {
      logger.info(name, `skipped, authorization does not exist`)
      continue
    }
    try {
      await deleteV1Authorization(id)
      logger.info(name, `authorization ${id} deleted`)
    } catch (e) {
      logger.error('v2api', name, `authorization ${id} cannot be deleted:`, e)
    }
  }
}

const options = {
  opts: [
    ...v1OptionDefinitions,
    ...v2OptionDefinitions,
    ...toolOptionDefinitions,
    option(
      'delete',
      localOptions,
      'delete',
      'DO_DELETE',
      `don't create but delete matching v2 buckets and authorizations`
    ),
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
      'out-v1-meta',
      localOptions,
      'outV1Meta',
      'OUT_V1_META',
      'write v1 inputs to a file'
    ),
  ],
}
parseOptions(options)
printCurrentOptions(options)
// continue unless environment printout is requested
if (String(process.argv.slice(2).shift()).indexOf('env') === -1) {
  ;(localOptions.delete ? remove() : create())
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
