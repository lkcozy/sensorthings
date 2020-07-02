# SensorThings API

[![Coverage Status](https://coveralls.io/repos/github/mozilla-sensorweb/sensorthings/badge.svg)](https://coveralls.io/github/mozilla-sensorweb/sensorthings)

Node implementation of the OGC SensorThings API.

## Dependencies

- Nodejs >10
- PostgreSQL >9.4
- PostGIS

## Build

```shell
yarn
yarn build
```

## Usage

```js
const express = require('express')
const SensorThings = require('../dist/sensorthings') // or require('sensorthings')
// if you installed it via npm

var app = express()

const config = {
  db: {
    host: 'localhost',
    port: 5432,
    name: 'sensorweb',
    user: 'postgres',
    password: '12345678',
  },
}

app.use('/', SensorThings(config))

app.listen(8080, () => console.log('Running on localhost:8080'))
```

## Running the tests

```shell
yarn test-watch
```

## Running the example

```shell
yarn example
```

## OGC Compliance testing status

We are automatically running the [Test Suite for the OGC SensorThings API](https://github.com/opengeospatial/ets-sta10) with every commit and the results are published [here](https://mozilla-sensorweb.github.io/sensorthings/).

![](https://mozilla-sensorweb.github.io/sensorthings/overview-chart.svg)

| Conformance Class                    | Reference | Test Status           |
| ------------------------------------ | --------- | --------------------- |
| Sensing Core                         | A.1       | 6 passed, 0 failed    |
| Filtering Extension                  | A.2       | 7 passed, 1 failed\*  |
| Create-Update-Delete                 | A.3       | 9 passed, 0 failed    |
| Batch Request                        | A.4       | Tests not implemented |
| Sensing MultiDatastream Extension    | A.5       | Tests not implemented |
| Sensing Data Array Extension         | A.6       | Tests not implemented |
| MQTT Extension for Create and Update | A.7       | Tests not implemented |
| MQTT Extension for Receiving Updates | A.8       | Tests not implemented |

- The failure is actually an [OGC test suite issue](https://github.com/opengeospatial/ets-sta10/issues/35)

## ToDo

- [ ] Integrate the Github Action
- [ ] Publish the package through the Github Actions
- [ ] Add the docker support
- [ ] Deploy the demo server to the Heroku
- [ ] Integrate with [bottleneck](https://github.com/SGrondin/bottleneck)
