# CredChain 数据模型设计

## 1. 文档目的

本文档整理 CredChain 当前实现中的核心数据模型，包括：

1. 前端视图模型  
2. 索引器数据模型  
3. SQLite 数据库模型  
4. 链上智能合约数据模型  
5. “凭证”这一抽象实体的综合数据模型  

该文档适合作为毕业论文中“数据结构设计”或“领域模型设计”章节的基础材料。

## 2. 前端视图模型

前端的数据模型并不是链上结构的简单映射，而是“链上状态 + 索引结果 + 元数据 + 派生展示字段”的聚合结果。

### 2.1 `ChainCredentialAttribute`

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `label` | `string` | 属性显示名称 |
| `value` | `string` | 属性显示值 |

该模型用于将不同来源的字段统一渲染为详情页属性列表。

### 2.2 `ChainCredential`

`ChainCredential` 是前端最核心的证书视图模型，定义于 `apps/web/composables/useChain.ts`。

#### 2.2.1 链上基础字段

| 字段 | 类型 | 来源 | 含义 |
| --- | --- | --- | --- |
| `tokenId` | `number` | 链上 | SBT 编号 |
| `owner` | `` `0x${string}` `` | 链上 | 持有人地址 |
| `businessType` | `string` | 链上 | 业务分类 |
| `metadataCID` | `string` | 链上 | 元数据内容标识 |
| `tokenUri` | `string` | 链上 | `ipfs://...` 风格 URI |
| `score` | `number` | 链上 | 当前链上评分 |
| `rawVoteSum` | `number` | 链上 | 未截断的累计投票和 |
| `weightSum` | `number` | 链上 | 累计投票权重和 |
| `voteCount` | `number` | 链上 | 已投票人数 |
| `ownerReputation` | `number` | 链上 | 持有人当前声誉 |
| `isRevoked` | `boolean` | 链上 | 证书是否已吊销 |
| `isLocked` | `boolean` | 链上 | 是否为 soulbound 状态 |
| `hasCurrentUserVoted` | `boolean` | 链上 | 当前连接钱包是否已投票 |

#### 2.2.2 元数据业务字段

| 字段 | 类型 | 来源 | 含义 |
| --- | --- | --- | --- |
| `displayType` | `"certificate"` | 元数据/约定 | 统一展示类型 |
| `issuerName` | `string` | 元数据 | 签发方名称 |
| `recipientWallet` | `` `0x${string}` `` | 元数据 | 接收人钱包地址 |
| `name` | `string` | 元数据 | 证书标题 |
| `description` | `string` | 元数据 | 业务描述 |
| `image` | `string` | 元数据/附件 | 主预览图 |
| `issuedAt` | `string` | 元数据 | 签发时间 |
| `businessFields` | `CredentialBusinessField[]` | 元数据 | 自定义业务字段 |
| `evidence` | `CredentialEvidenceAsset[]` | 元数据 | 佐证材料列表 |

#### 2.2.3 派生展示字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `metadataUrl` | `string` | 元数据可访问 URL |
| `baseDisplayScore` | `number` | 根据加权均值换算得到的基础展示分 |
| `displayScore` | `number` | 平滑后的展示分 |
| `displayStars` | `number` | 五分制评分 |
| `displayLabel` | `string` | 自然语言信誉标签 |
| `attributes` | `ChainCredentialAttribute[]` | 详情页统一展示属性列表 |

因此，`ChainCredential` 可以看作是前端对“凭证”这一实体的完整视图投影。

### 2.3 `ChainStats`

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `reputation` | `number` | 当前账户声誉值 |
| `credentialCount` | `number` | 当前账户持有的证书数量 |
| `votingWeight` | `number` | 当前账户投票权重 |
| `kycVerified` | `boolean` | 当前账户是否通过 KYC |

### 2.4 `ChainAccountProfile`

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `address` | `` `0x${string}` `` | 账户地址 |
| `reputation` | `number` | 账户声誉 |
| `credentialCount` | `number` | 持有证书数量 |
| `kycVerified` | `boolean` | 是否 KYC |
| `credentials` | `ChainCredential[]` | 持有证书列表 |

## 3. 元数据与业务逻辑模型

### 3.1 `CredentialBusinessField`

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `name` | `string` | 字段名 |
| `value` | `string` | 字段值 |
| `type` | `"text"` | 当前实现中的字段类型 |

### 3.2 `CredentialEvidenceReference`

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `cid` | `string` | 附件内容标识 |
| `kind` | `"image" \| "document" \| "file"` | 附件逻辑类型 |
| `name` | `string` | 文件名 |
| `mimeType` | `string` | MIME 类型 |
| `size` | `number` | 文件大小 |

