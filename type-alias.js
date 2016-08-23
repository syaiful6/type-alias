'use strict';

var slice = Array.prototype.slice

var isString = function(s) { return typeof s === 'string'; };
var isNumber = function(n) { return typeof n === 'number'; };
var isBoolean = function(b) { return typeof b === 'boolean'; };
var isObject = function(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
};
var isFunction = function(f) { return typeof f === 'function'; };
var isArray = Array.isArray || function(a) { return 'length' in a; };
var isTuple = function (v) { return isArray(v) && v.length > 1; };
var isListOf = function (v) { return isArray(v) && v.length === 1; }

var isPrimitive = function (v) {
  return v === String || v === Number || v === Boolean || v === Function || isString(v) || isNumber(v) || isBoolean(v) || isFunction(v)
}
function selfCurry(fun, args, context) {
  return fun.bind.apply(fun, [context || this].concat(slice.call(args)))
}
var mapConstrToFn = function (constr) {
  return constr === String    ? isString
       : constr === Number    ? isNumber
       : constr === Boolean   ? isBoolean
       : constr === Object    ? isObject
       : constr === Array     ? isArray
       : constr === Function  ? isFunction
       : constr
}
var mapConstrToStr = function (constrOrValue) {
  return constrOrValue.aliasType != null ? constrOrValue.aliasType // our constructor have name
    : typeof constrOrValue === 'function' && constrOrValue._name != null  ? constrOrValue._name
    : typeof constrOrValue === 'function' && constrOrValue.name !== '' ? constrOrValue.name
    : isString(constrOrValue) ? 'String'
    : isNumber(constrOrValue) ? 'Number'
    : isBoolean(constrOrValue) ? 'Boolean'
    : isArray(constrOrValue) ? 'Array'
    : isFunction(constrOrValue) ? 'Function'
    : isObject(constrOrValue) ? 'Object'
    : Object.prototype.toString.call(constrOrValue)
}

var numToStr = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']

function getTypeAsString(keys, value, type) {
  var typeMapStr = {
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
    errorMsg = 'too many arguments supplied to type alias create method. Expected '
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
      errorMsg = 'bad value ' + strVal + ' passed as ' + numToStr[i] + ' argument to type alias create method, '
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

function range(lo, hi) {
  var arr = []
  for (var i = lo; i < hi; i++) {
    arr.push(i)
  }
  return arr
}

function showArray(_, args) {
  var content = args.map(mapConstrToStr)
  return '[' + content.join(', ') + ']'
}

function showRecord(keys, args) {
  var content = [], i
  for (i = 0; i < keys.length; i++) {
    content.push(keys[i] + ' :: ' + mapConstrToStr(args[i]))
  }
  return '{' + content.join(', ') + '}'
}

function multiDispatch(fun) {
  var implementations = []
  function wrapper() {
    if (arguments.length < 1) return selfCurry(wrapper, arguments)
    return implementations.length > 0 && implementations[0].apply(this, slice.call(arguments))
      ? implementations[1].apply(this, slice.call(arguments))
      : fun.apply(this, arguments)
  }
  function register(predicate, f) {
    implementations = [predicate, f]
    return multiDispatch(wrapper)
  }
  wrapper.register = register
  return wrapper
}

function PrimitiveAlias(realType) {
  var validator = mapConstrToFn(realType)
  function Basic(v) {
    return validator(v)
  }
  Object.defineProperty(Basic, 'aliasType', {
    configurable: false
    , enumerable: false
    , get: function () {
      return mapConstrToStr(realType)
    }
  })
  return Basic
}

function TupleAlias(descriptions) {
  var keys = range(0, descriptions.length),
    validators = descriptions
  function Tuple(obj) {
    if (arguments.length < 1) return Tuple
    if (!isArray(obj)) return false // fast fail
    return check(keys, validators, obj)
  }
  function create() {
    if (arguments.length < keys.length) return selfCurry(create, arguments)
    var args = [].slice.call(arguments), i
    if (Alias.check === true) {
      validate(keys, validators, args, 'Array')
    }
    return args
  }
  Tuple.create = create
  Object.defineProperty(Tuple, 'aliasType', {
    configurable: false
    , enumerable: false
    , get: function () {
      return getTypeAsString(keys, validators, 'Array')
    }
  })
  return Tuple
}

function ListOfAlias(raw) {
  var type = raw[0], internalType = Alias(type)
  function ListType(obj) {
    if (arguments.length < 1) return ListType
    if (!isArray(obj)) return false
    var i, len
    for (i = 0, len = obj.length; i < len; i++) {
      if (!internalType(obj[i])) return false
    }
    return true
  }
  Object.defineProperty(ListType, 'aliasType', {
    configurable: false
    , enumerable: false
    , get: function () {
      return internalType.aliasType + '[]'
    }
  })
  return ListType
}

function RecordAlias(descriptions) {
  var keys = Object.keys(descriptions), validators = extractValues(keys, descriptions)
  function Record(obj) {
    if (arguments.length < 1) return Record
    return check(keys, validators, extractValues(Object.keys(obj), obj))
  }
  function create() {
    if (arguments.length < keys.length) return selfCurry(create, arguments)
    var args = [].slice.call(arguments), i
    if (Alias.check === true) {
      validate(keys, validators, args, 'Record')
    }
    var record = Object.create(null)
    for (i = 0; i < args.length; i++) {
      record[keys[i]] = args[i]
    }
    return record
  }
  function read(obj) {
    if (arguments.length < 1) return read
    return create.apply(null, extractValues(keys, obj))
  }
  Record.create = create
  Record.read = read
  Record.from = read
  Object.defineProperty(Record, 'aliasType', {
    configurable: false
    , enumerable: false
    , get: function () {
      return getTypeAsString(keys, validators, 'Record')
    }
  })
  return Record
}

function AliasImplNotFound(v) {
  var strval = mapConstrToStr(v)
  throw new Error('For now, type alias doesn\'t support ' + strval + '. it\'s mean we can\'t alias this type.')
}

var InnerAlias = multiDispatch(AliasImplNotFound)
  .register(isObject, RecordAlias)
  .register(isListOf, ListOfAlias)
  .register(isTuple, TupleAlias)
  .register(isPrimitive, PrimitiveAlias)

// wrap this, prevent the user to register the implementation
function Alias(v) {
  return InnerAlias(v)
}

Alias.check = true

module.exports = Alias
