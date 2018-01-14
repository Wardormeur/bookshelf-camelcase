
var knex     = require('knex');
var Bookshelf = require('bookshelf');

var knex = require('knex')({
  client: 'sqlite3',
  connection: {filename: ':memory:'},
  useNullAsDefault: true
});

var bookshelf = Bookshelf(knex);
var camelcase = require('./camelcase.js');

bookshelf.plugin([ camelcase, 'registry' ]);

var expect = require('unexpected').clone();

describe('bookshelf camelcase converter plugin', function () {

    var User;

    before(function () {
        Related = bookshelf.Model.extend({
            tableName: 'profile_parts',
            hasTimestamps: true,
        });  

        Groups = bookshelf.Model.extend({
            tableName: 'groups',
        });
        
        bookshelf.model('Group', Groups); 

        User = bookshelf.Model.extend({
            tableName: 'users',
            hasTimestamps: true,

            profileParts: function () {
                return this.hasMany(Related);
            },
            groups: function () {
                return this.belongsToMany('Group').through('UserGroup');
            }
        });

        bookshelf.model('User', User);
        
        UsersGroups = bookshelf.Model.extend({
            tableName: 'users_groups',
            user() {
              return this.hasOne('User');
            },
            group() {
              return this.hasOne('Group')
            },
        });
        
        bookshelf.model('UserGroup', UsersGroups);

        return knex.schema.createTable('users', function (table) {
            table.increments();
            table.timestamps();

            table.string('email').notNullable().unique();
            table.string('password').notNullable();
            table.integer('password_version').notNullable();
            table.integer('profile_part_id');
        })
        .createTable('profile_parts', function (table) {
            table.increments();
            table.timestamps();

            table.integer('user_id').references('id').inTable('users');
            table.string('name');
            table.string('sample_camel_cased');
        })
        .createTable('groups', function (table) {
            table.increments();
            table.timestamps();

            table.string('name');
        })
        .createTable('users_groups', function (table) {
            table.increments();
            table.timestamps();

            table.integer('user_id').references('id').inTable('users');
            table.integer('group_id').references('id').inTable('groups');
        })
    })

    it('should work with new model()', function () {
    })

    it('should work with new model()', function () {
        return expect(User.forge({
            email: `${Date.now()}@foo.com`,
            password: '123456',
            passwordVersion: 1,
            updatedAt: Date.now()
        }).save(), 'to be fulfilled')
        .then(function (user) {
            var attributes = Object.keys(user.attributes);
            expect(attributes, 'to contain', 'updatedAt');
            expect(attributes, 'to contain', 'passwordVersion');
        });
    });

    it('should work with forge', function () {
        return expect(User.forge({
            email: `${Date.now()}@foo.com`,
            password: '123456',
            passwordVersion: 1,
            updatedAt: Date.now()
        }).save(), 'to be fulfilled')
        .then(user => {
            var attributes = Object.keys(user.attributes);
            expect(attributes, 'to contain', 'updatedAt');
            expect(attributes, 'to contain', 'passwordVersion');
        });
    });

    it('should work with toJSON', function () {
        return expect(User.forge({
            email: `${Date.now()}@foo.com`,
            password: '123456',
            passwordVersion: 1,
            updatedAt: Date.now()
        }).save(), 'to be fulfilled')
        .then(user => {
            var attributes = Object.keys(user.toJSON());
            expect(attributes, 'to contain', 'updatedAt');
            expect(attributes, 'to contain', 'passwordVersion');
        });
    });

    it('should work after fetching', function () {
        return expect(User.forge({
            email: `${Date.now()}@foo.com`,
            password: '123456',
            passwordVersion: 1,
            updatedAt: Date.now()
        }).save(), 'to be fulfilled')
        .then(savedUser => User.where({ id: savedUser.id }))
        .then(newUser => expect(newUser.fetch(), 'to be fulfilled').then(fetchedProfile => {
            var attributes = Object.keys(fetchedProfile.attributes);
            expect(attributes, 'to contain', 'updatedAt');
            expect(attributes, 'to contain', 'passwordVersion');
        }));
    });

    it('should work on relations meaningfully', function () {
        return expect((function () {
            return User.forge({
                email: `${Date.now()}@foo.com`,
                password: '123456',
                passwordVersion: 1,
                updatedAt: Date.now()
            }).save()
            .then(function (user) {
                return user.related('profileParts').create({
                    name: 'this_is_a_sample',
                    sampleCamelCased: 'this_is_a_sample',
                })
                .then(function () {
                    return user.clear().refresh();
                })
            });
        })(), 'to be fulfilled')
        .then(function (savedUser) {
            var profileParts = savedUser.related('profileParts').toJSON();
            expect(Object.keys(profileParts[0]), 'to contain', 'sampleCamelCased');
            expect(profileParts[0].name, 'to be', 'this_is_a_sample');
        });
    });

    it('should work on empty relations', function () {
        return expect((function () {
            return User.forge({
                email: `${Date.now()}@foo.com`,
                password: '123456',
                passwordVersion: 1,
                updatedAt: Date.now()
            }).save()
            .then(function (user) {
               return User.forge({ id: user.attributes.id }).fetch({ withRelated: ['profileParts'] })
               .then(function (fetched) { return fetched.toJSON(); });
            });
        })(), 'to be fulfilled')
        .then(function (savedUser) {
          expect(savedUser.profileParts, 'to be an', 'array');
        });
    });

    it('should work on empty transversal relations', function () {
        return expect((function () {
            return User.forge({
                email: `${Date.now()}@foo.com`,
                password: '123456',
                passwordVersion: 1,
                updatedAt: Date.now()
            }).save()
            .then(function (user) {
               return User.forge({ password: '123456' }).fetch({ withRelated: ['groups'] })
               .then(function (fetched) { return fetched.toJSON(); });
            });
        })(), 'to be fulfilled')
        .then(function (savedUser) {
          expect(savedUser.groups, 'to be an', 'array');
        });
    });
});
