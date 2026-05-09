# CredChain 关键符号表与数据流说明

## 1. 文档目的

本文档用于提取当前代码库中前端、索引器、智能合约三个层面的关键符号，并对系统中的主要数据流方向进行文字化描述。该文档适合作为毕业论文中“模块说明”“关键接口说明”“数据流设计”章节的基础材料。

## 2. 前端模块关键符号表

### 2.1 链上读写适配模块 `apps/web/composables/useViem.ts`

| 符号 | 类型 | 说明 |
| --- | --- | --- |
| `chain` | 常量 | 前端使用的 Viem 链配置，基于 Hardhat 网络扩展 |
| `credentialSbtAddress` | 常量 | SBT 合约地址 |
| `reputationCoreAddress` | 常量 | 信誉合约地址 |
| `CredentialDetailSnapshot` | 接口 | 单个证书的链上快照结构 |
| `connectWallet()` | 函数 | 连接浏览器钱包并返回账户与 `walletClient` |
| `getPublicClient()` | 函数 | 返回 Viem 公共客户端 |
| `getCredentialDetail()` | 函数 | 通过 multicall 批量读取单个证书的链上状态 |
| `getReputation()` | 函数 | 读取账户声誉 |
| `getWeight()` | 函数 | 读取账户投票权重 |
| `vote()` | 函数 | 调用合约提交投票交易 |
| `mintCredential()` | 函数 | 调用合约铸造证书 |
| `revokeCredential()` | 函数 | 调用合约吊销证书 |
| `waitForTx()` | 函数 | 等待交易回执 |

### 2.2 前端领域聚合模块 `apps/web/composables/useChain.ts`

| 符号 | 类型 | 说明 |
| --- | --- | --- |
| `ChainCredential` | 接口 | 前端证书详情的统一视图模型 |
| `ChainStats` | 接口 | 当前账户摘要信息模型 |
| `ChainAccountProfile` | 接口 | 账户详情页视图模型 |
| `computeDisplayMetrics()` | 函数 | 根据链上统计量计算展示分、星级和自然语言标签 |
| `buildFallbackCredential()` | 函数 | 根据链上基础字段构造最小证书视图模型 |
| `fetchCredentialMetadata()` | 函数 | 按 `metadataCID/tokenURI` 获取业务元数据 |
| `enrichCredentialWithMetadata()` | 函数 | 将链上证书对象与链下元数据合并 |
| `fetchIndexedCredentials()` | 函数 | 调用索引器获取某账户的证书列表 |
| `fetchIndexedCredentialCount()` | 函数 | 调用索引器获取某账户证书数 |
| `connect()` | 函数 | 连接钱包并缓存账户 |
| `init()` | 函数 | 启动时恢复缓存的钱包连接 |
| `getStats()` | 函数 | 获取账户声誉、KYC、权重、证书数量 |
| `getCredential()` | 函数 | 获取单张证书详情 |
| `getCredentials()` | 函数 | 获取某账户持有的全部证书 |
| `getAccountProfile()` | 函数 | 获取账户详情页所需聚合数据 |
| `vote()` | 函数 | 提交投票并清理本地缓存 |
| `mint()` | 函数 | 铸造证书并清理本地缓存 |
| `revoke()` | 函数 | 吊销证书并清理本地缓存 |

### 2.3 元数据与本地存储模块

#### `apps/web/utils/credentialMetadata.ts`

| 符号 | 类型 | 说明 |
| --- | --- | --- |
| `CredentialBusinessField` | 接口 | 用户自定义业务字段 |
| `CredentialEvidenceReference` | 接口 | 附件的逻辑引用结构 |
| `CredentialEvidenceAsset` | 接口 | 附件的前端可访问结构，增加 `url` |
| `CredentialMetadataDocument` | 接口 | 证书元数据文档结构 |
| `inferEvidenceKind()` | 函数 | 根据 MIME 类型推断附件类别 |

#### `apps/web/utils/ipfs.ts`

| 符号 | 类型 | 说明 |
| --- | --- | --- |
| `putMetadata()` | 函数 | 通过 Kubo RPC 上传元数据文档并返回真实 CID |
| `getMetadata()` | 函数 | 通过本地 Gateway 读取元数据文档 |
| `putFile()` | 函数 | 通过 Kubo RPC 上传附件并返回附件引用 |
| `toGatewayUrl()` | 函数 | 将 CID 或 `ipfs://` URI 转为可访问的 Gateway 地址 |

#### `apps/web/composables/useAddressBook.ts`

| 符号 | 类型 | 说明 |
| --- | --- | --- |
| `_names` | 响应式状态 | 地址到友好名称的映射 |
| `getFriendlyName()` | 函数 | 获取某地址已保存的名称 |
| `setFriendlyName()` | 函数 | 更新或清除某地址的名称 |
| `getDisplayName()` | 函数 | 优先返回友好名称，否则返回短地址 |
| `resolveAddress()` | 函数 | 对输入进行地址格式解析 |

