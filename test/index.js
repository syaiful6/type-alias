var assert = require('assert'),
  Alias = require('../type-alias')

describe('Type alias', function () {
  it('return function to check the shape of the alias', function () {
    var PhoneBook = Alias([String, String])
    assert.equal('function', typeof PhoneBook)
  })
  it('returned function return boolean value', function () {
    var PhoneBook = Alias([String, String]) // Alias an Array with shape [String, String]
    var shouldBool = PhoneBook(['betty', '555-222-111'])
    assert('boolean', typeof shouldBool)
  })
  it('return true when calling returned function with same shape', function () {
    var actual = ['betty', '555-222-111'],
      PhoneBook = Alias([String, String])
    assert.equal(true, PhoneBook(actual))
  })
  it('return false when calling returned function with different shape', function () {
    var actual = [1, 2],
      PhoneBook = Alias([String, String])
    assert.equal(false, PhoneBook(actual))
  })
  it('create method must be curried', function () {
    var PhoneBook = Alias([String, String]),
      hello = PhoneBook.create('Hello')
    assert.equal('function', typeof hello)
    var finalize = hello('222-111-222')
    assert.equal('Hello', finalize[0])
    assert.equal('222-111-222', finalize[1])
  })
  it('throwing an exception when call the create method with wrong type', function () {
    var PhoneBook = Alias([String, String])
    assert.throws(function () {
      PhoneBook.create(1, 2)
    }, TypeError)
  })
  describe('primitive type alias', function () {
    it('can alias primitive type', function () {
      var Age = Alias(Number)
      assert.equal('boolean', typeof Age(18))
    })
    it('doesn\'t create method', function () {
      var Age = Alias(Number), create = Age.create
      assert.equal(false, typeof create === 'function')
    })
    it('is can check the primitive type', function () {
      var Age = Alias(Number)
      assert(Age(18))
      assert.equal(false, Age('non number'))
    })
  })
  describe('Type alias Record', function () {
    var User = Alias({
      name: String,
      age: Number
    })
    it('return record, when the create method called', function () {
      var user = User.create('Betty', 19)
      assert.equal('[object Object]', Object.prototype.toString.call(user))
    })
    it('Create method\'s arguments are in the order they appear in the type alias declaration', function () {
      // it should User :: String -> Number -> User
      var user = User.create('Betty', 19)
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
    it('calling returned function, return false if the user contains another field', function () {
      var userWithManyFields = {
        name: 'Betty',
        age: 21,
        location: 'somewhere'
      }
      assert.equal(false, User(userWithManyFields))
    })
    it('.read/from only take the field they need for the alias', function () {
      var userWithManyFields = {
        name: 'Betty',
        age: 21,
        location: 'somewhere'
      }
      var user = User.read(userWithManyFields)
      assert.equal('undefined', typeof user['location'])
      assert(User(user))
    })
  })
  describe('Nesting Type Alias', function () {
    var Phone = Alias(String),
      Name = Alias(String)
    it('can use type aliases on others', function () {
      var PhoneBook = Alias([Name, Phone])
      // check if it successfull create it
      assert.doesNotThrow(function () {
        PhoneBook.create('Betty', '555-222-111')
      }, TypeError)
    })
    it('throwing an exception when call the create method with wrong type', function () {
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
