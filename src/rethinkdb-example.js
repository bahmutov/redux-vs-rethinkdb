'use strict'

function initStore() {
  const r = require('rethinkdb')
  const dbOptions = { host: 'localhost', port: 28015 }
  return r.connect(dbOptions)
    .then(conn => {
      console.log('connected')
      const db = r.db('test')
      return db.tableList().run(conn)
        .then(tables => {
          if (tables.indexOf('state') !== -1) {
            console.log('deleting existing table state')
            return db.tableDrop('state').run(conn)
          }
        })
        .then(() => {
          return db.tableCreate('state').run(conn)
            .then(() => console.log('created state table'))
        })
        .then(() => {
          return {
            conn: conn,
            db: db,
            table: db.table('state')
          }
        })
    })
    .then(info => {
      console.log('got info', Object.keys(info))
      return info
    })
}

function counter(rethinkState, action) {
  switch (action.type) {
  case 'INCREMENT':
    return rethinkState.db
  case 'DECREMENT':
    return state - 1
  default:
    // init on default
    console.log('inserting default')
    return rethinkState.table.insert({
      id: 1,
      state: 0
    }).then(() => rethinkState)
  }
}

initStore()
  .then(rethinkState => counter(rethinkState, {}))
  .then(rethinkState => counter(rethinkState, { type: 'INCREMENT' }))
  .done()