### 2.4 页面与组件关键符号

| 模块 | 关键符号 | 说明 |
| --- | --- | --- |
| `pages/index.vue` | `stats`, `search`, `goSearch()` | 仪表盘数据与统一搜索入口 |
| `pages/mint.vue` | `title`, `businessType`, `businessFields`, `submit()` | 铸造页面表单状态与提交逻辑 |
| `pages/credentials/index.vue` | `credentials`, `load()` | 当前账户证书列表 |
| `pages/credentials/[id].vue` | `credential`, `onVoted()`, `onRevoke()` | 单证书详情、投票、吊销 |
| `pages/accounts/[address].vue` | `profile` | 账户详情模型 |
| `components/VoteButton.vue` | `requestVote()`, `cast()` | 投票确认与提交 |
| `components/ConfirmDialog.vue` | `open`, `confirm`, `cancel` | 页面内确认对话框 |
| `components/CredentialRow.vue` | `credential` | 列表项展示 |
| `components/EditableAccountName.vue` | `address`, `kycVerified` | 账户友好名称编辑入口 |

## 3. 索引器模块关键符号表

### 3.1 配置模块 `apps/indexer/src/config.mjs`

| 符号 | 类型 | 说明 |
| --- | --- | --- |
| `config.host` | 配置项 | HTTP 服务监听地址 |
| `config.port` | 配置项 | HTTP 服务端口 |
| `config.rpcUrl` | 配置项 | 链 RPC 地址 |
| `config.chainId` | 配置项 | 链 ID |
| `config.credentialSbtAddress` | 配置项 | SBT 合约地址 |
| `config.reputationCoreAddress` | 配置项 | 声誉合约地址 |
| `config.dbPath` | 配置项 | SQLite 文件路径 |
| `config.syncChunkSize` | 配置项 | 每次同步的区块跨度 |
| `config.syncIntervalMs` | 配置项 | 定时同步周期 |

### 3.2 数据库模块 `apps/indexer/src/db.mjs`

| 符号 | 类型 | 说明 |
| --- | --- | --- |
| `getDb()` | 函数 | 获取或初始化 SQLite 实例 |
| `getSyncValue()` | 函数 | 读取同步状态键值 |
| `setSyncValue()` | 函数 | 写入同步状态键值 |
| `getLastSyncedBlock()` | 函数 | 获取最近同步区块号 |
| `setLastSyncedBlock()` | 函数 | 更新最近同步区块号 |
| `clearIndexerState()` | 函数 | 清空索引器数据与同步状态 |
| `upsertCredentialSnapshot()` | 函数 | 按 token 快照更新证书表 |
| `markCredentialRevoked()` | 函数 | 标记凭证为已吊销 |
| `listCredentials()` | 函数 | 按账户或全局列出凭证 |
| `getCredential()` | 函数 | 读取单个凭证 |
| `getCredentialCount()` | 函数 | 获取凭证计数 |

### 3.3 同步模块 `apps/indexer/src/indexer.mjs`

| 符号 | 类型 | 说明 |
| --- | --- | --- |
| `mintedEvent` | 事件描述 | `CredentialMinted` 日志解析规则 |
| `revokedEvent` | 事件描述 | `CredentialRevoked` 日志解析规则 |
| `votedEvent` | 事件描述 | `Voted` 日志解析规则 |
| `ensureChainFingerprint()` | 函数 | 检测链是否被重置，必要时清空本地索引 |
| `refreshSnapshots()` | 函数 | 对受影响的 token 批量刷新链上快照 |
| `syncChunk()` | 函数 | 同步一个区块区间内的事件 |
| `doSync()` | 函数 | 完成从上次同步点到最新块的全量补同步 |
| `syncIndexer()` | 函数 | 对外暴露的幂等同步入口 |
| `startIndexerScheduler()` | 函数 | 启动周期性同步调度器 |
| `listIndexedCredentials()` | 函数 | 对前端暴露按账户查询的入口 |
| `getIndexerStatus()` | 函数 | 返回同步状态与运行信息 |

### 3.4 API 模块 `apps/indexer/src/server.mjs`

| 符号 | 类型 | 说明 |
| --- | --- | --- |
| `sendJson()` | 函数 | 统一响应 JSON |
| `notFound()` | 函数 | 统一 404 处理 |
| `/api/indexer/health` | 路由 | 返回索引器状态 |
| `/api/indexer/credentials` | 路由 | 按账户列出证书 |
| `/api/indexer/credentials/:tokenId` | 路由 | 获取单证书索引记录 |
| `/api/indexer/stats` | 路由 | 获取证书数量统计 |

