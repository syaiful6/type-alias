const Alias = require('../type-alias')
// make it clear
const User = Alias({
  avatar: String
  , username: String
  , url: String
})

const Users = Alias([User])

const Model = Alias({
  loaded: Users
  , suggested: Users
})

var compose = (f, g) => (x) => f(g(x))
var selfCurry = (fun, args, context) => fun.bind.apply(fun, [context || this].concat(slice.call(args)))
function map(fn, xs) {
  if (arguments.length < 2) return selfCurry(map, arguments)
  return xs.map(fn)
}

const randomize = r => Math.random() * r
const requestUrl = r => 'https://api.github.com/users?since=' + r

function makeRequest(url) {
  return fetch(url).then((response) => response.json()).then(map(User.read)).then(function (users) {
    return Model.from({
      loaded: users,
      suggested: users.slice(0, 5)
    })
  })
}

const trace = (toLog) => {
  console.log(toLog)
  return toLog
}

var request = compose(makeRequest, compose(Math.floor, randomize))
request(500).then(trace)
