# CredChain 声誉系统可行方案（链上可实现版本）

## 1. 研究目标与约束

本文提出一套用于“凭证即 SBT（ERC721 + ERC5192）”场景的声誉机制。目标如下：

1. 账户可上传凭证并铸造不可转移 SBT。
2. 每个 SBT 维护可被投票更新的可信度分数。
3. 账户声誉由其持有 SBT 的分数聚合得到，并影响投票权重。
4. 更新规则需满足链上可执行、可验证、低复杂度。
5. 机制需具备防刷票与防女巫攻击能力。

核心工程约束为：每次投票的链上计算复杂度应为常数阶，避免全局重算。

## 2. 形式化系统模型

### 2.1 集合与映射

设：

- 账户集合为 $\mathcal{A}$。
- SBT 集合为 $\mathcal{T}$。
- 所有者映射为 $o: \mathcal{T} \rightarrow \mathcal{A}$。
- SBT 分数状态为 $s_t \in [s_{\min}, s_{\max}] \subset \mathbb{R}$，其中 $t \in \mathcal{T}$。
- 账户声誉状态为 $R_a \in [R_{\min}, R_{\max}]$，其中 $a \in \mathcal{A}$。

### 2.2 是否属于图计算问题

系统可被表示为二部图 $G=(\mathcal{A},\mathcal{T},\mathcal{E})$，其中边 $\mathcal{E}$ 表示投票关系。
然而本文方案不执行全图迭代（如谱方法、PageRank 或全局最优化）。
后续将首先给出动态更新方程及其链上实现约束，再讨论遍历复杂度与可扩展性，最后证明局部缓存更新的正确性与前提条件。

## 3. 声誉与权重的抽象函数体系

### 3.1 初始声誉

定义初始算子 $\mathcal{I}$：

$$
R_a^{(0)} = \mathcal{I}(a), \quad \mathcal{I}(a) \in [R_{\min}, R_{\max}]
$$

可行实现：

1. 常数初始化：$\mathcal{I}(a)=R_0$。
2. 分层初始化：与 KYC/治理白名单等级相关。
3. 保守实现建议：$R_0=0$，降低冷启动刷票动机。

### 3.2 SBT 贡献算子

定义单个 SBT 对声誉的贡献算子 $\Phi$：

$$
\Phi: [s_{\min}, s_{\max}] \rightarrow \mathbb{R}_{\ge 0}
$$

账户声誉定义为：

$$
R_a = R_a^{(0)} + \sum_{t \in \mathcal{T}_a} \Phi(s_t),\quad
\mathcal{T}_a := \{t\in\mathcal{T}\mid o(t)=a\}
$$

约束性质：

1. 单调性：$s_1\le s_2 \Rightarrow \Phi(s_1)\le\Phi(s_2)$。
2. 凹性（可选）：抑制边际垄断。
3. 有界性（推荐）：$\Phi(s)\le c_{\Phi}$，限制单 SBT 极端影响。

### 3.3 投票权重算子

定义权重算子 $\Gamma$：

$$
w_a = \Gamma(R_a),\quad w_a\in[0,w_{\max}]
$$

推荐性质：

1. 对 $R_a$ 单调非减。
2. 具备上界 $w_{\max}$。

## 4. 动态更新方程

设一次投票事件为 $e=(a,t,v,\tau)$：

- 投票者 $a\in\mathcal{A}$；
- 目标 SBT 为 $t\in\mathcal{T}$；
- 方向 $v\in\{-1,+1\}$（可扩展为区间评分）；
- 时间戳 $\tau$。

分数增量定义为：

$$
\Delta s_t = \alpha\cdot w_a\cdot v
$$

并通过投影算子 $\Pi_{[s_{\min},s_{\max}]}$ 截断：

$$
s_t' = \Pi_{[s_{\min},s_{\max}]}
\big(s_t + \Delta s_t\big)
$$

令 $b=o(t)$ 为该 SBT 所有者，则声誉增量为：

