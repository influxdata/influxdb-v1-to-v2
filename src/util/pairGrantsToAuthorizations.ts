import {
  Permission,
  RetentionPolicyToBucket,
  User,
  UserToV1Authorization,
  V1Authorization,
} from '../types'

function arrayEquals(arr1: string[], arr2: string[]): boolean {
  return arr1.length === arr2.length && arr1.every((v, i) => v === arr2[i])
}

export function pairGrantsToAuthorizations(
  users: User[],
  v1Authorizations: V1Authorization[]
): UserToV1Authorization[] {
  const v1AuthMap: Record<string, V1Authorization> = v1Authorizations.reduce(
    (acc: Record<string, V1Authorization>, val: V1Authorization) => {
      acc[val.token] = val
      return acc
    },
    {}
  )
  return users.map((user: User) => {
    const v1Authorization = v1AuthMap[user.name]
    return {
      user,
      v1Authorization,
    }
  })
}

function getDBToBucketIDsMap(
  rpTobuckets: RetentionPolicyToBucket[]
): Record<string, string[]> {
  return rpTobuckets.reduce(
    (acc: Record<string, string[]>, val: RetentionPolicyToBucket) => {
      if (val.bucket?.id) {
        ;(acc[val.rp.db] || (acc[val.rp.db] = [])).push(val.bucket.id)
      }
      return acc
    },
    {} as Record<string, string[]>
  )
}
/**
 *
 * @param pair user to 1 authorization comparison
 * @returns 0 means equal, other value indicates different grants
 */
export function compareGrants(
  pair: UserToV1Authorization,
  dbToBucketIDs: Record<string, string[]>
): {ok: boolean; userReadBuckets: string[]; userWriteBuckets: string[]} {
  function toBucketIds(dbs: string[] = []): string[] {
    return dbs
      .reduce((acc, db) => {
        const buckets = dbToBucketIDs[db]
        if (buckets) {
          return acc.concat(buckets)
        }
        return acc
      }, [] as string[])
      .sort()
  }
  function getPermittedBuckets(
    action: string,
    v1Authorization?: V1Authorization
  ): string[] {
    return (v1Authorization?.permissions || []).reduce((acc, perm) => {
      if (perm.action === action && perm.resource.type === 'buckets') {
        acc.push(perm.resource.id)
      }
      return acc
    }, [] as string[])
  }
  const userReadBuckets = toBucketIds(pair.user.readDBs)
  const authReadBuckets = getPermittedBuckets('read', pair.v1Authorization)
  const userWriteBuckets = toBucketIds(pair.user.writeDBs)
  const authWriteBuckets = getPermittedBuckets('write', pair.v1Authorization)
  if (
    arrayEquals(userReadBuckets, authReadBuckets) &&
    arrayEquals(userWriteBuckets, authWriteBuckets)
  ) {
    return {ok: true, userReadBuckets, userWriteBuckets}
  }

  return {ok: false, userReadBuckets, userWriteBuckets}
}

/**
 * Creates actual V1 Authorization if the supplied pair does not contain a sufficient one
 */
export function createActualV1Authorization(
  pair: UserToV1Authorization,
  rpTobuckets: RetentionPolicyToBucket[],
  orgID: string
): {
  v1Authorization?: V1Authorization
  userReadBuckets?: string[]
  userWriteBuckets?: string[]
} {
  if (pair.user.isAdmin) {
    return {}
  }
  const dbToBucketIDs = getDBToBucketIDsMap(rpTobuckets)
  const {ok, userReadBuckets, userWriteBuckets} = compareGrants(
    pair,
    dbToBucketIDs
  )
  if (ok) {
    return {userReadBuckets, userWriteBuckets}
  }
  const permissions: Permission[] = []
  userReadBuckets.forEach(id =>
    permissions.push({action: 'read', resource: {type: 'buckets', orgID, id}})
  )
  userWriteBuckets.forEach(id =>
    permissions.push({action: 'write', resource: {type: 'buckets', orgID, id}})
  )
  return {
    v1Authorization: {
      orgID,
      status: 'active',
      token: pair.user.name,
      description: `migrated from v1 ${pair.user.name}`,
      permissions,
    },
    userReadBuckets,
    userWriteBuckets,
  }
}
