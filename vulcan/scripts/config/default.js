module.exports = {
  spooky: {
    child: {
      transport: "http",
    },
    casper: {
      logLevel: "debug",
      verbose: true,
    },
  },
  console: {
    host: "<コンソールのドメイン>",
    resource_path: [
      "/console/login",
      "/console/group",
      "/console/index",
      "/console/create_notification",
      "/console/create_notification/done",
    ],
    account: {
      mail_address: "<アカウントのメールアドレス>",
      password: "<アカウントのパスワード>",
    },
    app_code: {
      android: "corona_android",
      ios: "corona_ios2",
    },
    wait_time: "5000",
  },
  batch: {
    public_ips: ["<batchサーバーのパブリックIP>"],
    user_name: "<SSHのユーザ名>",
    catapult: {
      log_dir: "<catapultのlogディレクトリへのパス>",
    },
  },
  db: {
    host: "<ホスト>",
    port: "3306",
    user: "<ユーザ>",
    password: "<パスワード>",
    database: "<DB名>",
  },
  sql: {
    user_id: "<ユーザID>",
    dummy_endpoint_id: {
      android: "<Androidダミー端末のエンドポイントID>",
      ios: "<iOSダミー端末のエンドポイントID>",
    },
  },
  log4js: {
    appenders: [
      {
        type: "dateFile",
        category: "pushSender",
        filename: "/opt/logs/vulcan.log",
        pattern: ".yyyyMMdd",
      },
      {
        type: "dateFile",
        category: "pushResultChecker",
        filename: "/opt/logs/vulcan.log",
        pattern: ".yyyyMMdd",
      },
    ],
  },
  messageCountFilePath: "/opt/logs/messageCount.log",
};