$$
\Delta R_b = \Phi(s_t')-\Phi(s_t),\quad R_b' = R_b + \Delta R_b
$$

当采用链上缓存 $R_b$ 时，上式可在一次交易内完成，不需要遍历 $\mathcal{T}_b$。

### 4.1 供给侧防御：低可信度 SBT 的声誉抑制

在 KYC 防女巫的前提下，攻击者无法通过伪造身份来膨胀投票权。然而，一个合法账户仍可能铸造大量低质量凭证（即 $s_t$ 接近 $s_{\min}$ 的 SBT），并通过其他合法账户的投票来拉升这些 SBT 的分数，从而间接膨胀自身声誉。本方案通过贡献算子 $\Phi$ 的设计来抑制此类行为，无需引入额外的投票频率限制或冷却窗口。

具体而言，$\Phi$ 应满足以下性质：

1. 低分抑制：当 $s_t \le 0$ 时，$\Phi(s_t)=0$，即可信度非正的 SBT 对声誉无贡献。
2. 边际递增：$\Phi$ 在 $s_t>0$ 区间为凹函数（$\Phi''\le 0$），使得低分段的分数增长对声誉的边际贡献远低于高分段的同等增长。
3. 有界性：$\Phi(s_t)\le c_{\Phi}$，限制单个 SBT 对声誉的最大贡献。

在此设计下，一个账户持有大量低分 SBT 并不能显著提升其声誉 $R_a$，因为每个低分 SBT 的 $\Phi(s_t)$ 值趋近于零。攻击者若要通过投票拉升某个 SBT 的分数，需要投入大量投票权重——而投票权重本身又受限于投票者自身的声誉。这一自限性使得声誉膨胀在经济上不可行。

因此，本方案不引入额外的门控算子（如冷却窗口、配对上限或预算约束），仅依赖 $\Phi$ 的数学性质与 KYC 身份认证即可实现有效的攻击防御。这简化了链上逻辑，降低了 Gas 成本，并避免了人为限制对系统可用性的影响。

下文首先给出遍历复杂度的讨论、链上实现约束与分工，随后在专门小节中给出局部缓存更新的严格正确性证明及适用边界。

## 5. 遍历复杂度与可扩展性

在采用声誉缓存的前提下，每次投票只涉及常数个存储槽读写，链上时间复杂度为 $O(1)$，这意味着单次投票的 Gas 与账户持仓规模解耦。

若不缓存声誉、而在每次投票后遍历账户持仓重算，则复杂度为 $O(|\mathcal{T}_a|)$，在大规模场景下无法接受且会显著推高 Gas 成本。

在工程实现上，应保证：

1. 链上对每次投票的状态变更为局部可识别（仅影响有限数量的 SBT 与少数账户）。
2. 所有增量更新在同一事务内原子提交，以避免短暂不一致窗口导致攻击面。
3. 对需要全局统计的信息（全网分位、全局排名）采用链下索引器与按需上链快照的方式处理。

## 5. 防女巫机制

女巫攻击（Sybil attack）指攻击者通过伪造大量身份来虚增投票权重或声誉。本系统采用链上链下结合的 KYC（Know Your Customer）身份认证机制来防范此类攻击：每个账户在获得投票权之前须通过链下身份验证，链上合约仅记录已验证账户的标识。该机制确保每个活跃账户对应一个真实实体，从而从根本上杜绝身份伪造。

## 6. 链上实现逻辑与边界

### 6.1 链上职责（应放在合约内）

1. ERC721 + ERC5192 规范合规（铸造、查询、不可转移约束）。
2. 状态最小闭环：`s_t`、`R_a`、KYC 身份标识。
3. 投票执行原子性：验证规则、更新分数、更新声誉、发事件。
4. 参数边界检查：所有算子输出投影到合法区间。

### 6.2 链下职责（建议放到索引器/风控服务）

1. KYC 身份认证与验证。
2. 复杂非线性拟合（如高阶函数、统计学习模型）。
3. 参数标定与回测（$\alpha$、$w_{\max}$ 等）。

### 6.3 局部缓存更新的正确性与复杂度论证

为说明“局部缓存更新”并非启发式近似，而是与全量重算在给定条件下严格等价，定义全量重算算子：

$$
\mathcal{F}(a;\mathbf{s}) := R_a^{(0)} + \sum_{t\in\mathcal{T}_a}\Phi(s_t)
$$

其中 $\mathbf{s}$ 为全体 SBT 分数向量。

设一次合法投票仅改变单个目标 SBT $t^\star$ 的分数：

$$
s_{t^\star}' \neq s_{t^\star},\quad
\forall t\neq t^\star,\ s_t'=s_t
$$

并且其所有者为 $b=o(t^\star)$。缓存更新规则为：

$$
R_b' = R_b + \Phi(s_{t^\star}')-\Phi(s_{t^\star}),\quad
\forall a\neq b,\ R_a'=R_a
$$

