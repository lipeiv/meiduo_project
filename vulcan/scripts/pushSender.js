var Spooky = require("spooky");
var config = require("config");
var log4js = require("log4js");
var assert = require("assert");
var Datasource = require("./Datasource");
var fs = require("fs");

log4js.configure(config.log4js);
var logger = log4js.getLogger("pushSender");
logger.setLevel(process.env.LOG_LEVEL);
var datasource = new Datasource(config.db);

var login = function(account) {
  $("#username").val(account.mail_address);
  $("#password").val(account.password);
  $("form").submit();
};
var selectTeam = function() {
  $("input[name=register]").click();
};
var showCreateNotificationPage = function() {
  var createNotificationLink = "#sidebar > h3:nth-child(2)";
  $(createNotificationLink).click();
};
var inputTtileAndMessage = function() {
  $("#title").val("vulcanPush");
  $("#message").val("vulcanPush");
  $(".form_small").click();
};
var selectTargetApp = function(appCode) {
  $("input[name=" + appCode.android + "]").prop("checked", true);
  $("input[name=" + appCode.ios + "]").prop("checked", true);
  $("#select-applications-ok").click();
};
var sendPush = function() {
  $("form").submit();
};
var pushUrl = function() {
  this.emit("url", this.getCurrentUrl());
};
var exitProcess = function(err) {
  logger.error(err);
  process.exit(1);
};

try {
  fs.statSync(config.messageCountFilePath);
  logger.warn("messageCount.logが消されていません");
} catch (err) {}
datasource.getMessageCount(config.sql.user_id, (err, result) => {
  if (err) {
    exitProcess(err);
  }
  fs.writeFileSync(config.messageCountFilePath, result[0]["count(*)"]);

  datasource.changeNotDisabled(config.sql.dummy_endpoint_id, err => {
    if (err) {
      exitProcess(err);
    }
    var currentUrls = [];
    var spooky = new Spooky(config.spooky, function(err) {
      if (err) {
        exitProcess(err);
      }
      spooky.start(
        `https://${config.console.host}${config.console.resource_path[0]}`
      );
      spooky.then(pushUrl);
      spooky.thenEvaluate(login, config.console.account);
      spooky.then(pushUrl);
      spooky.thenEvaluate(selectTeam);
      spooky.then(pushUrl);
      spooky.thenEvaluate(showCreateNotificationPage);
      spooky.then(pushUrl);
      spooky.thenEvaluate(inputTtileAndMessage);
      spooky.wait(parseInt(config.console.wait_time));
      spooky.thenEvaluate(selectTargetApp, config.console.app_code);
      spooky.wait(parseInt(config.console.wait_time));
      spooky.thenEvaluate(sendPush);
      spooky.then(pushUrl);
      spooky.then(function() {
        this.emit("done");
      });
      spooky.run();
    });

    spooky.on("url", url => {
      currentUrls.push(url);
    });

    spooky.on("done", () => {
      var assertUrls = [];
      for (var i = 0; i < currentUrls.length; i++) {
        assertUrls.push(
          `https://${config.console.host}${config.console.resource_path[i]}`
        );
      }
      try {
        assert.deepEqual(currentUrls, assertUrls);
        logger.info("pushSender succeed");
      } catch (e) {
        exitProcess(e);
      }
    });

    spooky.on("error", err => {
      exitProcess(err);
    });
  });
});
