var assert = require('assert'),
  Alias = require('../type-alias')

describe('Type alias', function () {
  it('return function constructor for the type alias', function () {
    var PhoneBook = Alias([String, String])
    assert.equal('function', typeof PhoneBook)
  })
  it('calling constructor return the same type', function () {
    var PhoneBook = Alias([String, String]) // Alias an Array with shape [String, String]
    assert(Array.isArray(PhoneBook('betty', '555-222-111')))
  })
  it('constructor must be curried', function () {
    var PhoneBook = Alias([String, String]),
      hello = PhoneBook('Hello')
    assert.equal('function', typeof hello)
    var finalize = hello('222-111-222')
    assert.equal('Hello', finalize[0])
    assert.equal('222-111-222', finalize[1])
  })
  it('throwing an exception when call the constructor with wrong type', function () {
    var PhoneBook = Alias([String, String])
    assert.throws(function () {
      PhoneBook(1, 2)
    }, TypeError)
  })
  it('can create the type alias using .from/read method', function () {
    var PhoneBook = Alias([String, String]),
      usingConstructor = PhoneBook('Betty', '222-111-222'),
      usingFromMethod = PhoneBook.from(['Betty', '222-111-222'])
      assert.equal(usingConstructor[0], usingFromMethod[0])
      assert.equal(usingConstructor[1], usingFromMethod[1])
  })
  it('return true when calling .is with same shape', function () {
    var actual = ['betty', '555-222-111'],
      PhoneBook = Alias([String, String])
    assert.equal(true, PhoneBook.is(actual))
  })
  it('return false when calling .is with different shape', function () {
    var actual = [1, 2],
      PhoneBook = Alias([String, String])
    assert.equal(false, PhoneBook.is(actual))
  })
  describe('primitive type alias', function () {
    it('can alias primitive type', function () {
      var Age = Alias(Number)
      assert.equal('number', typeof Age(18))
    })
    it('throwing an exception when call the constructor with wrong type', function () {
      var Age = Alias(Number)
      assert.throws(function () {
        Age('Non Number')
      }, TypeError)
    })
    it('throws an exception when call the constructor with too many arguments', function () {
      var Age = Alias(Number)
      assert.throws(function () {
        Age(19, 20)
      }, TypeError)
    })
    it('is can check the primitive type', function () {
      var Age = Alias(Number)
      assert(Age.is(18))
      assert.equal(false, Age.is('non number'))
    })
  })
  describe('Type alias Record', function () {
    var User = Alias({
      name: String,
      age: Number
    })
    it('create record/object, when the constructor called', function () {
      var user = User('Betty', 19)
      assert.equal('[object Object]', Object.prototype.toString.call(user))
    })
    it('The constructor\'s arguments are in the order they appear in the type alias declaration', function () {
      // it should User :: String -> Number -> User
      var user = User('Betty', 19)
      assert.equal('Betty', user.name)
      assert.equal(19, user.age)
    })
    it('can create the record using .read method', function () {
      var user = {
        name: 'Betty',
        age: 19
      }
      assert.doesNotThrow(function () {
        User.read(user)
      }, TypeError)
    })
    it('.is method return false if the user contains another field', function () {
      var userWithManyFields = {
        name: 'Betty',
        age: 21,
        location: 'somewhere'
      }
      assert.equal(false, User.is(userWithManyFields))
    })
    it('.read/from only take the field they need for the alias', function () {
      var userWithManyFields = {
        name: 'Betty',
        age: 21,
        location: 'somewhere'
      }
      var user = User.read(userWithManyFields)
      assert.equal('undefined', typeof user['location'])
      assert(User.is(user))
    })
  })
  describe('Nesting Type Alias', function () {
    var Phone = Alias(String),
      Name = Alias(String)
    it('can use type aliases on others', function () {
      var PhoneBook = Alias([Name, Phone])
      // check if it successfull create it
      assert.doesNotThrow(function () {
        PhoneBook('Betty', '555-222-111')
      }, TypeError)
    })
    it('throwing an exception when call the constructor with wrong type', function () {
      var PhoneBook = Alias({
        name: Name,
        phone: Phone
      })
      assert.throws(function () {
        PhoneBook.from({
          name: 'Betty',
          phone: 8991 // must be a string
        })
      }, TypeError)
    })
    it('can be used on multiple level type alias', function () {
      var Location = Alias(String)
      var Person = Alias({
        name: Name,
        location: Location
      })
      var PhoneBook = Alias({
        owner: Person,
        phone: Phone
      })
      var betty = Person.from({
        name: 'Betty',
        location: 'somewhere'
      })
      assert.doesNotThrow(function () {
        PhoneBook.from({
          owner: betty,
          phone: '210222'
        })
      }, TypeError)
      // try the direct one
      assert.doesNotThrow(function () {
        PhoneBook.from({
          owner: {
            name: 'Betty',
            location: 'somewhere'
          },
          phone: '210222'
        })
      }, TypeError)
    })
    it('it correctly fail when using multiple level alias', function () {
      var Location = Alias(String)
      var Person = Alias({
        name: Name,
        location: Location
      })
      var PhoneBook = Alias({
        owner: Person,
        phone: Phone
      })
      assert.throws(function () {
        PhoneBook.from({
          owner: {
            name: 'Betty',
            location: 12 // this should fail because Location is an alias of String
          },
          phone: '21002321'
        })
      }, TypeError)
    })
  })
})