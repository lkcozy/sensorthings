/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global before */

'use strict'

import app from './server'
import db from '../src/models/db'
import should from 'should'
import supertest from 'supertest'

import * as CONST from './constants'
import * as ERR from '../src/errors'

db().then(models => {
  describe('Query language', () => {
    const port = 8123
    const server = supertest.agent(app.listen(port))
    const { limit } = CONST
    const prepath = '/v1.0/'
    const fullPrepath = 'http://127.0.0.1:' + port + prepath
    const modelName = 'Things'

    const get = endpoint => {
      return new Promise(resolve => {
        server
          .get(prepath + endpoint)
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            should.not.exist(err)
            resolve(res.body)
          })
      })
    }

    const getError = (endpoint, error) => {
      return new Promise(resolve => {
        server
          .get(prepath + endpoint)
          .expect('Content-Type', /json/)
          .expect(error.code)
          .end((err, res) => {
            should.not.exist(err)
            should.not.exist(res.body[CONST.nextLink])
            res.body.should.be.deepEqual(error)
            resolve()
          })
      })
    }

    const insert = (count, done) => {
      const model = models[modelName]
      const entity = Object.assign({}, CONST[modelName + 'Entity'])
      let promises = []
      model.destroy({ where: {} }).then(() => {
        for (let i = 0; i < count; i++) {
          promises.push(model.create(entity))
        }
        Promise.all(promises).then(() => {
          done()
        })
      })
    }

    describe('$top and $skip', () => {
      const topSkipLimit = 302

      before(done => {
        insert(topSkipLimit, done)
      })
      ;[
        {
          top: undefined,
          expected: limit,
          nextLink: {
            top: limit,
            skip: limit,
          },
        },
        {
          top: 50,
          expected: 50,
          nextLink: {
            top: 50,
            skip: 50,
          },
        },
        {
          top: 101,
          expected: limit,
          nextLink: {
            top: limit,
            skip: limit,
          },
        },
      ].forEach(test => {
        const query = test.top ? '?$top=' + test.top : ''
        it(
          'GET ' +
            modelName +
            query +
            ' should respond with ' +
            test.expected +
            ' entities',
          done => {
            get(modelName + query).then(result => {
              result[CONST.iotCount].should.be.equal(topSkipLimit)
              result.value.should.be
                .instanceof(Array)
                .and.have.lengthOf(test.expected)
              const nextLink =
                fullPrepath +
                modelName +
                '?$top=' +
                test.nextLink.top +
                '&$skip=' +
                test.nextLink.skip
              result[CONST.iotNextLink].should.be.equal(nextLink)
              done()
            })
          }
        )
      })

      it(
        'GET ' + modelName + '?$top=-1 should respond with 400 BAD_REQUEST',
        done => {
          getError(modelName + '?$top=-1', {
            code: 400,
            errno: ERR.errnos[ERR.ERRNO_INVALID_QUERY_STRING],
            error: ERR.errors[ERR.BAD_REQUEST],
            message: '$top',
          }).then(() => {
            done()
          })
        }
      )
    })

    describe('$count', () => {
      const count = 10

      before(done => {
        insert(count, done)
      })

      it('should respond with count', done => {
        get(modelName + '?$count=true').then(result => {
          result[CONST.iotCount].should.be.equal(count)
          done()
        })
      })

      it('should respond without count', done => {
        get(modelName + '?$count=false').then(result => {
          should.not.exist(result[CONST.iotCount])
          done()
        })
      })
    })

    describe('$filter', () => {
      const count = 15

      before(done => {
        const model = models.Observations
        const entity = Object.assign({}, CONST.ObservationsEntity)
        let promises = []
        model.destroy({ where: {} }).then(() => {
          for (let i = 0; i < count; i++) {
            entity.phenomenonTime = Date.now()
            entity.result = String(i)
            promises.push(model.create(entity))
          }
          Promise.all(promises).then(() => {
            done()
          })
        })
      })

      it('should filter by responding one value', done => {
        get(CONST.observations + '?$filter=result eq \'0\'').then(result => {
          result[CONST.iotCount].should.be.equal(1)
          result.value[0].result.should.be.equal('0')
          done()
        })
      })

      it('should filter by responding more than one value', done => {
        get(CONST.observations + '?$filter=result gt \'1\'').then(result => {
          result[CONST.iotCount].should.be.equal(13)
          done()
        })
      })

      it('should filter using le comparator', done => {
        get(CONST.observations + '?$filter=result le \'1\'').then(result => {
          result[CONST.iotCount].should.be.equal(2)
          done()
        })
      })

      it('should filter using ne comparator', done => {
        get(CONST.observations + '?$filter=result ne \'0\'').then(result => {
          result[CONST.iotCount].should.be.equal(14)
          done()
        })
      })

      it('should filter using ge comparator', done => {
        get(CONST.observations + '?$filter=result ge \'9\'').then(result => {
          result[CONST.iotCount].should.be.equal(1)
          done()
        })
      })

      it('should filter ints with strings', done => {
        get(CONST.observations + '?$filter=result gt \'5\'').then(result => {
          result[CONST.iotCount].should.be.equal(4)
          done()
        })
      })

      it('should ignore filter if is not filtering by literal', done => {
        get(CONST.observations + '?$filter=result gt phenomenonTime').then(
          result => {
            result[CONST.iotCount].should.be.equal(15)
            done()
          }
        )
      })

      it('should ignore filter if is not a property', done => {
        get(CONST.observations + '?$filter=3 gt phenomenonTime').then(
          result => {
            result[CONST.iotCount].should.be.equal(15)
            done()
          }
        )
      })

      describe('filter locations', () => {
        beforeEach(done => {
          models.sequelize
            .transaction(transaction => {
              return Promise.all(
                Object.keys(CONST.entities).map(name => {
                  return models[name].destroy({ transaction, where: {} })
                })
              )
            })
            .then(() => {
              const loc = Object.assign({}, CONST.LocationsEntity)
              models.Locations.create(loc).then(() => done())
            })
        })

        it('should filter by location', done => {
          const coords = [
            '-114.34 51.20',
            '-113.72 51.19',
            '-113.67 50.85',
            '-114.46 50.83',
            '-114.34 51.20',
          ]
          const polygon = 'geography\'POLYGON((' + coords.join(',') + '))\')'
          get(
            CONST.locations + '?$filter=geo.intersects(location, ' + polygon
          ).then(result => {
            result[CONST.iotCount].should.be.equal(1)
            done()
          })
        })

        it('should return [] when there is no location that matches', done => {
          const coords = ['-113 51', '-110 51', '-110 50', '-113 51']
          const polygon = 'geography\'POLYGON((' + coords.join(',') + '))\')'
          get(
            CONST.locations + '?$filter=geo.intersects(location, ' + polygon
          ).then(result => {
            result[CONST.iotCount].should.be.equal(0)
            done()
          })
        })
      })

      describe('url encoding', () => {
        it('should correctly decode spaces', done => {
          const entity = Object.assign({}, CONST.ThingsEntity)
          entity.name = 'thing 1'
          models.Things.create(entity).then(() => {
            get(CONST.things + '?$filter=name%20eq%20%27thing+1%27').then(
              result => {
                result[CONST.iotCount].should.be.equal(1)
                done()
              }
            )
          })
        })
      })
    })

    describe('$orderby', () => {
      describe('Only 1 field', () => {
        const count = 9

        before(done => {
          const model = models[modelName]
          const entity = Object.assign({}, CONST[modelName + 'Entity'])
          let promises = []
          model.destroy({ where: {} }).then(() => {
            for (let i = 0; i < count; i++) {
              entity.name = i
              promises.push(model.create(entity))
            }
            Promise.all(promises).then(() => {
              done()
            })
          })
        })

        it('should respond with an ascending order', done => {
          get(modelName + '?$orderby=name').then(result => {
            result[CONST.iotCount].should.be.equal(count)
            // Checking that they are in order
            for (let i = 0; i < count; i++) {
              result.value[i].name.should.be.equal(String(i))
            }
            done()
          })
        })

        it('should respond with a descending order', done => {
          get(modelName + '?$orderby=name desc').then(result => {
            result[CONST.iotCount].should.be.equal(count)
            // Checking that they are in order
            let index = 0
            for (let i = count - 1; i > -1; i--) {
              result.value[index].name.should.be.equal(String(i))
              index++
            }
            done()
          })
        })
      })

      describe('More than 1 field', () => {
        const count = 9

        before(done => {
          const model = models[modelName]
          const entity = Object.assign({}, CONST[modelName + 'Entity'])

          let promises = []
          model.destroy({ where: {} }).then(() => {
            for (let i = 0; i < count; i++) {
              entity.name = i < 5 ? '1' : '2'
              entity.description = count - i
              promises.push(model.create(entity))
            }
            Promise.all(promises).then(() => {
              done()
            })
          })
        })

        it('should order by name and then by description', done => {
          get(modelName + '?$orderby=name, description').then(result => {
            result[CONST.iotCount].should.be.equal(count)
            // Checking that they are in order
            for (let i = 0; i < count; i++) {
              result.value[i].name.should.be.equal(i < 5 ? '1' : '2')
              const desc = i < 5 ? 5 + i : i - 4
              result.value[i].description.should.be.equal(String(desc))
            }
            done()
          })
        })

        it('should order by name and by description without space', done => {
          get(modelName + '?$orderby=name,description').then(result => {
            result[CONST.iotCount].should.be.equal(count)
            // Checking that they are in order
            for (let i = 0; i < count; i++) {
              result.value[i].name.should.be.equal(i < 5 ? '1' : '2')
              const desc = i < 5 ? 5 + i : i - 4
              result.value[i].description.should.be.equal(String(desc))
            }
            done()
          })
        })

        it('should order by name and then descending by description', done => {
          get(modelName + '?$orderby=name, description desc').then(result => {
            result[CONST.iotCount].should.be.equal(count)
            // Checking that they are in order
            for (let i = 0; i < count; i++) {
              result.value[i].name.should.be.equal(i < 5 ? '1' : '2')
              const desc = count - i
              result.value[i].description.should.be.equal(String(desc))
            }
            done()
          })
        })
      })
    })

    describe('$select', () => {
      let ids = []
      const entity = Object.assign({}, CONST[modelName + 'Entity'])
      before(done => {
        const model = models[modelName]
        let promises = []
        model.destroy({ where: {} }).then(() => {
          for (let i = 0; i < 2; i++) {
            promises.push(model.create(entity))
          }
          Promise.all(promises).then(results => {
            results.forEach(result => {
              ids.push(result.id)
            })
            done()
          })
        })
      })

      it('should select the entire entity if no $select is present', done => {
        const url = modelName + '(' + ids[0] + ')'
        get(url).then(result => {
          const selfLink = fullPrepath + modelName + '(' + ids[0] + ')'
          const expected = Object.assign({}, entity, {
            '@iot.selfLink': selfLink,
            '@iot.id': ids[0],
            'Locations@iot.navigationLink': selfLink + '/Locations',
            'HistoricalLocations@iot.navigationLink':
              selfLink + '/HistoricalLocations',
            'Datastreams@iot.navigationLink': selfLink + '/Datastreams',
          })
          result.should.be.deepEqual(expected)
          done()
        })
      })

      it('should select selfLink and id for Thing with id', done => {
        const url = modelName + '(' + ids[0] + ')?$select=selfLink,id'
        get(url).then(result => {
          result.should.be.deepEqual({
            '@iot.selfLink': fullPrepath + modelName + '(' + ids[0] + ')',
            '@iot.id': ids[0],
          })
          done()
        })
      })

      it('should select Locations for Thing with id', done => {
        const url = modelName + '(' + ids[0] + ')?$select=Locations'
        get(url).then(result => {
          result.should.be.deepEqual({
            'Locations@iot.navigationLink':
              fullPrepath + modelName + '(' + ids[0] + ')/Locations',
          })
          done()
        })
      })

      it('should select description and name for Thing with id', done => {
        const url = modelName + '(' + ids[0] + ')?$select=description,name'
        get(url).then(result => {
          result.should.be.deepEqual({
            description: entity.description,
            name: entity.name,
          })
          done()
        })
      })

      it('should select description and name for all Things', done => {
        const url = modelName + '?$select=description,name'
        get(url).then(result => {
          result.should.be.deepEqual({
            '@iot.count': 2,
            value: [
              {
                description: entity.description,
                name: entity.name,
              },
              {
                description: entity.description,
                name: entity.name,
              },
            ],
          })
          done()
        })
      })
    })

    describe('$expand', () => {
      let id, selfLink
      before(done => {
        models.sequelize
          .transaction(transaction => {
            return Promise.all(
              Object.keys(CONST.entities).map(name => {
                return models[name].destroy({ transaction, where: {} })
              })
            )
          })
          .then(() => {
            const body = Object.assign({}, CONST.ThingsEntity, {
              Datastreams: Object.assign({}, CONST.DatastreamsEntity, {
                Observations: [
                  Object.assign({}, CONST.ObservationsEntity, {
                    FeatureOfInterest: undefined,
                    Datastream: undefined,
                  }),
                  Object.assign({}, CONST.ObservationsEntity, {
                    FeatureOfInterest: undefined,
                    Datastream: undefined,
                  }),
                ],
                Thing: undefined,
              }),
              Locations: [Object.assign({}, CONST.LocationsEntity)],
            })
            server
              .post(prepath + modelName)
              .send(body)
              .expect(201)
              .end((err, res) => {
                should.not.exist(err)
                selfLink = res.body['@iot.selfLink']
                id = res.body['@iot.id']
                done()
              })
          })
      })

      it('should not expand any association if no $expand is present', done => {
        const url = modelName
        get(url).then(result => {
          result.should.be.deepEqual({
            '@iot.count': 1,
            value: [
              Object.assign({}, CONST[modelName + 'Entity'], {
                '@iot.selfLink': selfLink,
                '@iot.id': id,
                'Locations@iot.navigationLink': selfLink + '/Locations',
                'HistoricalLocations@iot.navigationLink':
                  selfLink + '/HistoricalLocations',
                'Datastreams@iot.navigationLink': selfLink + '/Datastreams',
              }),
            ],
          })
          done()
        })
      })

      it('should expand Datastreams for request with $expand=Datastreams', done => {
        const url = modelName + '?$expand=Datastreams'
        get(url).then(result => {
          const datastreams = result.value[0].Datastreams
          datastreams.should.be.instanceof(Array).and.have.lengthOf(1)
          done()
        })
      })

      it('should expand recursively requesting to /Datastreams?$expand=Things', done => {
        const url = modelName + '(' + id + ')/Datastreams?$expand=Things'
        get(url).then(result => {
          const thing = result.value[0].Thing
          thing.id.should.be.equal(id)
          done()
        })
      })

      it(
        'should expand Datastreams and Things for request with ' +
          '$expand=Datastreams,Locations',
        done => {
          const url = modelName + '?$expand=Datastreams,Locations'
          get(url).then(result => {
            const datastreams = result.value[0].Datastreams
            const locations = result.value[0].Locations
            datastreams.should.be.instanceof(Array).and.have.lengthOf(1)
            locations.should.be.instanceof(Array).and.have.lengthOf(1)
            done()
          })
        }
      )

      it(
        'should expand Datastreams with multiple relations requesting ' +
          '/Datastreams$expand=Thing,Sensor,Observations',
        done => {
          const url = 'Datastreams?$expand=Thing,Sensor,Observations'
          get(url).then(result => {
            const thing = result.value[0].Thing
            thing[CONST.iotId].should.be.equal(id)
            const sensor = result.value[0].Sensor
            sensor.should.be.instanceof(Object)
            const observations = result.value[0].Observations
            observations.should.be.instanceof(Array).and.have.lengthOf(2)
            done()
          })
        }
      )

      it(
        'should expand Locations and Things for request with ' +
          '$expand=Thing,Locations',
        done => {
          const url = 'HistoricalLocations?$expand=Thing,Locations'
          get(url).then(result => {
            const thing = result.value[0].Thing
            const locations = result.value[0].Locations
            thing[CONST.iotId].should.be.equal(id)
            locations.should.be.instanceof(Array).and.have.lengthOf(1)
            done()
          })
        }
      )

      describe('multilevel relations', () => {
        it('returns multilevel relations when they exist', done => {
          const url = modelName + '?$expand=Datastreams/Observations'
          get(url).then(result => {
            const datastreams = result.value[0].Datastreams
            const observations = datastreams[0].Observations
            datastreams.should.be.instanceof(Array).and.have.lengthOf(1)
            observations.should.be.instanceof(Array).and.have.lengthOf(2)
            done()
          })
        })

        it('returns mutiple multilevel relations when they exist', done => {
          let url = modelName + '?$expand=Datastreams/Thing'
          url += ',Datastreams/Sensor'
          get(url).then(result => {
            const datastreams = result.value[0].Datastreams
            const thing = datastreams[0].Thing
            const sensor = datastreams[0].Sensor
            datastreams.should.be.instanceof(Array).and.have.lengthOf(1)
            thing.should.be.instanceof(Object)
            sensor.should.be.instanceof(Object)
            done()
          })
        })

        it(
          'should expand HistoricalLocations with multiple relations ' +
            'requesting HistoricalLocations?$expand=Thing/Datastreams',
          done => {
            const url = 'HistoricalLocations?$expand=Thing/Datastreams'
            get(url).then(result => {
              const thing = result.value[0].Thing
              thing.should.be.instanceof(Object)
              const datastreams = thing.Datastreams
              datastreams.should.be.instanceof(Array).and.have.lengthOf(1)
              done()
            })
          }
        )
      })
    })
  })
})
