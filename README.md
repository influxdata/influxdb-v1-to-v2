# influxdb-v1-to-v2

**WIP** migration of database metadata from InfluxDB v1 to InfluxDB v2.

## Usage

Run `yarn` in this directory to install the required dependencies, you can also use `npm install` to do the same. The tools are shown to run with `yarn`, you can use `npm run` in place of it. npm (unlike yarn) is installed together with node.js.

__Create v2 buckets out of v1 databases, maps v1 users to v2 authorizations__

1.  `yarn influxdb-v1-to-v2 --help` shows help with default and required options, run `yarn influxdb-v1-to-v2` with required parameters specified either in environment variables or in command-line options
1.  observe console to see that
    - buckets are created for each database/retention policy pair
    - DBRP mappings are created in v2 to map v1 db/rp pairs to v2 buckets; this mapping is required for v1 API queries/writes to work properly
    - v1 authorizations are created in v2 and maps v1 user grants (excluding admin users) to created v2 buckets
    - user password cannot be migrated, use `--out-users` option to create file that you can later use to setup user passwords with
      `set-passwords` utility

__Set passwords for migrated users__

1.  modify users file created in the previous step with `--out-users` options, specify password for each paricular user in the file, or rely upon default password later specified with the `--password` option
1.  `yarn set-password --help` shows help with default and required options
    - `--users-file` and InfluxDB v2 connection options are required
1.  run `yarn set-password` with required parameters specified either in environment variables or in command-line options
1.  observe console to see how/whether passwords are set