## 4. 智能合约模块关键符号表

### 4.1 `contracts/contracts/CredentialSBT.sol`

| 符号 | 类型 | 说明 |
| --- | --- | --- |
| `MINTER_ROLE` | 常量 | 铸造权限角色 |
| `REVOKER_ROLE` | 常量 | 管理吊销权限角色 |
| `_nextTokenId` | 状态变量 | 自增 tokenId 计数器 |
| `_businessTypes` | 映射 | tokenId 到业务类型 |
| `_metadataCIDs` | 映射 | tokenId 到元数据 CID |
| `_revoked` | 映射 | tokenId 到吊销状态 |
| `mintCredential()` | 函数 | 铸造凭证 SBT |
| `revokeCredential()` | 函数 | 吊销凭证，允许持有人或吊销角色执行 |
| `exists()` | 函数 | 判断 token 是否存在 |
| `businessType()` | 函数 | 读取业务类型 |
| `metadataCID()` | 函数 | 读取元数据 CID |
| `isRevoked()` | 函数 | 读取吊销状态 |
| `tokenURI()` | 函数 | 返回 `ipfs://` 风格 URI |
| `_update()` | 内部函数 | 禁止 token 转移，实现 soulbound 语义 |
| `CredentialMinted` | 事件 | 证书铸造事件 |
| `CredentialRevoked` | 事件 | 证书吊销事件 |

### 4.2 `contracts/contracts/ReputationCore.sol`

| 符号 | 类型 | 说明 |
| --- | --- | --- |
| `ALPHA` | 不变量 | 单次投票分值增量的放大系数 |
| `S_MIN` / `S_MAX` | 不变量 | 单证书评分上下界 |
| `W_MAX` | 不变量 | 投票权重上限 |
| `K` / `C_PHI` | 不变量 | `phi` 函数斜率与上界 |
| `_scores` | 映射 | tokenId 到当前链上评分 |
| `_rawVoteSums` | 映射 | tokenId 到未截断的累计投票和 |
| `_weightSums` | 映射 | tokenId 到累计投票权重和 |
| `_voteCounts` | 映射 | tokenId 到唯一投票人数 |
| `_hasVoted` | 二级映射 | tokenId / address 到是否已投票 |
| `_reputations` | 映射 | address 到账户信誉值 |
| `_kycVerified` | 映射 | address 到 KYC 状态 |
| `vote()` | 函数 | 执行投票，并更新证书评分和持有人声誉 |
| `setKYC()` | 函数 | 更新账户 KYC 状态 |
| `phi()` | 函数 | 将分数映射为声誉贡献 |
| `getScore()` | 函数 | 读取 token 当前评分 |
| `getRawVoteSum()` | 函数 | 读取 token 原始投票累计值 |
| `getWeightSum()` | 函数 | 读取 token 权重累计值 |
| `getVoteCount()` | 函数 | 读取 token 投票人数 |
| `hasVoted()` | 函数 | 查询地址是否已对 token 投票 |
| `getReputation()` | 函数 | 查询账户声誉 |
| `getWeight()` | 函数 | 查询账户投票权重 |
| `_weightOf()` | 内部函数 | 基于账户声誉计算投票权重 |
| `_clamp()` | 内部函数 | 截断分数到上下界 |
| `Voted` | 事件 | 投票事件 |
| `KYCUpdated` | 事件 | KYC 状态更新事件 |

### 4.3 接口与部署脚本

| 模块 | 关键符号 | 说明 |
| --- | --- | --- |
| `ICredentialSBT.sol` | `CredentialMinted`, `CredentialRevoked`, `mintCredential`, `revokeCredential` | 凭证合约外部接口描述 |
| `IReputationCore.sol` | `Voted`, `KYCUpdated`, `vote`, `phi`, `getReputation` 等 | 声誉合约外部接口描述 |
| `deploy.ts` | `ALPHA`, `S_MIN`, `S_MAX`, `W_MAX`, `K`, `C_PHI` | 本地部署时的系统参数与样例数据初始化入口 |

## 5. 关键数据流说明

### 5.1 启动与初始化数据流

1. 开发者启动本地链与部署脚本。  
2. 合约被部署，产生 SBT、声誉合约与 Multicall 合约地址。  
3. ABI 被同步到前端。  
4. 索引器启动后根据配置连接链 RPC。  
5. 索引器先校验链指纹，再从区块日志重建本地 SQLite 数据。  
6. 前端启动后连接钱包，并通过索引器与链上接口获取页面初始状态。  

数据流方向为：

`Hardhat Node -> Deploy Script -> Contracts -> ABI Sync -> Web / Indexer`

### 5.2 铸造证书数据流

