'use strict'

function initDB() {
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
          console.log('returning db objects')
          return {
            r: r,
            conn: conn,
            db: db,
            table: r.db('test').table('state')
          }
        })
    })
    .then(info => {
      console.log('got info', Object.keys(info))
      return info
    })
}

function createStore(reducer) {
  var queue // queue for async actions
  var rethinkInterface // interface to rethinkDB
  // simpler interface for reducer to use
  var state = {
    set: function (value) {
      return rethinkInterface.table.insert({
        id: 1,
        state: value
      }).run(rethinkInterface.conn)
    },
    increment: function (delta) {
      return rethinkInterface.table.get(1).update({
        state: rethinkInterface.r.row('state').add(delta)
      }).run(rethinkInterface.conn)
    }
  }
  var stateReducer = reducer.bind(null, state)

  const store = {
    dispatch: function dispatch(action) {
      queue = queue.then(() => stateReducer(action))
    },
    subscribe: function (cb) {
      queue = queue.then(() => {
        return rethinkInterface.table.get(1).changes().run(rethinkInterface.conn)
          .then(cursor => {
            cursor.each((err, change) => cb(change.new_val.state))
          })
      })
    }
  }
  queue = initDB()
    .then(rethink => rethinkInterface = rethink)
  return store
}

function counter(rethinkState, action) {
  if (!action) {
    console.log('setting the default state')
    return rethinkState.set(0)
  }

  switch (action.type) {
  case 'INCREMENT':
    console.log('incrementing value')
    return rethinkState.increment(1)
  case 'DECREMENT':
    console.log('decrementing')
    return rethinkState.increment(-1)
  default:
    return rethinkState
  }
}

const store = createStore(counter)
store.subscribe(state => console.log(state))
store.dispatch() // set default state
store.dispatch({ type: 'INCREMENT' })
store.dispatch({ type: 'INCREMENT' })
store.dispatch({ type: 'DECREMENT' })
