// test_mysql.js
//------------------------------
//
// 2014-11-15, Jonas Colmsjö
//
//------------------------------
//
// Template for tests
//
//
// Using Google JavaScript Style Guide:
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------

var StringDecoder = require('string_decoder').StringDecoder;

var mysql = require('../src/mysql.js');
var rs = require('../src/mysql.js').sqlRead;
var ws = require('../src/mysql.js').sqlWriteStream;
var h = require('../src/helpers.js');

var CONFIG = require('../src/config.js');

// The full path to the tested file
//CONFIG.testLoggerOptions.filename = __filename;
var log = new h.log0(CONFIG.testLoggerOptions);

console.log('IMPORTANT!!! Make sure that the ADMIN_USER and ADMIN_PASSWORD environment variables are set.');

var delay = 0,
  // milliseconds between async tests, 10 is the minimum that works on
  // my laptop
  intervall = 10;

var decoder = new StringDecoder('utf8');

// First test user
var testEmail = 'test@gizur.com';
var accountId = h.email2accountId(testEmail);
var options = {
  credentials: {
    user: accountId,
    database: accountId
  },
  closeStream: false
};

// second test user, access the database for user #1
var testEmail2 = 'test2@gizur.com';
var accountId2 = h.email2accountId(testEmail2);
var options2 = {
  credentials: {
    user: accountId2,
    database: accountId
  },
  closeStream: false
};

// user for admin operatioons (creating/deleting user etc.)
var adminOptions = {
  credentials: {
    user: CONFIG.MYSQL.ADMIN_USER,
    password: CONFIG.MYSQL.ADMIN_PASSWORD
  },
  closeStream: false
};

var bucket = new h.arrayBucketStream(),
  bucket2 = new h.arrayBucketStream();

// Main
// =====

