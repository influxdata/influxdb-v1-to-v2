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
  isDefault: boolean
}

export interface User {
  user: string
  isAdmin: boolean
  readDBs?: string[]
  writeDBs?: string[]
}

export interface RetentionPolicyToBucket {
  bucketName: string
  rp: RetentionPolicy
  bucket?: Bucket
  dbrp?: DBRP
}

export interface V1Authorization {
  token: string // user name
  description?: string
  orgID: string
  permissions: Permission[]
}
export interface Permission {
  action: 'read' | 'write'
  resource: {
    type: string // "buckets"
    id: string
    orgID: string
  }
}
