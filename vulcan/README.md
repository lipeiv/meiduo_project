vulcan
===

稼動監視(プッシュ送信 + 障害検知)

## Description

### 正常稼働の定義

プッシュ送信を行ってから5分以内に、プッシュが正常に配信されていること。

### 正常配信の定義

1. プッシュ送信前後でメッセージ数が1つ増えている  
→ コンソールから正常にプッシュ送信が行えている/slingloadが正常に稼動している
* 送信したメッセージの状態がSENTになっている  
→ catapultが正常に稼働している
* 送信したメッセージに紐づくメッセージアクション数が2になっている  
→ catapultがGCM,APNsに対してリクエストを行っている

### 稼動監視の流れ

```
プッシュ送信 ⇒ 5分後 ⇒  送信結果判定 ⇒ プッシュ送信 ⇒ 5分後 ⇒ 送信結果判定...
```

#### プッシュ送信(pushSender.js)

nodeのSpookyJSモジュールを使用してプッシュ送信を行う。  
pushSender.jsの実行環境としてDockerコンテナを利用する。

**実行内容**

1. 監視用ユーザのメッセージ数を取得し、messageCount.logファイルにその数を記録する(これがプッシュ送信前のメッセージ数となる)
* プッシュ配信対象端末のdisabledフラグを0にする
* SpookyJSを使ってコンソールからプッシュ送信を行う
* SpookyJS上で正しく画面遷移が行われたかチェックする

#### 送信結果判定(pushResultChecker.js)

プッシュ送信前後のメッセージ数/送信したメッセージの状態/送信したメッセージに紐づくメッセージアクション数を取得し、正常にプッシュ配信が行われたか判定する。
pushResultChecker.jsの実行環境としてDockerコンテナを利用する。

**実行内容**

1. プッシュ送信前のメッセージ数をmessageCount.logから取得する
* プッシュ送信後のメッセージ数を取得する
* プッシュ送信前後のメッセージ数の差分が1になっているかチェックする（メッセージが作られたかチェックする)
* 送信したメッセージ、すなわち最新のメッセージ（送信者が監視用ユーザである）の状態を取得する
* 取得したメッセージの状態がSENTになっているかチェックする（正常にプッシュ配信処理が行われたかチェックする）
* 取得したメッセージに紐づくメッセージアクション数を取得する
* 取得したメッセージアクション数が2になっているかチェックする（正常にプッシュ配信処理が行われたかチェックする）
* messageCount.logファイルを削除する

## Requirement

- Docker
 - node: 6.2-slim
 - python: 2.7.9

## Usage

### Dockerコンテナの生成

create_container.shで、稼動監視で使用するDockerコンテナを作成する。
```
$ ./create_container.sh
```
正常に作成できた場合、以下のようにvaluepush/vulcanというコンテナが出来上がっている。
```
$ docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             VIRTUAL SIZE
valuepush/vulcan    latest              96ffcfe11516        18 hours ago        373.7 MB
node                6.2-slim            1136eb8dd387        4 weeks ago         210.4 MB
```

### スクリプトの実行

run_container.shで、pushSender.jsとpushResultChecker.jsをDockerコンテナ上で動かす。
```
$ ./run_container.sh [ログの出力レベル]
```
run_container.shは最初にpushResultChecker.jsを、次にpushSender.jsを実行するので、実際に稼動監視を行う場合はrun_container.shを5分ごとに実行すれば、上記に示した稼動監視の流れを実現できる。

**選択可能なログの出力レベル**
* FATAL
* ERROR
* WARN
* INFO
* DEBUG

引数に何も入力しない、または上記の出力レベル以外の文字列を引数に入力した場合はログの出力レベルはINFOに設定される。

**実行内容**

1. pushResultChecker.jsを実行する
* pushSendr.jsを実行する

**出力されるログ情報について**

1. 正常稼働
```
[2016-08-04 09:09:50.420] [INFO] pushResultChecker - Be working
```

2. プッシュ送信前後のメッセージ数の差分が不正
```
[2016-08-19 02:49:58.861] [ERROR] pushResultChecker - Error: プッシュ送信前後のメッセージ数の差が期待値と異なります： 期待値 = 1, 実際の値 = 0 (プッシュ送信前のメッセージ数 = 237581, プッシュ送信後のメッセージ数 = 237581)...
```

3. 送信したメッセージの状態が不正
```
[2016-08-19 02:50:44.641] [ERROR] pushResultChecker - Error: 送信したメッセージの状態が期待値と異なります: 期待値 = SENT, 実際の値 = TARGETED...
```

4. 送信したメッセージに紐づくメッセージアクションの数が不正
```
[2016-08-19 02:52:57.395] [ERROR] pushResultChecker - Error: 送信したメッセージに紐づくメッセージアクション数が期待値と異なります: 期待値 = 2, 実際の値 = 1...
```

5. SpookyJS上での画面遷移が失敗した
```
[2016-08-04 02:58:45.753] [ERROR] pushSender - { AssertionError: [ 'https://console.dev.flex.mobcon.jp/console/login',
  'https://console.dev.flex.mobcon.jp/console/group',
  'https://console.d deepEqual [ 'https://console.dev.flex.mobcon.jp/console/login',
  'https://console.dev.flex.mobcon.jp/console/group',
  'https://console.d...
```

6. RDSへの接続に失敗した
```
[2016-08-04 09:04:18.771] [ERROR] pushResultChecker - { Error: getaddrinfo ENOTFOUND tipushplatform.c7zahl5in3oa.ap-northeast-1.rds.amazonaws.com tipushplatform.c7zahl5in3oa.ap-northeast-1.rds.amazonaws.com:3306...
```
```
[2016-08-04 09:05:18.307] [ERROR] pushSender - { Error: connect ETIMEDOUT...
```
```
[2016-08-04 09:07:24.906] [ERROR] pushSender - { Error: ER_ACCESS_DENIED_ERROR: Access denied for user 'push'@'172.31.14.233' (using password: YES)...
```
```
[2016-08-04 09:08:53.831] [ERROR] pushSender - { Error: ER_BAD_DB_ERROR: Unknown database 'lingload'...
```

7. DBから取得した最新メッセージ（送信者が監視用ユーザである）の数が不正
```
[2016-08-19 02:48:40.087] [ERROR] pushResultChecker - Error: 取得した最新メッセージの件数が期待値と異なります: 期待値 = 1, 実際の値 = 0...
```

8. messageCount.logファイルを詠み込もうとしたが、messageCount.logファイルが存在しなかった
```
[ERROR] pushResultChecker - { Error: ENOENT: no such file or directory, open '/opt/logs/messageCount.log...'
```

9. messageCount.logファイルを削除しようとしたが、messageCount.logファイルが存在しなかった
```
[2016-08-22 04:14:31.531] [ERROR] pushResultChecker - { Error: ENOENT: no such file or directory, unlink '/opt/logs/messageCount.log'
```