### 3.3 `CredentialEvidenceAsset`

该模型在 `CredentialEvidenceReference` 基础上增加前端可直接访问的 URL。

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `url` | `string` | 文件或图片的可访问地址 |

### 3.4 `CredentialMetadataDocument`

这是业务逻辑层最重要的链下元数据结构。

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `version` | `"1.0"` | 元数据版本 |
| `displayType` | `"certificate"` | 统一展示类型 |
| `businessType` | `string` | 业务分类 |
| `title` | `string` | 标题 |
| `description` | `string` | 描述 |
| `issuer.name` | `string` | 签发方名称 |
| `issuer.address` | `` `0x${string}` `` | 签发方钱包地址 |
| `recipient.wallet` | `` `0x${string}` `` | 接收人钱包地址 |
| `issuedAt` | `string` | 签发时间 |
| `fields` | `CredentialBusinessField[]` | 自定义业务字段 |
| `evidence` | `CredentialEvidenceReference[]` | 佐证材料引用列表 |

该文档是业务逻辑层对证书内容的主要承载者。

## 4. 索引器数据模型

索引器的数据模型偏向“链上快照副本”，不负责保存完整业务元数据文档。

### 4.1 凭证快照模型

索引器在运行过程中使用的快照对象大致具有如下字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `tokenId` | `number` | 凭证 ID |
| `owner` | `string` | 持有人地址 |
| `businessType` | `string` | 业务分类 |
| `metadataCID` | `string` | 元数据 CID |
| `isRevoked` | `boolean` | 是否已吊销 |
| `score` | `number` | 当前链上评分 |
| `rawVoteSum` | `number` | 原始投票累计值 |
| `weightSum` | `number` | 投票权重和 |
| `voteCount` | `number` | 投票人数 |
| `mintedAt` | `string \| null` | 铸造时间 |
| `mintedBlock` | `number \| null` | 铸造区块 |
| `updatedAt` | `string \| null` | 最近更新时间 |
| `updatedBlock` | `number \| null` | 最近更新区块 |

### 4.2 索引器状态模型

索引器还维护一组运行状态：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `lastSyncedBlock` | `bigint` | 最近同步到的区块号 |
| `chain_genesis_hash` | `string` | 当前链创世块哈希 |
| `chain_id` | `string` | 当前链 ID |

该模型用于保证：

- 本地链重置后自动清空旧索引  
- 索引器可恢复同步位置  

## 5. SQLite 数据库模型

当前轻量索引器只使用两张表。

### 5.1 `credentials` 表

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `token_id` | `INTEGER PRIMARY KEY` | 凭证主键 |
| `owner` | `TEXT` | 持有人地址 |
| `business_type` | `TEXT` | 业务分类 |
| `metadata_cid` | `TEXT` | 元数据 CID |
| `revoked` | `INTEGER` | 是否吊销，0/1 |
| `score` | `INTEGER` | 链上评分 |
| `raw_vote_sum` | `INTEGER` | 原始投票累计值 |
| `weight_sum` | `INTEGER` | 投票权重和 |
| `vote_count` | `INTEGER` | 投票人数 |
| `minted_at` | `TEXT` | 铸造时间 |
| `minted_block` | `INTEGER` | 铸造区块 |
| `updated_at` | `TEXT` | 最近更新时间 |
| `updated_block` | `INTEGER` | 最近更新区块 |

索引：

- `idx_credentials_owner`
- `idx_credentials_business_type`

### 5.2 `sync_state` 表

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `key` | `TEXT PRIMARY KEY` | 状态键 |
| `value` | `TEXT` | 状态值 |

目前主要保存：

- `last_synced_block`
- `chain_genesis_hash`
- `chain_id`

## 6. 链上智能合约数据模型

## 6.1 `CredentialSBT` 合约数据模型

### 6.1.1 状态变量

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `_nextTokenId` | `uint256` | 自增 tokenId 计数器 |
| `_businessTypes` | `mapping(uint256 => string)` | 凭证业务类型 |
| `_metadataCIDs` | `mapping(uint256 => string)` | 凭证元数据 CID |
| `_revoked` | `mapping(uint256 => bool)` | 凭证是否已吊销 |

### 6.1.2 角色模型

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `MINTER_ROLE` | `bytes32` | 铸造权限 |
| `REVOKER_ROLE` | `bytes32` | 管理吊销权限 |

### 6.1.3 行为模型

`CredentialSBT` 提供的行为围绕“发行、吊销、查询”展开：

- 铸造证书
- 吊销证书
- 查询业务类型
- 查询元数据 CID
- 查询是否已吊销
- 禁止转移

因此，该模型描述的是“链上证书标识层”。

## 6.2 `ReputationCore` 合约数据模型

