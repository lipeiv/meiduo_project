const co = require("co");
const SSH = require("node-ssh");
const flatten = require("lodash.flatten");
const config = require("config");
const Datasource = require("../Datasource");

/**
 * 既知エラーか判断する
 * @param  {[type]} batchIPs   バッチサーバのIPリスト
 * @param  {[type]} sshOptions {username, privateKey}
 * @param  {[type]} logsDir    consumer.logが配置されているパス
 * @param  {[type]} message_id エラーが起きているメッセージID
 * @return {Promise<Boolean>}  既知エラーかどうか
 */
module.exports = (batchIPs, sshOptions, logsDir, message_id) => {
  return co(function*() {
    const isKnownError = yield [
      isKnownErrorForConsumerLog(batchIPs, sshOptions, logsDir, message_id),
      isKnownErrorForMessageRock(message_id),
    ];

    // チェック内容が全てtrueなら（falseが存在しないなら）
    // 既知エラー扱い
    return !isKnownError.includes(false);
  });
};

function* isKnownErrorForMessageRock(message_id) {
  const datasource = new Datasource(config.db);
  const result = yield datasource.getMessagerocks(message_id);
  //messagerockの数が2つ未満であるのはおかしいので既知エラーじゃない扱いにする
  if (result.length < 2) {
    return false;
  }
  const APNsRocks = result.filter(
    rock => rock.endpoint_ids === config.sql.dummy_endpoint_id.ios
  );
  const FCMRocks = result.filter(
    rock => rock.endpoint_ids === config.sql.dummy_endpoint_id.android
  );
  return APNsRocks[0].state === "ERROR" && FCMRocks[0].state === "SENT";
}

function* isKnownErrorForConsumerLog(ipList, sshOptions, logsDir, message_id) {
  const result = yield ipList.map(ip =>
    getErrorLog(ip, sshOptions.username, sshOptions.privateKey, logsDir)
  );
  const consumerLogs = flatten(result).sort();

  const regex = new RegExp(`.*MSG:${message_id}.*`);
  const errorLog = consumerLogs.filter(log => log.match(regex));

  // ログがないのもおかしいので
  // 既知エラーじゃない扱い
  if (errorLog.length <= 0) {
    return false;
  }

  errorLog.forEach(l => {
    if (!l.match(/.*getaddrinfo ENOTFOUND.*/)) {
      return false;
    }
  });

  return true;
}

function* getErrorLog(host, username, privateKey, logsDir) {
  const ssh = new SSH();
  yield ssh.connect({
    host,
    username,
    privateKey,
    port: 22,
  });

  const result = yield ssh.execCommand(
    `cat ${logsDir}/consumer.*.log | grep ERROR | sort`
  );
  ssh.dispose();
  return result.stdout.split("\n");
}
