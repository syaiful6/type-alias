var isString = function(s) { return typeof s === 'string'; };
var isNumber = function(n) { return typeof n === 'number'; };
var isBoolean = function(b) { return typeof b === 'boolean'; };
var isObject = function(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
};
var isFunction = function(f) { return typeof f === 'function'; };
var isArray = Array.isArray || function(a) { return 'length' in a; };
// our is just accept one arity, so Immutable.is and Object.is will never pass this
// test
function isAlias(v) {
  return typeof v.is === 'function' && v.is.length === 1
}

function selfCurry(fun, args, context) {
  return fun.bind.apply(fun, [context || this].concat([].slice.call(args)))
}

var mapConstrToFn = function (constr) {
  return constr === String    ? isString
       : constr === Number    ? isNumber
       : constr === Boolean   ? isBoolean
       : constr === Object    ? isObject
       : constr === Array     ? isArray
       : isAlias(constr) ? constr.is
       : constr === Function  ? isFunction
       : constr
}

var mapConstrToStr = function (constrOrValue) {
  var info = typeof constrOrValue === 'function' && constrOrValue.name !== '' && !isAlias(constrOrValue) ? constrOrValue.name // our constructor have name
    : typeof constrOrValue === 'function' && constrOrValue._name !== ''  ? constrOrValue._name
    : isString(constrOrValue) ? 'String'
    : isNumber(constrOrValue) ? 'Number'
    : isBoolean(constrOrValue) ? 'Boolean'
    : isArray(constrOrValue) ? 'Array'
    : isFunction(constrOrValue) ? 'Function'
    : isObject(constrOrValue) ? 'Object'
    : Object.prototype.toString.call(constrOrValue)
  return info
}

var numToStr = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']

function getTypeAsString(keys, value, type) {
  var typeMapStr = {
    primitive: showPrimitive,
    Array: showArray,
    Record: showRecord
  }
  return typeMapStr[type](keys, value)
}

function validate(keys, validators, args, type) {
  var i, v, validator, expectedType, actualValue, errorMsg
  if (keys.length !== args.length) {
    expectedType = getTypeAsString(keys, validators, type)
    actualValue = getTypeAsString(keys, args, type)
    errorMsg = 'too many arguments supplied to type alias constructor. Expected '
      + keys.length + ', but got ' + args.length + '. I expect it to be ' + expectedType
      + ', but i see it will just make ' + actualValue
    throw new TypeError(errorMsg)
  }
  for (i = 0; i < args.length; i++) {
    v = args[i]
    validator = mapConstrToFn(validators[i])
    if (validator.prototype === undefined || !validator.prototype.isPrototypeOf(v) &&
        (typeof validator !== 'function' || !validator(v))) {
      var strVal = typeof v === 'string' ? "'" + v + "'" : v
      expectedType = getTypeAsString(keys, validators, type)
      actualValue = getTypeAsString(keys, args, type)
      errorMsg = 'bad value ' + strVal + ' passed as ' + numToStr[i] + ' argument to type alias constructor, '
        + 'I expect this value to be ' + mapConstrToStr(validators[i]) + ', but i got ' + mapConstrToStr(args[i])
        + ' instead, your type alias is ' + expectedType + ', but it will make ' + actualValue
      if (type === 'Record') errorMsg += ', it\'s mean the property ' + keys[i] + ' was given wrong type.'
      throw new TypeError(errorMsg)
    }
  }
}
// just like validate, but doesn't throws an Error, instead it return boolean
// it used to avoid try-catch block on .is method.
function check(keys, validators, args) {
  var i, v, validator
  if (keys.length !== args.length) {
    return false
  }
  for (i = 0; i < args.length; i++) {
    v = args[i]
    validator = mapConstrToFn(validators[i])
    if (validator.prototype === undefined || !validator.prototype.isPrototypeOf(v) &&
        (typeof validator !== 'function' || !validator(v))) {
      return false
    }
  }
  return true
}

function extractValues(keys, obj) {
  var arr = [], i;
  for (i = 0; i < keys.length; ++i) arr[i] = obj[keys[i]];
  return arr;
}

function showPrimitive(_, args) {
  return mapConstrToStr(args[0])
}

function showArray(_, args) {
  var content = args.map(mapConstrToStr)
  return '[' + args.join(', ') + ']'
}

function showRecord(keys, args) {
  var content = [], i
  for (i = 0; i < keys.length; i++) {
    content.push(keys[i] + ' :: ' + mapConstrToStr(args[i]))
  }
  return '{' + content.join(', ') + '}'
}

function getTypeAliasName(descriptions) {
  return typeof descriptions === 'function' ? 'primitive'
         : isArray(descriptions) ? 'Array'
         : 'Record'
}

function Alias(descriptions) {
  if (arguments.length < 1) return selfCurry(Alias, arguments)
  var primitive = typeof descriptions === 'function',
    keys = !primitive ? Object.keys(descriptions) : [descriptions],
    validators = isArray(descriptions) ? descriptions
                : primitive ? [descriptions]
                : extractValues(keys, descriptions)
  function Construct() {
    if (arguments.length < keys.length) return selfCurry(Construct, arguments)
    var args = [].slice.call(arguments), i
    if (Alias.check === true) {
      validate(keys, validators, args, getTypeAliasName(descriptions))
    }
    if (primitive) return descriptions.apply(null, args)
    var ret = isArray(descriptions) ? [] : {}
    for (i = 0; i < args.length; i++) {
      ret[keys[i]] = args[i]
    }
    return ret
  }
  function read(obj) {
    if (arguments.length < 1) return read
    return Construct.apply(null, primitive ? [obj] : extractValues(keys, obj))
  }
  function is(obj) {
    if (arguments.length < 1) return is
    return check(keys, validators, primitive ? [obj] : extractValues(Object.keys(obj), obj))
  }
  Construct.is = is
  Construct.read = read
  Construct.from = read
  Construct._length = keys.length
  Construct._name = getTypeAsString(keys, validators, getTypeAliasName(descriptions))
  return Construct
}

Alias.check = true

module.exports = Alias