命题 1（等价性）：若满足以下条件，则缓存更新与全量重算逐事件严格等价：

1. 可分解性：$R_a$ 对账户持仓是可加分解形式 $\sum_{t\in\mathcal{T}_a}\Phi(s_t)$。
2. 局部性：单次事件只修改有限个（本方案为 1 个）SBT 分数。
3. 所有权确定性：事件执行期间 $o(t)$ 不发生与该事件并发冲突的变化。
4. 原子提交：分数与缓存声誉在同一事务内更新。

证明要点：

1. 对任意 $a\neq b$，因其持仓分数未变化，故
   $\mathcal{F}(a;\mathbf{s}')=\mathcal{F}(a;\mathbf{s})=R_a=R_a'$。
2. 对 $a=b$，全量重算与缓存差分仅在 $t^\star$ 项不同，故
   $$
   \mathcal{F}(b;\mathbf{s}')-\mathcal{F}(b;\mathbf{s})
   =\Phi(s_{t^\star}')-\Phi(s_{t^\star})
   $$
   与缓存更新增量一致。
3. 归纳到事件序列可得任意时刻状态一致性成立。

推论 1（复杂度优势）：

1. 全量重算：每次更新需要遍历 $|\mathcal{T}_b|$，时间复杂度 $O(|\mathcal{T}_b|)$。
2. 局部缓存：每次更新仅常数次读写和常数个算子调用，复杂度 $O(1)$。

推论 2（Gas 上界行为）：在 EVM 存储模型下，局部缓存的 Gas 主要由常数个 `SLOAD/SSTORE` 与事件日志组成，因此与账户持仓规模解耦。

### 6.4 局部缓存方法的适用边界

上述等价性不自动适用于以下情形，需额外机制：

1. 全局耦合函数：若 $\Phi$ 或 $\Gamma$ 显式依赖全网统计量（如全局分位数），单点差分不足以恢复全量结果。
2. 多目标联动更新：一次事件同时修改多个 SBT 时，需将差分扩展为有限项求和。
3. 非原子流程：若分数更新与声誉缓存更新被拆为跨交易流程，会引入短暂不一致窗口。
4. 所有权迁移事件：虽然 ERC5192 下 SBT 不可转移，但若引入销毁重铸或托管迁移，需要在迁移路径上做额外差分结算。

工程结论：只要保持“可分解 + 局部变更 + 原子提交”，局部缓存是严格正确且可扩展的实现，而非近似。

## 7. 算子实例化建议（从抽象到实现）

### 7.1 $\Phi$ 的可行实例

1. 分段线性上限（推荐链上）：

$$
\Phi(s)=
\begin{cases}
0,& s\le 0\\
\min(ks,c_{\Phi}),& s>0
\end{cases}
$$

优点：Gas 低、可解释、易做增量。

1. 凹函数近似：

$$
\Phi(s)=\log(1+\max(0,s))\ \text{或}\ \sqrt{\max(0,s)}
$$

建议用查表或分段近似实现，避免昂贵浮点/高精度运算。

### 7.2 $\Gamma$ 的可行实例

1. 线性截断：

$$
\Gamma(R,\xi)=\min(w_{\max},aR+b)\cdot \chi(\xi)
$$

1. 分段凹权重：
   在高声誉区间降低斜率，抑制寡头效应。

## 8. 参数与治理建议

建议参数采用“保守启动，逐步放开”策略：

1. 初始阶段降低 $\alpha$ 与 $w_{\max}$。
2. 通过治理流程分批调参，并要求每次调参附带回测报告。

## 9. 结论

该方案以函数抽象统一描述初始、计算与更新逻辑，并给出可在 EVM 上落地的实例化路径。其关键性质为：

1. 机制闭环：SBT 分数与账户声誉相互作用。
2. 复杂度可控：单次投票 $O(1)$。
3. 防攻击可扩展：KYC 防女巫与 $\Phi$ 的供给侧抑制相结合。
4. 与 ERC721/ERC5192 兼容，不依赖全图计算。

---

## 10. 相关工作与参考文献

本方案的理论支撑主要参考了两类工作：一类是基于全局谱/特征向量的声誉计算以对比全图方法的数学含义，另一类是增量维护与差分更新的算法基础。代表性参考文献包括 Eigentrust \cite{kamvar2003eigentrust}（全局声誉谱方法的工程化实现）与物化视图增量维护的综述性工作 \cite{chirkova2012materializedviews}。完整 BibTeX 条目见 `docs/refs.bib`。

## 11. 投票基数偏差与统计校正（Audience-Size Bias Correction）

### 11.1 问题与目标

当前 `ReputationCore.sol` 中的 SBT 分数 `s_t` 是一个**带权、带符号、可截断**的累计状态：

$$
\Delta s_t = \alpha \cdot w_a \cdot v,\quad v\in\{-1,+1\}
$$

其中投票权重 $w_a$ 由账户声誉决定，最终分数被投影到 $[S_{\min}, S_{\max}]$ 区间。

这意味着链上 `score` 不是传统意义上的“平均分”，而是“治理强度信号”。因此会出现以下体验问题：

1. 用户无法像阅读电商/影评网站一样同时看到“评分”和“有多少人参与评价”。
2. 公开凭证（如志愿者证书）更容易获得大量投票，私域凭证（如某校优秀毕业生成就）天然样本更少。
3. 单看累计分数，无法区分“少数高权重用户快速抬高”与“较大群体形成稳定共识”。

本节目标不是改变链上声誉状态机，而是为**展示层与排序层**增加一个可解释的“可信度校正分”：

1. 在相似受众可信度下，让公开凭证与私域凭证具有更可比的展示效果。
2. 让投票人数成为“共识强度”的一部分，而不是简单绝对票数碾压。
3. 保持链上每次投票的复杂度为 $O(1)$。

### 11.2 关键约束：为什么不能直接把当前 `score / voteCount` 当成平均分

直接把当前链上 `score` 除以 `voteCount` 并不严谨，原因有三：

1. `score` 是加权累计量，而不是普通样本和。
2. 当前合约允许同一地址重复投票，`voteCount` 若只是“调用次数”，不等于独立样本数。
3. `score` 会被 `_clamp` 截断，截断后的值不再等于原始累计和。

因此，一个可行方案必须显式区分三类量：

1. **链上结算分**：用于 $\Phi$ / $\Gamma$ 和真实声誉结算，保持现有 `score` 逻辑。
2. **链上统计量**：用于刻画“有多少人、多少权重参与过投票”。
3. **链下展示分**：将链上结算分与统计量组合成用户可理解的五分制/语义标签。

### 11.3 方案选择：优先选贝叶斯，不选 Wilson

#### 11.3.1 推荐：贝叶斯平滑后的“加权均值展示分”

在 CredChain 当前模型下，推荐方案不是直接对 `score` 做贝叶斯，而是先构造一个**标准化加权均值**，再做贝叶斯平滑。

定义链上累计统计量：

$$
\text{rawVoteSum}_t = \sum_i \alpha \cdot w_i \cdot v_i
$$

$$
\text{weightSum}_t = \sum_i w_i
$$

$$
\text{voteCount}_t = \text{唯一投票账户数}
$$

其中每个账户对同一 `tokenId` 默认只允许投一次有效票（详见 11.5），从而使 `voteCount_t` 更接近“独立评价人数”。

先构造一个标准化均值：

$$
\mu_t =
\begin{cases}
0, & \text{weightSum}_t = 0\\
\frac{\text{rawVoteSum}_t}{\alpha \cdot \text{weightSum}_t}, & \text{otherwise}
\end{cases}
$$

由定义可知 $\mu_t \in [-1, 1]$。再将其映射到 0-100 展示区间：

$$
\text{baseDisplay}_t = 50 \cdot (1 + \mu_t)
$$

然后对 `baseDisplay_t` 做贝叶斯平滑：

$$
\text{displayScore}_t = \frac{C \cdot m + \text{voteCount}_t \cdot \text{baseDisplay}_t}{C + \text{voteCount}_t}
$$

其中：

- $m$ 为链下维护的全网展示先验均值，推荐初始值为 50；
- $C$ 为冷启动平滑常数，推荐取 $10 \sim 20$。

**解释：**

1. `baseDisplay_t` 反映“在参与者内部，正负加权共识的方向与强度”。
2. `voteCount_t` 反映“有多少真实账户参与了共识形成”。
3. 贝叶斯平滑让少量投票的凭证回归中性，不会因为 1-2 个高权重投票就冲到榜首。

这正适合“公开凭证和私域凭证受众规模不同，但在各自群体内可信度可能接近”的场景。

#### 11.3.2 不推荐：Wilson 作为当前版本的主方案

Wilson 下界适合二项分布或“好评率”模型，即系统中需要明确区分：

- 正票数 / 负票数；
- 或成功次数 / 总次数。

但当前 `ReputationCore.sol` 并未保存：

1. `upvoteCount` / `downvoteCount`；
2. `positiveWeightSum` / `negativeWeightSum`；
3. 一个自然可解释的 Bernoulli 成功率 $\hat{p}$。

更重要的是，当前系统的投票是**带权投票**，而 Wilson 更自然地服务于未加权或可明确定义成功率的场景。

因此：

1. **当前版本主方案应选贝叶斯平滑**。
2. **Wilson 只适合未来扩展到“正负票比例排行榜”时作为附加排序指标**，不适合作为现阶段核心展示分。

### 11.4 建议实施架构

```
┌──────────────────────────────────────────────────────────────┐
│                 链上（ReputationCore.sol）                    │
│                                                              │
│  结算状态：                                                   │
│    score[tokenId]        ← 现有链上结算分（保留）             │
│    reputation[owner]     ← 现有账户声誉缓存（保留）           │
│                                                              │
│  新增统计状态：                                               │
│    rawVoteSum[tokenId]   ← 未截断的带权投票和                 │
│    weightSum[tokenId]    ← 参与投票的总权重                   │
│    voteCount[tokenId]    ← 唯一投票账户数                     │
│    hasVoted[tokenId][a]  ← 账户是否已对该凭证投票             │
│                                                              │
│  每次 vote() 时原子更新：                                      │
│    1. 检查 KYC / token 存在 / 未撤销 / 未重复投票             │
│    2. delta = ALPHA * weight * direction                      │
│    3. rawVoteSum += delta                                     │
│    4. weightSum += weight                                     │
│    5. voteCount += 1                                          │
│    6. score = clamp(score + delta)                            │
│    7. reputation += phi(newScore) - phi(oldScore)             │
└──────────────────────┬───────────────────────────────────────┘
                       │ 可验证原始数据
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                 链下（前端 / 索引器）                         │
│                                                              │
│  baseDisplay = f(rawVoteSum, weightSum)                      │
│  displayScore = Bayesian(baseDisplay, voteCount, m, C)       │
│                                                              │
│  展示：                                                       │
│    五分制 + 语义标签 + 投票人数 + 原始链上分                  │
└──────────────────────────────────────────────────────────────┘
```

### 11.5 链上改动建议

#### 11.5.1 最小新增状态

在 `ReputationCore.sol` 中新增：

```solidity
mapping(uint256 => int256) private _rawVoteSums;
mapping(uint256 => uint256) private _weightSums;
mapping(uint256 => uint256) private _voteCounts;
mapping(uint256 => mapping(address => bool)) private _hasVoted;
```

含义如下：

1. `_rawVoteSums[tokenId]`：记录未截断的带权投票和，用于展示层标准化均值。
2. `_weightSums[tokenId]`：记录参与投票的总权重，用于抵消“高权重少数票 vs 低权重大量票”的量纲差异。
3. `_voteCounts[tokenId]`：记录唯一投票账户数，用于贝叶斯冷启动平滑。
4. `_hasVoted[tokenId][account]`：防止一个 KYC 账户反复增加样本量。

#### 11.5.2 `vote()` 的最小逻辑调整

在现有 [ReputationCore.sol](/workspaces/credchain/contracts/contracts/ReputationCore.sol) 的 `vote()` 基础上增加：

```solidity
require(!_hasVoted[tokenId][msg.sender], "ReputationCore: already voted");

int256 delta = ALPHA * int256(weight) * int256(direction);

_rawVoteSums[tokenId] += delta;
_weightSums[tokenId] += weight;
_voteCounts[tokenId] += 1;
_hasVoted[tokenId][msg.sender] = true;
```

其余链上声誉结算逻辑保持不变：

```solidity
int256 oldScore = _scores[tokenId];
int256 newScore = _clamp(oldScore + delta, S_MIN, S_MAX);
int256 repDelta = phi(newScore) - phi(oldScore);

_scores[tokenId] = newScore;
_reputations[owner] += repDelta;
```

#### 11.5.3 新增 view 接口

建议新增：

```solidity
function getVoteCount(uint256 tokenId) external view returns (uint256);
function getWeightSum(uint256 tokenId) external view returns (uint256);
function getRawVoteSum(uint256 tokenId) external view returns (int256);
function hasVoted(uint256 tokenId, address account) external view returns (bool);
```

前端只依赖这些 view 数据即可完成展示层校正，无需改变 `phi()` 或 `getReputation()` 的现有设计。

### 11.6 复杂度与 Gas 分析

该方案仍保持单次投票 **$O(1)$**：

1. 不涉及遍历某个账户持有的所有 SBT；
2. 不涉及全网统计的链上重算；
3. 仅增加常数个 `SLOAD/SSTORE`。

与当前版本相比，新增成本主要来自：

1. `_hasVoted[tokenId][msg.sender]` 的检查与写入；
2. `_rawVoteSums[tokenId]` 写入；
3. `_weightSums[tokenId]` 写入；
4. `_voteCounts[tokenId]` 写入。

因此：

1. **渐进复杂度不变，仍为 $O(1)$**；
2. **常数项会增加**，但这属于“多存几个统计量”的代价，而不是算法级退化；
3. 相比引入 Wilson 所需的链上浮点近似、平方根或更复杂计数结构，这一版本明显更可控。

### 11.7 链下展示层实现

```typescript
const C = 12
let globalPrior = 50 // 0-100 中性均值，可由索引器周期更新

interface DisplayScore {
  raw: number          // 原始链上结算分
  base: number         // 标准化加权均值（0-100）
  bayesian: number     // 贝叶斯平滑后的展示分（0-100）
  star: number         // 0-5
  label: string
}

const LABELS = ['待验证', '信誉较差', '信誉一般', '信誉良好', '信誉优秀', '信誉极好']

function clamp(x: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, x))
}

function displayScore(
  rawScore: number,
  rawVoteSum: number,
  weightSum: number,
  voteCount: number,
  alpha: number
): DisplayScore {
  const mean = weightSum === 0 ? 0 : rawVoteSum / (alpha * weightSum) // [-1, 1]
  const base = clamp(50 * (1 + mean), 0, 100)
  const bayesian = (C * globalPrior + voteCount * base) / (C + voteCount)
  const star = clamp(Math.round(bayesian / 20), 0, 5)
  return {
    raw: rawScore,
    base: Math.round(base * 100) / 100,
    bayesian: Math.round(bayesian * 100) / 100,
    star,
    label: LABELS[star],
  }
}
```

### 11.8 五分制与语义标签映射

| 展示分区间 | 五分制 | 语义标签 |
|---|---|---|
| $\ge 85$ | ★★★★★ | 信誉极好 |
| $70 - 84$ | ★★★★☆ | 信誉优秀 |
| $55 - 69$ | ★★★☆☆ | 信誉良好 |
| $40 - 54$ | ★★☆☆☆ | 信誉一般 |
| $25 - 39$ | ★☆☆☆☆ | 信誉较差 |
| $< 25$ | ☆☆☆☆☆ | 待验证 |

在 UI 上建议同时展示：

1. `bayesian` 展示分；
2. 星级/语义标签；
3. `(N 人参与投票)`；
4. 原始链上分 `rawScore` 作为高级信息。

这样用户能同时看到：

1. 系统的链上真实结算状态；
2. 面向人类理解的信誉等级；
3. 共识强度是否来自广泛参与。

### 11.9 与现有 $\Phi$ / $\Gamma$ 的关系

该方案**不改变**现有链上声誉闭环：

1. `score[tokenId]` 仍用于 `phi(score)`；
2. `reputation[owner]` 仍由 `phi(newScore) - phi(oldScore)` 增量更新；
3. `weight(voter)` 仍由 `getReputation(voter)` 决定。

也就是说，新增统计校正后，系统将同时拥有两条并行语义：

1. **协议内语义**：链上 `score / reputation / weight`，用于投票与治理结算；
2. **展示层语义**：`displayScore / star / label / voteCount`，用于排序、卡片展示与用户理解。

这种分离是必要的，因为当前协议内分数本来就承担“治理强度”职责，不应为了 UI 语义而反向污染结算逻辑。

### 11.10 为什么这里不采用“群体感知折扣”

不建议采用如下折扣：

$$
\text{finalScore}_t = \bar{s}_t \cdot \left(1 - \beta \cdot \frac{\text{voteCount}_t}{\text{maxVoteCount}}\right)
$$

原因是它会系统性惩罚“被更多人看见的凭证”，与本节目标冲突：

1. 公开凭证本来就天然更容易被更多人投票；
2. 受众大不等于操纵，直接折扣会误伤正常高共识凭证；
3. 若未来需要检测异常刷票，应依赖链下风控、时间窗口分析与 KYC 图谱，而不是直接对大样本降权。

### 11.11 结论

结合现有文档与当前合约实现，推荐结论如下：

1. **主方案选择：贝叶斯平滑后的加权均值展示分**。
2. **链上最小改动：新增 `rawVoteSum / weightSum / voteCount / hasVoted` 四类状态与对应 view**。
3. **治理结算逻辑不变：继续使用当前 `score -> phi -> reputation -> weight` 闭环**。
4. **复杂度保持不变：单次投票仍为 $O(1)$**。
5. **Wilson 不作为当前版本主方案**，因为当前数据结构不自然支持二项成功率建模。

该方案既保留了现有链上声誉系统的可执行性，也为“五星信誉分 + 语义标签 + 投票人数”提供了统计上更合理的展示基础。

## 附录 A：最小链上状态建议

- `mapping(uint256 => int256) score;`
- `mapping(address => int256) reputation;`
- `mapping(address => bool) kycVerified;`
- `mapping(uint256 => int256) rawVoteSum;`
- `mapping(uint256 => uint256) weightSum;`
- `mapping(uint256 => uint256) voteCount;`
- `mapping(uint256 => mapping(address => bool)) hasVoted;`

注：若未来允许“改票”，仍可保持 $O(1)$，但需要额外存储每个账户对每个 token 的历史方向与历史权重快照，工程复杂度显著高于当前推荐的一次性投票版本。
