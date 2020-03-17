const config = require("config");
const log4js = require("log4js");
const Datasource = require("./Datasource");
const fs = require("fs");
const path = require("path");

const isKnownError = require("./lib/is-known-error");
const isKnownSandboxCertificateNotTrustedError = require("./lib/is-known-certificate-not-trasted-error");

const batchIPs = config.batch.public_ips;
const sshOpts = {
  username: config.batch.user_name,
  privateKey: path.join(__dirname, "ssh", "key.pem"),
};
const logsDir = config.batch.catapult.log_dir;

log4js.configure(config.log4js);
const logger = log4js.getLogger("pushResultChecker");
logger.setLevel(process.env.LOG_LEVEL);
const datasource = new Datasource(config.db);

const exitProcess = function(err) {
  logger.error(err);
  try {
    fs.statSync(config.messageCountFilePath);
    fs.unlinkSync(config.messageCountFilePath);
  } catch (err) {
  } finally {
    process.exit(1);
  }
};

const normalTermination = function() {
  logger.info("Be working");
  fs.unlink(config.messageCountFilePath, err => {
    if (err) {
      logger.error(err);
    }
  });
};

fs.readFile(config.messageCountFilePath, (err, text) => {
  if (err) {
    exitProcess(err);
  }
  datasource.getMessageCount(config.sql.user_id, (err, result) => {
    if (err) {
      exitProcess(err);
    }
    const beforeMessageCount = text;
    const afterMessageCount = result[0]["count(*)"];
    const messageCountDiff = afterMessageCount - beforeMessageCount;
    if (messageCountDiff !== 1) {
      exitProcess(
        new Error(
          `プッシュ送信前後のメッセージ数の差が期待値と違います： 期待値 = 1, 実際の値 = ${messageCountDiff} (プッシュ送信前のメッセージ数 = ${beforeMessageCount}, プッシュ送信後のメッセージ数 = ${afterMessageCount})`
        )
      );
    }
    datasource.getLatestMessage(config.sql.user_id, (err, result) => {
      if (err) {
        exitProcess(err);
      }
      if (result.length !== 1) {
        exitProcess(
          new Error(`取得した最新メッセージの件数が期待値と違います: 期待値 = 1, 実際の値 = ${result.length}`)
        );
      }
      
      const message = result[0];
      if (message.state !== "SENT") {
        if(message.state === "TARGETED"){
          const message_id = message.message_id
          isKnownSandboxCertificateNotTrustedError(batchIPs, sshOpts, logsDir, message_id)
          .then(result => {
            if (!result) {
              exitProcess(
                new Error(
                  `送信したメッセージの状態が期待値と違います: 期待値 = SENT, 実際の値 = ${message.state}`
                )
              );
            }
            logger.warn("knownError occered [certificate not trusted]");
            normalTermination();
          })
          .catch(error =>
            exitProcess(
              new Error(
                `送信したメッセージの状態が期待値と違います: 期待値 = SENT, 実際の値 = ${message.state}`
              )
            )
          );
        } else {
          exitProcess(
            new Error(
              `送信したメッセージの状態が期待値と違います: 期待値 = SENT, 実際の値 = ${message.state}`
            )
          );
        }
      } else {
        datasource.getMessageactionCount(
          config.sql.dummy_endpoint_id,
          result[0].message_id,
          (err, result) => {
            if (err) {
              exitProcess(err);
            }
            const messageactionCount = result[0]["count(*)"];
            if (messageactionCount !== 2) {
              const message_id = message.message_id
              // 既知エラーの場合は無視;
              isKnownError(batchIPs, sshOpts, logsDir, message_id)
                .then(result => {
                  if (!result) {
                    exitProcess(
                      new Error(
                        `送信したメッセージに紐づくメッセージアクション数が期待値と違います: 期待値 = 2, 実際の値 = ${messageactionCount}`
                      )
                    );
                  }
                  logger.warn("knownError occered [getaddrinfo ENOTFOUND]");
                  normalTermination();
                })
                .catch(error =>
                  exitProcess(
                    new Error(
                      `送信したメッセージに紐づくメッセージアクション数が期待値と違います: 期待値 = 2, 実際の値 = ${messageactionCount}\n${error}`
                    )
                  )
                );
            } else {
              normalTermination();
            }
          }
        );
      }
    });
  });
});
