import {Bucket, DBRP} from '@influxdata/influxdb-client-apis'

export interface V1Response {
  error?: string
  results: {}
}
export type V1ValueType = string | number | boolean | null
export interface V1Result {
  error?: string
  series?: Array<{
    columns: string[]
    values: V1ValueType[][]
  }>
}
export interface RetentionPolicy {
  db: string
  rp: string
  durationSeconds: number
  default: boolean
}

export interface User {
  user: string
  isAdmin: boolean
  hash?: string
  readDBs?: string[]
  writeDBs?: string[]
}

export interface V1MetaFile {
  dbrps?: RetentionPolicy[]
  users?: User[]
}
export interface RetentionPolicyToBucket {
  bucketName: string
  rp: RetentionPolicy
  bucket?: Bucket
  dbrp?: DBRP
}

export interface V1Authorization {
  id?: string
  token: string // user name
  description?: string
  orgID: string
  permissions: Permission[]
  status: string // "active"
}
export interface Permission {
  action: 'read' | 'write'
  resource: {
    type: string // "buckets"
    id: string
    orgID: string
  }
}

export interface UserToV1Authorization {
  user: User
  v1Authorization?: V1Authorization
}