### 6.2.1 系统参数

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `ALPHA` | `int256` | 单次投票增量系数 |
| `S_MIN` | `int256` | 分数最小值 |
| `S_MAX` | `int256` | 分数最大值 |
| `W_MAX` | `uint256` | 投票权重上限 |
| `K` | `uint256` | `phi` 斜率参数 |
| `C_PHI` | `int256` | `phi` 上限参数 |

### 6.2.2 核心状态

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `_scores` | `mapping(uint256 => int256)` | 每张证书的链上评分 |
| `_rawVoteSums` | `mapping(uint256 => int256)` | 未截断累计投票值 |
| `_weightSums` | `mapping(uint256 => uint256)` | 权重累计和 |
| `_voteCounts` | `mapping(uint256 => uint256)` | 已投票人数 |
| `_hasVoted` | `mapping(uint256 => mapping(address => bool))` | 某地址是否已对某证书投票 |
| `_reputations` | `mapping(address => int256)` | 账户当前声誉 |
| `_kycVerified` | `mapping(address => bool)` | 账户 KYC 状态 |

### 6.2.3 逻辑含义

该模型的核心是：

- 证书是被评价对象  
- 账户是声誉承载对象  
- 投票会同时影响证书分数与持有人声誉  
- 声誉又会反向影响未来投票权重  

因此，`ReputationCore` 描述的是“链上信誉传播层”。

## 7. 凭证这一抽象实体的数据模型

从系统整体视角看，“凭证”并不是单一结构，而是由多层数据模型组合得到的复合实体。

可以将其抽象为四层：

### 7.1 链上身份层

该层用于回答“这张证书在链上是谁、是否有效、当前评分如何”。

| 字段 | 含义 |
| --- | --- |
| `tokenId` | 链上唯一标识 |
| `owner` | 持有人地址 |
| `businessType` | 业务分类 |
| `metadataCID` | 元数据定位符 |
| `isRevoked` | 是否已吊销 |
| `isLocked` | 是否不可转移 |

### 7.2 链上评价层

该层用于回答“这张证书在链上得到了怎样的评价”。

| 字段 | 含义 |
| --- | --- |
| `score` | 当前链上评分 |
| `rawVoteSum` | 原始投票累计值 |
| `weightSum` | 投票权重累计值 |
| `voteCount` | 投票人数 |
| `hasCurrentUserVoted` | 当前用户是否已投票 |

### 7.3 业务逻辑层

该层用于回答“这张证书表达的现实世界业务内容是什么”。

| 字段 | 含义 |
| --- | --- |
| `title` / `name` | 证书标题 |
| `description` | 证书说明 |
| `issuer` | 签发方 |
| `recipient` | 接收方 |
| `issuedAt` | 签发时间 |
| `fields[]` | 自定义业务字段 |
| `evidence[]` | 佐证材料 |

### 7.4 展示派生层

该层用于回答“这张证书在前端应该如何被自然地展示给用户”。

| 字段 | 含义 |
| --- | --- |
| `displayType` | 固定显示为“证书” |
| `displayScore` | 平滑后的展示分 |
| `displayStars` | 五分制评分 |
| `displayLabel` | 自然语言信誉标签 |
| `image` | 主视觉图 |
| `attributes` | 统一属性列表 |
| `metadataUrl` | 元数据可访问地址 |

## 8. 凭证综合模型总结

若将 CredChain 中的“凭证”抽象为统一对象，其本质上是：

```text
Credential
= OnChainIdentity
+ OnChainReputationState
+ OffChainBusinessMetadata
+ FrontendDerivedPresentation
```

也就是说，系统中的凭证并不是“一个字段集合”，而是：

1. 一枚链上不可转移证书代币  
2. 一组链上评价与声誉状态  
3. 一份链下元数据文档  
4. 一组前端派生展示字段  

这种复合模型非常适合论文中“链上最小可信锚定 + 链下业务扩展表达”的设计讨论，因为它同时兼顾了：

- 链上唯一性  
- 链上可验证性  
- 业务表达灵活性  
- 前端可读性与可用性  

## 9. 数据模型设计特点总结

当前 CredChain 的数据模型设计具有以下特点：

1. 以链上最小状态作为可信锚点。  
2. 将复杂业务字段与附件迁移到链下元数据文档。  
3. 使用索引器数据库构建面向查询的只读模型。  
4. 使用前端视图模型屏蔽链上与链下数据源差异。  
5. 将“凭证”抽象为跨层复合实体，而不是单一存储记录。  

这套模型设计对于毕业论文来说具有较强的可解释性，因为它清晰展示了 Web3 应用中“链上状态、链下索引、链下业务元数据、前端视图投影”四者之间的分工关系。
