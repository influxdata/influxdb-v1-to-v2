# influxdb-v1-to-v2

**WIP** migration of database metadata from InfluxDB v1 to InfluxDB v2.

## Usage

1. `yarn` to install dependencies
1. Create v2 buckets out of v1 databases, maps v1 users to v2 authorizations
   1. `yarn main --help` shows help with default options, run `yarn main` to specify all required parameters either via environment variables or using command-line options
   1. observe console to see that
      - buckets are created for each database/retention policy pair
      - DBRP mapping are created in v2 to map v1 db/rp pait to a v2 bucket, this mapping is required for influxql queries to work properly
      - v1-authorizations are created in v2 to map user grants (excluding admin users)
      - user password cannot be migrated, use `--out-users` option to create file that you can later use to setup user passwords