exports['test.mysql'] = {

  // Cleanup database in case previous tests failed
  setUp: function(done) {
    var self = this;

    // drop table
    setTimeout(function() {
      adminOptions.tableName = accountId + '.table1';
      var drop = new mysql.sqlDrop(adminOptions);
      drop.pipe(bucket);
    }.bind(this), (delay++) * intervall);


    // drop the users
    setTimeout(function() {
      var mysqlAdmin = new mysql.sqlAdmin(adminOptions);
      log.debug('Drop user #1...');
      mysqlAdmin.delete(accountId);
      mysqlAdmin.pipe(bucket);

      var mysqlAdmin2 = new mysql.sqlAdmin(adminOptions);
      log.debug('Drop user #2...');
      mysqlAdmin2.delete(accountId2);
      mysqlAdmin2.pipe(bucket);
    }.bind(this), (delay++) * intervall);

    done();

  },

  'testing POST': function(test) {

    test.expect(14);

    var expected1 = [{
      "fieldCount": 0,
      "affectedRows": 0,
      "insertId": 0,
      "serverStatus": 2,
      "warningCount": 0,
      "message": "",
      "protocol41": true,
      "changedRows": 0
    }, {
      "fieldCount": 0,
      "affectedRows": 0,
      "insertId": 0,
      "serverStatus": 2,
      "warningCount": 0,
      "message": "",
      "protocol41": true,
      "changedRows": 0
    }, {
      "fieldCount": 0,
      "affectedRows": 1,
      "insertId": 0,
      "serverStatus": 2,
      "warningCount": 0,
      "message": "",
      "protocol41": true,
      "changedRows": 0
    }, {
      "fieldCount": 0,
      "affectedRows": 1,
      "insertId": 0,
      "serverStatus": 2,
      "warningCount": 0,
      "message": "",
      "protocol41": true,
      "changedRows": 0
    }, {
      "fieldCount": 0,
      "affectedRows": 2,
      "insertId": 0,
      "serverStatus": 34,
      "warningCount": 0,
      "message": "",
      "protocol41": true,
      "changedRows": 0
    }, {
      "fieldCount": 0,
      "affectedRows": 0,
      "insertId": 0,
      "serverStatus": 2,
      "warningCount": 0,
      "message": "",
      "protocol41": true,
      "changedRows": 0
    }];

    // 1. simple select
    setTimeout(function() {
      log.debug('select 1...');
      adminOptions.sql = 'select 1';
      var mysqlRead = new mysql.sqlRead(adminOptions);
      mysqlRead.pipe(bucket);

      test.ok(adminOptions.credentials.user !== undefined &&
        adminOptions.credentials.password !== undefined,
        'MySQL credentials not set');
    }.bind(this), (delay++) * intervall);


    // 2. create new user
    setTimeout(function() {
      test.deepEqual(bucket.get() === expected1, 'Test section #1 did not return the expected result');

      // This streams save everything written to it
      var mysqlAdmin = new mysql.sqlAdmin(adminOptions);
      log.debug('Create new user...');
      mysqlAdmin.new(accountId);
      bucket.empty();
      mysqlAdmin.pipe(bucket);

      // This streams save everything written to it
      var mysqlAdmin2 = new mysql.sqlAdmin(adminOptions);
      log.debug('Create new user #2...');
      mysqlAdmin2.new(accountId2);
      bucket2.empty();
      mysqlAdmin2.pipe(bucket2);

      test.ok(true, 'create new user');
    }.bind(this), (delay++) * intervall);


    // 3. set passwords
    setTimeout(function() {
      var mysqlAdmin = new mysql.sqlAdmin(adminOptions);
      options.credentials.password = mysqlAdmin.resetPassword(accountId);
      mysqlAdmin.pipe(process.stdout);
      log.debug('Password set to: ' + options.credentials.password);

      var mysqlAdmin2 = new mysql.sqlAdmin(adminOptions);
      options2.credentials.password = mysqlAdmin2.resetPassword(accountId2);
      mysqlAdmin2.pipe(process.stdout);
      log.debug('Password #2 set to: ' + options2.credentials.password);

      test.ok(true, 'set passwords');
    }.bind(this), (delay++) * intervall);

    // 4. create table
    setTimeout(function() {

      var tableDef = {
        table_name: 'table1',
        columns: [
          'col1 int',
          'col2 varchar(255)',
        ]
      };

      options.tableDef = tableDef;

      bucket = new h.arrayBucketStream();
      log.debug('create using options:' + JSON.stringify(options));
      var create = new mysql.sqlCreate(options);
      create.pipe(bucket);

      test.ok(true, 'create table');
    }, (delay++) * intervall);

    // 5. Grant privs to user #2
    setTimeout(function() {
      log.debug('Grant privs to table1 to user #2');

      var mysqlAdmin = new mysql.sqlAdmin(options);
      mysqlAdmin.grant('table1', accountId2);
      mysqlAdmin.pipe(bucket);

      test.ok(true, 'Grant privs to user #2');
    }.bind(this), (delay++) * intervall);

    // 6. insert into table
    setTimeout(function() {

      options.tableName = 'table1';
      options.resultStream = process.stdout;
      options.closeStream = false;
      var mysqlStream = new mysql.sqlWriteStream(options);

      // create stream that writes json into mysql
      var jsonStream = new require('stream');
      jsonStream.pipe = function(dest) {
        dest.write(JSON.stringify({
          col1: 11,
          col2: '11'
        }));
      };

      jsonStream.pipe(mysqlStream);

      options2.tableName = 'table1';
      options2.resultStream = process.stdout;
      options2.closeStream = false;
      var mysqlStream2 = new mysql.sqlWriteStream(options2);

      // create stream that writes json into mysql
      var jsonStream2 = new require('stream');
      jsonStream2.pipe = function(dest) {
        dest.write(JSON.stringify({
          col1: 22,
          col2: '22'
        }));
      };

      jsonStream2.pipe(mysqlStream2);

      test.ok(true, 'insert into table');
    }.bind(this), (delay++) * intervall);

    // 7. select from table
    setTimeout(function() {
      log.debug('Read values of the mysql stream:');
      options.sql = 'select * from table1';
      var mysqlRead = new mysql.sqlRead(options);
      bucket.empty();
      mysqlRead.pipe(bucket);
      test.ok(true, 'select from table');
    }.bind(this), (delay++) * intervall);

    // 8. wait four seconds and write results
    setTimeout(function() {
      var decoder = new StringDecoder('utf8');
      log.debug('BUCKET CONTENTS after insert (decoded):' + decoder.write(bucket.get()));
      test.ok(true, 'wait four seconds and write results');
    }.bind(this), (delay++) * intervall);

    // 9. delete from table
    setTimeout(function() {
      options.tableName = 'table1';
      var del = new mysql.sqlDelete(options);
      del.pipe(process.stdout);

      test.ok(true, 'delete from table');
    }.bind(this), (delay++) * intervall);

    // 10. read table
    setTimeout(function() {
      options.sql = 'select * from table1';
      var mysqlRead = new mysql.sqlRead(options);
      bucket.empty();
      mysqlRead.pipe(bucket);

      test.ok(true, 'read table');
    }.bind(this), (delay++) * intervall);

    // 11. check what was read this time
    setTimeout(function() {
      log.debug('BUCKET CONTENTS delete (decoded):' + decoder.write(bucket.get()));

      test.ok(true, 'check what was read this time');
    }.bind(this), (delay++) * intervall);

    // 12. drop table
    setTimeout(function() {
      options.tableName = 'table1';
      var drop = new mysql.sqlDrop(options);
      drop.pipe(process.stdout);

      test.ok(true, 'drop table');
    }.bind(this), (delay++) * intervall);

    // 13. drop the new user
    setTimeout(function() {
      var mysqlAdmin = new mysql.sqlAdmin(adminOptions);
      log.debug('Drop the new user...');
      mysqlAdmin.delete(accountId);
      mysqlAdmin.pipe(bucket);

      var mysqlAdmin2 = new mysql.sqlAdmin(adminOptions);
      log.debug('Drop the new user #2...');
      mysqlAdmin2.delete(accountId2);
      mysqlAdmin2.pipe(bucket);

      test.ok(true, 'drop the new user');
      test.done();

    }.bind(this), (delay++) * intervall);

  }
};
