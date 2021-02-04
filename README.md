# influxdb-v1-to-v2

**WIP** migration of database metadata from InfluxDB v1 to InfluxDB v2.

## Usage

1. `yarn` to install dependencies
2. specify the following environment variables
   - InfluxDB v2 connection variables
      - `INFLUX_URL=http://localhost:9999`
      - `INFLUX_TOKEN=my-token`
      - `INFLUX_ORG=my-org`
   - InfluxDB v1 connection variables
      - `V1_INFLUX_URL=http://localhost:8087`
      - `V1_INFLUX_USER=my-user`
      - `V1_INFLUX_PASSWORD=my-password`
3. `yarn main` runs the tool
4. observe console to see that
   - buckets are created for each database/retention policy pair
   - DBRP mapping are created in v2 to map v1 db/rp pait to a v2 bucket, this mapping is required for influxql queries to work properly
