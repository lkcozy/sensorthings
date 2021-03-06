import bodyParser from 'body-parser'
import express from 'express'
import SensorThings from '../src/sensorthings'

let app = express()

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

let hooks = {}
const config = {
  db: {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    name: 'sensorthingstest',
    user: 'postgres',
    pass: process.env.POSTGRES_PASSWORD,
    hooks: {
      beforeCreate: () => {
        hooks.beforeCreate = true
      },
      afterCreate: () => {
        hooks.afterCreate = true
      },
      beforeDestroy: () => {
        hooks.beforeDestroy = true
      },
      afterDestroy: () => {
        hooks.afterDestroy = true
      },
      beforeUpdate: () => {
        hooks.beforeUpdate = true
      },
      afterUpdate: () => {
        hooks.afterUpdate = true
      },
    },
  },
}

app.use('/', SensorThings(config))

export default app

exports.resetHooks = () => {
  hooks = {}
}

exports.hookInvoked = name => {
  return hooks[name] !== undefined
}
