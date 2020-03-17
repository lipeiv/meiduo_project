module.exports = Datasource;
var mysql = require("mysql");

function Datasource(db) {
  this.db = db;
}

Datasource.prototype.getConnection = function() {
  this.connection = mysql.createConnection(this.db);
};

Datasource.prototype.closeConnection = function() {
  this.connection.end();
};

Datasource.prototype.changeNotDisabled = function(dummyEndpointId, callback) {
  this.getConnection();
  this.connection.query(
    'update endpoint set disabled = 0 where endpoint_id in(?,?) and model = "dummy-model"',
    [dummyEndpointId.android, dummyEndpointId.ios],
    err => {
      this.closeConnection();
      callback(err);
    }
  );
};

Datasource.prototype.getLatestMessage = function(userId, callback) {
  this.getConnection();
  this.connection.query(
    "select * from message where user_id = ? order by message_id desc limit 1;",
    [userId],
    (err, result) => {
      this.closeConnection();
      callback(err, result);
    }
  );
};

Datasource.prototype.getMessageCount = function(userId, callback) {
  this.getConnection();
  this.connection.query(
    "select count(*) from message where user_id = ?",
    [userId],
    (err, result) => {
      this.closeConnection();
      callback(err, result);
    }
  );
};

Datasource.prototype.getMessageactionCount = function(
  dummyEndpointId,
  messageId,
  callback
) {
  this.getConnection();
  this.connection.query(
    "select count(*) from messageaction where endpoint_id in (?, ?) and message_id = ?",
    [dummyEndpointId.android, dummyEndpointId.ios, messageId],
    (err, result) => {
      this.closeConnection();
      callback(err, result);
    }
  );
};

Datasource.prototype.getMessagerocks = function(messageId) {
  this.getConnection();
  return new Promise((resolve, reject) => {
    this.connection.query(
      "select * from messagerock where message_id = ?;",
      [messageId],
      (err, result) => {
        this.closeConnection();
        if (err) {
          reject(err);
        }
        resolve(result);
      }
    );
  });
};