1. 用户在 `mint` 页面填写标题、签发方、业务类型、描述、自定义业务字段、佐证材料。  
2. 前端先把附件上传到本地 Kubo 节点，返回真实附件 CID。  
3. 前端组装 `CredentialMetadataDocument`，再将完整元数据上传到本地 Kubo 节点，得到 `metadataCID`。  
4. 前端通过 `useChain.mint()` 调用 `useViem.mintCredential()`。  
5. `CredentialSBT` 在链上铸造新 token，并发出 `CredentialMinted` 事件。  
6. 索引器监听到 `CredentialMinted` 后，将该 token 写入 SQLite。  
7. 前端后续通过索引器读取该证书列表，通过元数据补全业务字段和附件展示。  

数据流方向为：

`Mint Form -> Kubo RPC API -> metadataCID -> CredentialSBT.mintCredential -> CredentialMinted Event -> Indexer -> SQLite -> Frontend List/Detail`

### 5.3 证书列表查询数据流

1. 用户进入“我的证书”页面。  
2. 前端通过 `useChain.getCredentials()` 调用索引器 `/api/indexer/credentials?owner=...`。  
3. 索引器从 SQLite 返回该账户下的证书基础快照。  
4. 前端把快照转为 `ChainCredential`。  
5. 前端再根据 `metadataCID/tokenURI` 获取元数据，补齐名称、描述、附件等信息。  
6. 前端按展示信誉分排序后渲染列表。  

数据流方向为：

`Account Address -> Indexer API -> SQLite Snapshot -> useChain -> Metadata Fetch -> CredentialRow`

### 5.4 单证书详情数据流

1. 用户进入 `/credentials/:id`。  
2. 前端直接调用 `getCredentialDetail()`，以 multicall 方式从链上读取该 token 的核心真值。  
3. 前端再请求元数据文件，补齐业务逻辑信息。  
4. 详情页将链上字段、业务字段、附件列表聚合展示。  

数据流方向为：

`Token ID -> useViem.getCredentialDetail -> Contracts -> useChain.enrichCredentialWithMetadata -> Detail View`

### 5.5 投票数据流

1. 用户在详情页点击投票按钮。  
2. 页面内 MD3 对话框要求用户确认。  
3. 前端调用 `useChain.vote()`，再调用 `ReputationCore.vote()`。  
4. 合约检查：
   - 投票方向是否合法  
   - 投票人是否通过 KYC  
   - token 是否存在  
   - token 是否已吊销  
   - 是否已投过票  
   - 是否在给自己的证书投票  
5. 检查通过后，合约更新 `_scores`、`_rawVoteSums`、`_weightSums`、`_voteCounts`、`_hasVoted`、`_reputations`。  
6. 合约发出 `Voted` 事件。  
7. 索引器监听事件，刷新受影响证书快照。  
8. 前端等待交易回执后，重新拉取该证书详情。  

数据流方向为：

`Vote Button -> ConfirmDialog -> ReputationCore.vote -> Voted Event -> Indexer Refresh -> Frontend Reload`

### 5.6 吊销证书数据流

1. 当前持有人在详情页点击吊销按钮。  
2. 页面内确认弹层提示“吊销后不可恢复”。  
3. 前端调用 `useChain.revoke()`，再调用 `CredentialSBT.revokeCredential()`。  
4. 合约检查调用方是否为持有人或具备吊销角色。  
5. 合约将 `_revoked[tokenId]` 置为 `true`，发出 `CredentialRevoked`。  
6. 索引器监听该事件，并将 SQLite 中的该记录标记为已吊销。  
7. 前端等待交易回执后重新拉取详情，界面进入“已吊销”状态。  

数据流方向为：

`Revoke Button -> ConfirmDialog -> CredentialSBT.revokeCredential -> CredentialRevoked Event -> Indexer Mark Revoked -> Frontend Reload`

### 5.7 账户详情查询数据流

1. 用户输入一个账户地址或从证书详情点击持有人。  
2. 前端进入账户详情页，调用 `useChain.getAccountProfile(address)`。  
3. `getAccountProfile()` 同时请求：
   - 链上的 `getReputation/getWeight/isKYCVerified`
   - 索引器的证书数量与证书列表  
4. 前端聚合为 `ChainAccountProfile` 后渲染。  

数据流方向为：

`Address -> useChain.getAccountProfile -> Contracts + Indexer -> ChainAccountProfile -> Account View`

## 6. 数据流特点总结

当前系统的数据流具有以下特点：

1. 写操作全部以链上为真值入口。  
2. 列表与统计查询优先走索引器。  
3. 单证书关键状态优先走链上 multicall。  
4. 业务字段与附件信息通过元数据文件补齐。  
5. 索引器是链上事件驱动的只读副本，而不是业务真值来源。  

因此，CredChain 的结构可以概括为：

`链上真值负责写，索引器负责查，前端负责聚合与表达。`
