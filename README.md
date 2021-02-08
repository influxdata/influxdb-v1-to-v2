# influxdb-v1-to-v2

**WIP** migration of database metadata from InfluxDB v1 to InfluxDB v2.

## Usage

1. `yarn` to install dependencies
1. Create v2 buckets out of v1 databases, maps v1 users to v2 authorizations
   1. `yarn main --help` shows help with default and required options, run `yarn main` with required parameters specified either in environment variables or in command-line options
      - InfluxDB v1 and v2 connection options are required
   1. observe console to see that
      - buckets are created for each database/retention policy pair
      - DBRP mapping are created in v2 to map v1 db/rp pait to a v2 bucket, this mapping is required for influxql queries to work properly
      - v1-authorizations are created in v2 to map user grants (excluding admin users)
      - user password cannot be migrated, use `--out-users` option to create file that you can later use to setup user passwords
1. Set passwords for migrated users
   1. modify users file created in the previous step with `--out-users` options, specify password for each paricular user in the file, or rely 
      upon default password later specified with the `--password` option
   1. `yarn set-passwords --help` shows help with default and required options
      - `--users-file` and InfluxDB v2 connection options are required
   1. run `yarn set-password` with required parameters specified either in environment variables or in command-line options
   1. observer console to see how/whether  passwords are set

