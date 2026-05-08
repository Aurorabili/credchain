# CredChain 轻量索引器

## 架构

当前索引器已经从 Nuxt `apps/web` 中拆出，成为独立应用：

- 前端：`apps/web`
- 轻量索引器：`apps/indexer`
- 链上合约：`contracts`

这样做的目的很直接：

1. 前端保持纯客户端应用思路，不再承载后端职责。
2. 索引器拥有独立生命周期，能单独启动、重启、部署和排障。
3. 不再把 SQLite 和链同步逻辑绑在 Nuxt/Nitro 进程上。

## 为什么不继续放在 Nitro

如果项目不依赖 SSR，那么将索引器长期放在 `apps/web/server` 中会带来几个问题：

- 前端和索引器职责耦合
- Nuxt 构建与索引服务耦合
- 前端部署方式会反向约束索引器运行环境
- 本地数据库路径和服务日志都混在前端应用里

因此当前版本不再使用 Nitro 承载索引器本体。

## 前端如何接入

前端现在默认请求：

- `/api/indexer/credentials`
- `/api/indexer/credentials/:tokenId`
- `/api/indexer/stats`

开发环境下，Nuxt 使用 `nitro.devProxy` 将 `/api/indexer` 代理到独立索引器：

- `http://127.0.0.1:4100`

这样保留了前端调用体验上的统一入口，但索引器已经是独立进程。

生产环境下，前端可通过：

- `NUXT_PUBLIC_INDEXER_BASE_URL`

覆盖索引器地址。若部署层已做反向代理，也可以继续保留 `/api/indexer`。

## 当前索引器职责

索引器当前监听并处理：

- `CredentialMinted`
- `CredentialRevoked`
- `Voted`

同步方式：

1. 读取本地 `last_synced_block`
2. 分块拉取事件日志
3. 找出受影响的 `tokenId`
4. 使用 `multicall` 刷新最新快照
5. 写入本地 SQLite

## 数据存储

默认数据库路径：

- `apps/indexer/.data/credchain-indexer.sqlite`

可通过环境变量覆盖：

- `CREDCHAIN_INDEXER_DB`

此外，索引器会额外记录：

- `chain_genesis_hash`
- `chain_id`
- `last_synced_block`

这样在本地 Hardhat 链重启后，索引器会自动识别链已重建，并清空旧索引重新同步，避免脏数据残留。

## API 边界

索引器负责：

- 列表页查询
- 某钱包持有的证书列表
- 证书数量统计

前端仍然直接回链负责：

- 单个证书详情的关键真值读取
- 钱包签名与链上交易

这意味着：

- 列表、筛选、统计交给索引器
- 真值读取和写操作仍然以链上为准

## 当前运行方式

根目录开发命令现在会同时启动：

- `apps/indexer`
- `apps/web`

相关命令：

- `pnpm dev`
- `pnpm dev:web`
- `pnpm dev:indexer`

本地联调时，仍需单独启动链与部署合约：

- `pnpm chain`
- `pnpm deploy:contracts`
