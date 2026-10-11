# Step 8 引导式开发：OSS 上传基础设施

> 本文对应 [03-开发计划](./03-开发计划.md) 的 Step 8。  
> 它是一份任务引导，不提供可以整段复制的最终实现。请先自己完成每个检查点，卡住后再展开提示。  
> 质量要求以 [01-工程契约](./01-工程契约.md) 为准。

本步 **没有** 测试检查点。测试策略已于 2026-10-11 改为随域交付（见 [04-验收记录](./04-验收记录.md)）。验收以「手动验证矩阵」+ `pnpm verify` 为准。

Step 4 已经能 `post()`；Step 5 已经有 Dialog / QueryState。本步 **不再重讲** axios 解包或 Query。OSS 不是列表资源，不要把它塞进 `useQuery`。

## 1. 本步目标

做出后续封面 / 正文图 / 图标 / 下载资料都能复用的上传内核，而不是某一页里的一次性按钮。

```text
shared/oss
  api.ts              POST /upload/sts；判别 mode
  upload.ts           纯函数：拿凭证 → 拼 objectKey → put → 返回结果
  OssUploadButton     隐藏 file input + 忙碌态；不发业务 CRUD

调用方（本步只临时接线，正式接入是 Step 9 / 11 / 13）
  公开资源            拿到可展示 URL（CDN 优先，否则 OSS HTTPS）
  私有资料            拿到 objectKey（下载页入库用，不靠直链）
  STS 未配置          不打 OSS；允许手填 URL 降级
```

完成后必须满足：

- STS `mode=oss` 时能选文件上传，公开模式得到可打开的 HTTPS URL。
- STS `mode=placeholder` 时不能 put，可手填 URL 作为降级结果。
- `subdir` 可配：`covers` / `body` / `downloads` / `icons`。
- 私有模式返回的是 `objectKey`（形如 `essay-mvp/YYYYMMDD/downloads/...`），不是「看起来能点开、实际 403」的假直链当唯一结果。
- 上传中再次点击有明确处理：忽略。禁止并行打爆 STS / PUT。
- 上传逻辑在 `shared/oss`，不写进某个业务 page 无法复用。
- `pnpm verify` 通过。

## 2. 本步边界

本步只做上传基础设施。

本步允许：

- 安装 `ali-oss` 与 `@types/ali-oss`（03 已锁定，本步才装）。
- 新建 `src/shared/oss/`。
- 为验收，在**已有占位页**上临时挂按钮。测完必须删接线。

本步禁止：

- 新建 `/oss-playground`、`/upload-demo` 或任何演示路由。
- 把 STS 放进 TanStack Query（`staleTime: 30_000` 会把过期凭证当 fresh）。
- 在 axios 拦截器或 `shared/api` 里 `message`。
- 用 Ant Design `Upload` 的 `fileList` 当主状态（03 指定隐藏 `input[type=file]` + `useRef`）。
- 给 article / download / home-block 写真页面、真表单、真 `api.ts`。
- 上 XState / 队列库。忙碌旗标即可。
- 安装测试依赖、改 `verify`。
- 修改只读对照项目 `Admin/`。
- 把另一端的 STS 内存缓存、文件名函数、SDK 开关、组件模板翻译过来。

03 里「对照 Vue 的 OssUploadButton / ossUpload.ts」对本步过宽。业务规则已经写在后端文档和本文产品契约里。实现按 React + ali-oss 官方 API 做。

## 3. 开始状态与文件范围

开始前应保持：

- HTTP 客户端可 `post()`，失败抛 `ApiError`，拦截器不 toast。
- 登录真调可用；`VITE_API_BASE=/admin/api/v1`；端口 **5174**。
- QueryClient 已挂。本步 **不要** 为 STS 新建 `queryKeys`。
- 后端 `course_server` 已启动（默认账号 `admin / admin123`）。
- 计划顺序上建议 Step 7 已通过；本步 **不依赖** taxonomy 源码。

本步预计新增或修改：

```text
package.json                         # ali-oss；类型包
src/shared/oss/
├── api.ts                           # fetchUploadSts
├── upload.ts                        # 纯函数内核
├── OssUploadButton.tsx              # 隐藏 input + 忙碌
├── types.ts                         # 可选；类型也可放 api.ts
└── index.ts
src/features/<某个 Empty 占位页>     # 仅临时接线，验收前还原
```

文件名可以小幅调整，但内核必须在 `shared/oss`（或 `shared/upload`）。不要放进 `features/article`，也不要塞进 `shared/api/http.ts`。

OSS 的 PUT **不走** Vite proxy。`POST /upload/sts` 走同源 `/admin/api`；文件直传阿里云。Bucket CORS 必须覆盖 `http://localhost:5174`。现有运维文档按 Vue 端口写了 `5173`，本步若 PUT 被浏览器拦，先改 CORS，不要改代理。

## 4. 使用方式

每个检查点按下面顺序完成：

1. 只看「任务」和「完成信号」，先自己设计。
2. 卡住时再看「提示一」。
3. 仍无法推进再看「提示二」。
4. 完成后回答「自检问题」。
5. 每个检查点结束都跑最小验证，不要最后一次性排错。

### 对照源（本步不读 `Admin/src`）

**删掉 `Admin/src` 这份检查点仍能做完。**

Step 8 要对等的是：STS 路径与字段、`subdir` 目录、公开 URL 怎么拼、私有资料为什么存 objectKey、未配置 OSS 时如何降级。这些都可以从后端契约、OSS 配置文档和 01/03 推出。另一端的页面组件、内存缓存、`load()`、Element Upload，落在 01 的禁止照搬清单里，读了只会把实现锁成翻译。

| 要确认的事实 | 去哪看 |
|---|---|
| `POST /upload/sts`；配置完整 `mode=oss`，否则 `mode=placeholder` | [api-reference.md](../../course_server/docs/api-reference.md) §3.12；实现 [`UploadSTS`](../../course_server/internal/handler/admin_config.go) |
| `mode=oss` 的 JSON 字段名 | [`STSCredentials`](../../course_server/internal/pkg/ossutil/client.go) 的 json tag |
| 会话策略只允许传到当天前缀；`dir` 已含 `essay-mvp/YYYYMMDD/` | 同上 `UploadPrefix` / `uploadPolicy`；说明见 [oss-setup-guide.md](../../course_server/docs/oss-setup-guide.md) §四.2 |
| `subdir`：`covers` / `body` / `downloads` / `icons` | oss-setup-guide §六 |
| 公开资源读接口拼 CDN 或 OSS HTTPS；私有下载走预签名 | oss-setup-guide §一、§六、§七；后端 `PublicURL` / `SignDownloadURL` |
| Bucket 默认私有；前端直传要 CORS | oss-setup-guide §三；[domain-vunbo.md](../../course_server/docs/domain-vunbo.md) §四（补 `5174`） |
| 上传模块放 `shared`；禁止演示页；toast 在 UI | [01-工程契约.md](./01-工程契约.md) |
| 隐藏 file input、`useRef`、ACL 公开/私有、禁止并行 | 本文产品契约 + [03 Step 8](./03-开发计划.md) |
| `OSS` 构造、`stsToken`、`put`、对象 ACL | [ali-oss](https://github.com/ali-sdk/ali-oss)；[Browser.js 设置 ACL](https://help.aliyun.com/zh/oss/developer-reference/manage-object-acls-3)（项目本步安装 6.x） |

本步不要去翻其它端的上传 util。你要做的是 React 后台的共享上传内核，不是翻译。

---

## 5. 架构主课：凭证不是列表，按钮不是内核

Step 6 / 7 的主课是「zod / RHF / Query 三条所有权线」。本步要锁住的是另一条：

```text
shared/oss/api.ts       只问后端要不要直传：mode=oss | placeholder
                        不 import ali-oss，不碰 DOM

shared/oss/upload.ts    只在 mode=oss 时 put
                        不 import react / antd / Query
                        入参是 File + 选项，出参是结果

OssUploadButton         只拥有：隐藏 input、忙碌、二次点击策略
                        成功/失败通过回调交给调用方
                        调用方以后才是 RHF 字段

页面 / 表单             拥有「这个 URL / objectKey 写进哪个字段」
                        本步还没有正式表单
```

三条容易写错的边界：

1. **STS 不是 Query。** 凭证有效期 3600 秒，且绑定当天目录前缀。放进 Query 会跟 `staleTime: 30_000` 打架，也没有「列表失效」可讲。用 `post()` 即可。
2. **按钮不能吞掉内核。** Step 11 正文图是多文件 + 拖拽，Step 13 是 private 文件。它们会复用 `upload.ts`，不一定每次都点同一个 Button。内核必须是纯函数。
3. **公开 URL 和 objectKey 不是两种上传 API。** 一次 put 两种结果都有。差别是调用方入库存哪一个、对象 ACL 是不是 `public-read`。

---

## 检查点 1：先写下产品契约，不急着 `new OSS`

### 当前问题

上传看起来像「选个文件」，真正要锁住的是：凭证长什么样、对象必须落到哪条路径、公开和私有分别给后续页什么。字段写错，Step 11 / 13 会把封面 URL 和资料 objectKey 搅在一起。

### 任务

先在纸面或注释里填完下面四张表，再碰文件。数值以**后端**为准。

**1. STS（`POST /upload/sts`，需登录）**

成功时 HTTP 仍是 `code === 0`。用 **判别联合** 区分两种 `data`，不要把 placeholder 当成 `ApiError`。

| `mode` | 含义 | 前端该做什么 |
|---|---|---|
| `oss` | 配置完整，已 AssumeRole | 用返回字段构造客户端并 put |
| `placeholder` | `config.yaml` 的 OSS / `sts_role_arn` 不完整 | **禁止** put；走手填 URL |

`mode=oss` 字段（名称必须与 json tag 一致）：

| 字段 | 用途 |
|---|---|
| `accessKeyId` / `accessKeySecret` / `securityToken` | ali-oss 的 AK + `stsToken` |
| `expiration` | ISO 时间；本步可以每次上传都重新 POST，不必先做缓存 |
| `bucket` / `endpoint` / `region` | 构造客户端；`region` 已是 `oss-cn-*` 形式 |
| `dir` | 当天允许写入的前缀，已含日期，例如 `essay-mvp/20260825/` |
| `cdnDomain` | 可空。有则公开 URL 用它，无则 `https://{bucket}.{endpoint}/{objectKey}` |

`mode=placeholder` 另有 `message`（英文，来自后端）。UI 原样展示或配一句中文说明都可以，不要翻译成第二套「官方错误码」。

**2. objectKey**

| 场景 | `subdir` | 完整 key 形态 |
|---|---|---|
| 文章封面 | `covers` | `{dir}covers/{unique}.jpg` |
| 正文长图 | `body` | `{dir}body/{unique}.png` |
| 下载资料 | `downloads` | `{dir}downloads/{unique}.pdf` |
| 首页图标 | `icons` | `{dir}icons/{unique}.png` |

`dir` 已带日期，**不要再自己拼一遍日期根目录**。对象必须落在 `dir` 下面，否则会话策略会 403。`unique` 只要文件系统安全、避免碰撞、保留原扩展名；算法自定。

**3. 公开 vs 私有（一次 put，两种入库口径）**

Bucket 默认私有。未设对象 ACL 时，未签名的 OSS HTTPS 打不开。

| 模式 | 给谁用 | ACL | 调用方应保存 |
|---|---|---|---|
| `public` | 封面、正文图、图标 | `public-read` | 可展示 URL（优先 `cdnDomain`） |
| `private` | 下载资料 | 保持私有（不要 public-read） | **objectKey**。小程序侧以后走预签名，见 Step 13 |

内核返回值建议**两种模式都带** `url` 和 `objectKey`。差别是默认把哪个交给表单、以及 ACL。不要做成两个互不相干的上传函数。

**4. 并发与降级**

| 规则 | 本步取值 |
|---|---|
| 上传中再点 | **忽略**（按钮 disabled / 直接 return）。不要排队，不要并行 |
| placeholder | 按钮或旁边给出 URL 输入；确认后走同一份 `onSuccess` |
| 失败 | UI 层 `App.useApp().message`；内核 throw，不 toast |

### 提示一

把状态分层写进同一张表，后面检查点必须填得进去：

| 数据 | 放哪 | 本步 |
|---|---|---|
| token | Zustand persist | 已有，`post()` 会带 |
| STS 凭证 | 一次上传过程中的局部变量 | 不要进 Query，不要进 Zustand |
| 忙碌 | `OssUploadButton` 的 `useState` | 本步要写 |
| 封面 URL / 资料 key | 以后的 RHF 字段 | 本步只在临时接线里用 `useState` 看见结果 |
| 列表 | Query | 本步不出现 |

填不进去的东西（「把 STS 缓存 30 秒进 Query」「在拦截器里弹上传失败」）不要做。

### 提示二

公开 URL 的拼接以后端 `PublicURL` 为准，不要发明第三种：

1. `cdnDomain` 非空 → `{cdnDomain}/{objectKey}`（注意去尾斜杠）。
2. 否则 → `https://{bucket}.{endpoint}/{objectKey}`。`endpoint` 若带了 `https://`，先剥掉。

私有模式即使你能拼出同样的 URL，Bucket 私有时未签名访问是 403。所以验收私有时看的是 **objectKey 形态**，不是「新标签页能打开」。

### 完成信号

你能在不写组件的情况下回答：

- 为什么 placeholder 不能 throw `ApiError`。
- 为什么 objectKey 必须挂在 `cred.dir` 后面。
- 公开模式和私有模式差的是 ACL + 调用方存什么，不是两条 STS 接口。

### 自检问题

- 为什么本步不读 `Admin/src`？
  - 要对等的是 STS 字段、`subdir`、公开/私有入库口径。它们已经在 handler / ossutil / oss-setup-guide。另一端的缓存和组件是实现，01 要求按 React 重写。
- 为什么 STS 成功却 put 403？
  - 最常见：objectKey 不在 `dir` 下；或 Bucket CORS 没有 `http://localhost:5174`。
- 本步要不要做 STS 过期复用？
  - 不要作为验收项。每次上传 POST 一次更短。真要复用，按 `expiration` 在模块层做，且离开 Query。

---

## 检查点 2：安装 ali-oss，先确认能 import

### 当前问题

03 锁定了 ali-oss，但 `package.json` 里还没有。本步才装，避免更早的 Step 多一个用不到的依赖。

### 任务

在 `Admin-React/` 执行：

```bash
pnpm add ali-oss
pnpm add -D @types/ali-oss
```

版本跟官方 6.x 走即可（与 03 技术栈表一致）。不要改 `tsconfig` 放宽 `strict` / `verbatimModuleSyntax` 来迁就类型。

写一个**不会被提交进页面**的最小 import 确认：新建 `upload.ts` 时能 `import OSS from 'ali-oss'`（或类型声明要求的等价写法），`pnpm type-check` 能过。还不要 `new OSS`。

### 提示一

本仓库 `verbatimModuleSyntax` 为 true。CJS 默认导出有时要写成：

```ts
import OSS from 'ali-oss'
```

若类型报「没有默认导出」，看 `@types/ali-oss` 的实际声明再选 `import OSS = ...` **以外**的 ESM 写法。不要关 `verbatimModuleSyntax`。`skipLibCheck` 已经是 true，不要为 SDK 内部类型去改全局 tsconfig。

### 提示二

ali-oss 的浏览器用法：构造函数传入临时凭证的 `stsToken`（对应后端的 `securityToken`）。字段名不要混：后端 JSON 是 camelCase `securityToken`，SDK 选项是 `stsToken`。

当前阿里云 Browser.js 示例带 `authorizationV4: true`。按[官方示例](https://help.aliyun.com/zh/oss/developer-reference/manage-object-acls-3)接，不要凭记忆省略后又在 Signature 报错里猜。

### 完成信号

`package.json` 有依赖；还没有任何页面 import 它；`pnpm verify` 仍绿（若你已经建了空模块文件）。

### 自检问题

- 为什么不把 ali-oss 写进 `shared/api/http.ts`？
  - axios 只打自家 `/admin/api`。OSS PUT 是另一个主机、另一套签名。混在一个 client 里会把代理、拦截器、`ApiError` 解包全部弄脏。

---

## 检查点 3：`api.ts` —— 只要凭证，不要上传

### 当前问题

页面若直接 `post('/upload/sts')` 再满地 `as`，`mode` 会在后续页各写一套收窄。判别应该停在 `shared/oss`。

### 任务

新建 `src/shared/oss/api.ts`：

- 调用已有 `post<T>('/upload/sts')`。无 body。
- 导出 `UploadStsOss` / `UploadStsPlaceholder` / `UploadSts`（名称自定）。
- 导出 `isOssSts(data)`（或等价类型守卫）。**不要**用 `as UploadStsOss` 骗过编译器。
- 本文件禁止 import `ali-oss`。

`mode` 的字面量就是 `'oss' | 'placeholder'`，与后端一致。不要自创 `'ready'` / `'disabled'`。

### 提示一

placeholder 也是 `code === 0`，`post()` 会当成功返回 `data`。类型守卫只看 `mode`（以及 oss 分支必有的 `accessKeyId`、`dir` 等）。缺字段时宁可当作不可上传，也不要 `any`。

不必为 STS 建 `schemas.ts`。zod 在本项目给写表单和 env 用；这里一份类型守卫就够。

### 提示二

`post('/upload/sts')` 需要已登录。未登录会被 401 → `clear()` → AuthGate 送去登录页。不要在拦截器里为这条请求开特例。它不是登录接口。

### 最小验证

登录后，浏览器 Network 或临时在已登录页的按钮里调用（不要留下）。应看到：

- `mode=oss`：有 `bucket`、`dir`、`securityToken`。
- `mode=placeholder`：有 `message`，没有 AK。

### 完成信号

你能指出：为什么不能 `if (!data.accessKeyId) throw new ApiError` 来表示 placeholder。

### 自检问题

- 为什么 STS 不放 `features/article/api.ts`？
  - 文章、下载、首页入口都要用。跨 feature 只允许走 `shared`。
- 为什么不用 `useQuery({ queryKey: ['sts'] })`？
  - 凭证不是「一页一份的服务器列表」。缓存策略和 QueryClient 默认值都不匹配。

---

## 检查点 4：`upload.ts` —— 纯函数内核

### 当前问题

若把 `new OSS` 写进按钮的 `onChange`，Step 11 拖拽多图、Step 13 私有文件都会复制一整段签名逻辑。内核必须可被按钮和以后的列表项复用。

### 任务

新建 `src/shared/oss/upload.ts`，导出类似：

```ts
type OssSubdir = 'covers' | 'body' | 'downloads' | 'icons'
type OssAccess = 'public' | 'private'

type UploadObjectResult = {
  url: string
  objectKey: string
  fileName: string
}

function uploadObject(file: File, options: { subdir: OssSubdir; access: OssAccess }): Promise<UploadObjectResult>
```

名称自定，但必须满足：

1. 内部 `fetchUploadSts()`；若 placeholder，**throw** 一个可识别的错误（普通 `Error` 即可，带上后端 `message`）。手填降级是 Button 的职责，不是内核假装 put 成功。
2. `objectKey = cred.dir + subdir + '/' + unique + ext`。
3. `new OSS({...})` 只用 STS 返回值；`stsToken: cred.securityToken`。
4. `put(objectKey, file, …)`。公开模式带上对象 ACL `public-read`（`put` 的 headers 或随后 `putACL`，按官方文档二选一，不要两个都做）。
5. 私有模式不要 `public-read`。
6. `url` 按检查点 1 的拼接规则。
7. **不 import react / antd / Query。** 不 `message`。

并发控制不要写在这个函数里（它无法知道按钮点了两次）。由 Button 保证同一时刻只跑一次。

### 提示一

`File` 在浏览器里可以直接交给 `client.put`。不要先 `FileReader` 转 DataURL 再上传——那是另一条链路，体积和类型都会歪。

`subdir` 用联合类型，调用方写错会在编译期失败。不要收 `string` 再 trim 出 `"cover"` 这种后端目录里不存在的值。

### 提示二

会话策略允许 `oss:PutObject` 和 `oss:PutObjectAcl`，范围是 `{bucket}/{dir}*`。所以：

- key 写成 `covers/xxx.jpg`（丢了 `dir`）→ 403。
- key 写成 `essay-mvp/covers/xxx.jpg`（丢了日期段）→ 403。
- 必须用接口给你的 `dir`。

官方说明：对象默认继承 Bucket ACL（私有）。公开资源必须显式 `public-read`，否则你拼出的 URL 在无 CDN 时打不开，验收会误判「上传失败」。

### 常见错误

- 把整个 `File` 路径当 objectKey。
- 用下标或原始中文文件名当 key（空格、`#`、中文在 CDN 上会痛）。unique + 原扩展名即可。
- 在内核里 `window.alert` / `message.error`。
- 为「省一次 STS」在模块顶层缓存却不考虑跨日：`dir` 含日期，缓存到第二天会 403。这是不做缓存的理由之一。

### 完成信号

你能不打开按钮文件，就单独讲完：placeholder 在这一层如何失败、公开 ACL 在哪设、url 怎么来。

### 自检问题

- 为什么内核遇到 placeholder 要 throw，而不是返回 `{ url: '' }`？
  - 空字符串会被表单当合法封面。降级必须是显式的手填，不能是静默空值。
- 为什么 `access` 不做成两个函数 `uploadPublic` / `uploadPrivate`？
  - 差异只有 ACL 和调用方取哪个字段。两个函数会复制拼 key / 构造客户端。

---

## 检查点 5：`OssUploadButton` —— `useRef` + 忙碌态

### 当前问题

03 的 React 技术点是隐藏 file input、异步状态机、ACL。Ant Design `Upload` 自带 `fileList`，后面接 RHF 会变成两套文件状态。本步按契约用原生 input。

### 任务

新建 `OssUploadButton.tsx`：

- 可见的是 `Button`（antd 即可）。
- 不可见的是 `<input type="file" ref={...} />`。点击按钮 → `input.click()`。
- `accept` 由 props 传入（图片页 `image/*`，下载页以后再传 PDF 等）。
- `subdir`、`access`、`onSuccess`、`onError?` 为 props。
- 忙碌时按钮 `loading` / `disabled`；`onChange` 开头若已忙碌则 **return**。
- `try/finally` 清忙碌。成功调 `onSuccess(result)`；失败把 `error` 交给调用方或可选 `onError`。本组件可以 `App.useApp().message`（它是 UI），内核不行。
- 选完同一个文件还要能再选：处理完把 `input.value = ''`。
- 不要在 `useEffect` 里上传。上传只发生在 `onChange`。

异步状态机就是 `idle | uploading`（失败靠 toast，不必再做一个 error 枚举）。不要上状态机库。

### 提示一

`useRef<HTMLInputElement>(null)`。`noUncheckedIndexedAccess` 与 ref：调用 `input.click()` 前要收窄 `input !== null`。

文件输入是少数可以非受控的控件（01 / code-review 也允许）。不要把它的 value 写成 React state。

### 提示二

二次点击策略选「忽略」而不是「排队」：

- 排队要自己做文件队列、取消、顺序，本步没有产品需求。
- 忽略 = 忙碌时按钮不可点，且 onChange 再挡一层。
- 并行会重复 AssumeRole + 重复 PUT，也更容易把 CORS / 429 问题放大。

placeholder：本检查点可以先让按钮直接 toast 内核抛出的 message。手填放到检查点 6。

### 完成信号

组件文件不 import Query，不 import 任何 `features/*`。你能指出忙碌旗标在哪、为什么内核不管并发。

### 自检问题

- 为什么不用 Ant `Upload`？
  - 它拥有 `fileList`。RHF 也要拥有封面字符串。两套状态会在 Step 11 爆。隐藏 input 只负责「挑一次 File」。
- 为什么 `onSuccess` 不要在 Button 里 `setFormValue`？
  - 按钮不知道字段名。Step 9 图标、Step 11 封面、Step 13 objectKey 三个调用方。

---

## 检查点 6：placeholder 手填 URL 降级

### 当前问题

本地若没配 `sts_role_arn`，后端仍会 200 + `mode=placeholder`。没有降级，开发者会以为上传坏了，后续页也无法用外链调试表单。

### 任务

当 STS 为 placeholder（或内核 throw 出这种模式）时：

- **不要**再调 `put`。
- 提供一个输入框（可以在 Button 旁，或点按钮后出现）。用户粘贴 `https://...`，确认后走**同一份** `onSuccess`。
- 手填结果：`url` 为用户输入（trim 后非空）；`objectKey` 可以等于该字符串（后端 `NormalizeObjectRef` 对外链会原样保留）。不要把外链假装成 `essay-mvp/...`。
- 空串不能确认。

公开 / 私有在 placeholder 下都走手填——本地本来就没有私有 Bucket。不要为降级再造一套假 STS。

### 提示一

判别时机两种都能做，选一种并说得出理由：

- A：按钮挂载或每次点击先 `fetchUploadSts()`，placeholder 则切输入框。
- B：走 `uploadObject`，catch 到 placeholder 再切输入框。

A 少一次「注定失败的 put」心智负担；B 少一次重复 STS 调用。不要两种都做。

### 提示二

手填是开发 / 降级路径，不是生产主路径。UI 可以朴素（`Input` + 确认），不要做成完整 OSS 控制台。文案点明「当前无法直传，请粘贴 URL」。

### 完成信号

你能演示：把后端 STS 想成 placeholder 时，不打开 Network 里的 OSS 主机请求，仍能把一个 URL 交给 `onSuccess`。

### 自检问题

- 为什么不在 placeholder 时静默写死一张示例图 URL？
  - 那会让后续 CRUD 把假数据写入真实库。手填是开发者知情的降级。

---

## 检查点 7：在已有占位页临时接线，测完删掉

### 当前问题

01 禁止演示路由。没有接线又测不了 PUT。和 Step 5 一样：借用已有 Empty 页，验收前还原。

### 任务

挑一个仍是 `Empty` 的占位页（推荐 [`ArticlePage.tsx`](../src/features/article/pages/ArticlePage.tsx)，Step 11 本来就要重写）。临时：

1. 两个按钮：公开 `covers` + `accept="image/*"`；私有 `downloads`（`accept` 可先不限）。
2. 成功后把 `url` / `objectKey` 显示在页上（纯文本即可）。
3. placeholder 时手填也能显示。
4. **不要** `post('/articles')`、不要存进 Query。

测完（检查点 8 矩阵打勾后）把该页还原成 Empty。`shared/oss` 留下，占位页不留 import。

### 提示一

接线可以用最直的 `useState<string>('')` 显示结果。这是临时 UI 态，不是第二份服务器列表。

失败 toast 用 `App.useApp()`。不要 `import { message } from 'antd'`。

### 提示二

若公开上传成功但新标签打开 URL 是 403：

1. 对象是否 `public-read`。
2. CORS 拦的是 PUT，不是 GET；GET 403 是 ACL / CDN，不是 CORS。
3. `cdnDomain` 若指向尚未启用的 CDN，会打不开——以 STS 实际返回为准，空则走 `bucket.endpoint` 直链。

若浏览器 Console 对 PUT 报 CORS：去 Bucket 控制台把 Origin 加上 `http://localhost:5174`（Methods 含 PUT / POST / HEAD，Expose-Headers 含 `ETag, x-oss-request-id`）。不要把 OSS 域名写进 Vite proxy 冒充修复。

### 完成信号

你用真图走通公开模式，用任意文件走通私有模式的 objectKey 形态；并且知道还原占位页是验收的一部分，不是可选项。

### 自检问题

- 为什么测完要删接线？
  - 留下就是演示页。01 审查会当作未完成的 throwaway。
- 为什么不在 TagPage 上挂？
  - 标签页已是正式 CRUD。临时按钮会污染 Step 6 的验收形态。

---

## 检查点 8：完整验收

### 自动验证

在 `Admin-React/` 目录执行：

```bash
pnpm verify
pnpm build
```

预期：Oxlint、严格 TypeScript、生产构建通过。不要求 `pnpm test`。

### 手动验证矩阵

前置：`pnpm dev` 在 **5174**；已登录；后端开着。Bucket CORS 已覆盖 5174（`mode=oss` 时）。

- STS
  - Network：`POST /admin/api/v1/upload/sts`，`code === 0`。
  - 能口头区分 `oss` / `placeholder`，且 placeholder 不是 toast 成「请求失败」那种 `ApiError` 误报（除非你真的 401/500）。
- 公开上传（`mode=oss`）
  - 选图片，得到 HTTPS URL；新标签可打开（或 CDN 未启用时 OSS 直链可打开）。
  - objectKey 含当天 `dir` + `covers/`。
- 私有上传
  - 结果的 objectKey 含 `downloads/`。
  - 不要用「直链必须能打开」当私有验收。
- placeholder
  - 不出现对 `*.aliyuncs.com` 的 PUT。
  - 手填 URL 后 `onSuccess` 收到该值。
- 并发
  - 上传中按钮不可点；没有两条并行 PUT。
- 边界
  - 逻辑在 `shared/oss`；无 `features/a` import `features/b`。
  - 无新路由；占位页已还原。
  - 无 `useQuery(['sts'])`；无 `any`；拦截器仍无 `message`。
  - 源码搜不到本步留下的演示文案（「OSS 试验」之类）。

### 代码审查时自搜

```text
useQuery
queryKey: ['sts'
from 'antd' 的静态 message
new OSS
upload/sts
fileList
useEffect
features/article
OssUpload
```

预期：`new OSS` / `upload/sts` 只在 `shared/oss`；`useQuery` 不因本步增加 STS；`fileList` 不应作为上传主状态；占位页不应再出现 `OssUpload`。

按 [03 验收协议](./03-开发计划.md) 发审查时，把本矩阵勾过去。

---

## 6. 失败时的最短排查路径

### `POST /upload/sts` 401

未登录，或 token 没带上。先走登录页。不要给 STS 开匿名。

### 返回 `mode=placeholder`

`config.yaml` 缺 endpoint / bucket / AK / `sts_role_arn`。这是合法降级，不是前端 bug。配好后重启后端再测直传。

### `failed to issue oss sts credentials`

后端 AssumeRole 失败（RAM / 角色信任 / ARN）。见 oss-setup-guide「常见授权错误」。前端没有可修的字段。

### 浏览器 CORS 挡住 PUT

Origin 还是只写了 `5173`。补 `http://localhost:5174`。预检失败时 Network 里 STS 是成功的，失败的是 OSS 主机。

### PUT 403，XML 里有 `AssumedRoleUser`

角色缺 `oss:PutObject`，或 objectKey 不在当天 `dir` 下。先打印你实际 put 的 key，对照 STS 响应里的 `dir`。

### PUT 成功，URL 403

公开模式没设 `public-read`，或 `cdnDomain` 指向未就绪 CDN。私有模式 403 是预期。

### `SignatureDoesNotMatch`

region / endpoint / `authorizationV4` 与 Bucket 不一致。用 STS 返回的 `region`、`endpoint`、`bucket`，不要手写广州以外的 region。系统时间偏差过大也会签挂。

### `import OSS` 类型报错

`verbatimModuleSyntax` + CJS。只改 import 写法，不改 tsconfig 逃生。

### 点按钮没反应

`ref` 仍是 `null`，或忙碌旗标没清（throw 在 `finally` 之前 return）。`input` 必须始终挂在树上，不要 `loading && <input>`。

### 同一文件第二次选无效

没清 `input.value`。原生 file input 在 value 不变时不触发 `change`。

### 工作目录不对

`pnpm add` / `pnpm verify` 在 `Admin-React/`，不在仓库根。

---

## 7. 完成后应能口头回答

1. 为什么 STS 不能进 Query？placeholder 为什么不是 `ApiError`？
2. 为什么 objectKey 必须使用接口返回的 `dir`？
3. 公开和私有差在哪一层？为什么内核仍返回 url + objectKey？
4. 为什么上传内核不能 import React？
5. 为什么隐藏 input，而不是 Ant Upload？
6. 上传中再点为什么选忽略而不是队列？
7. 为什么禁止 `/oss-demo` 路由？临时接线为什么必须删？
8. OSS PUT 为什么不走 Vite proxy？5174 和 5173 的 CORS 差在哪？
9. 本步为什么不写文章页封面表单？
10. 若以后要复用 STS，缓存该放哪？天花板是什么？

---

## 8. 快速上手总结

### 必须掌握

- **对照源在后端**：STS 字段、`subdir`、公开 URL 公式、私有存 objectKey。不需要 `Admin/src`。
- **三文件职责**：`api` 判别 mode；`upload` 只 put；Button 只拥有 input 与忙碌。
- **ACL 与入库口径**：公开 `public-read` + URL；私有保持私有 + objectKey。
- **placeholder 是成功响应**：降级手填，不要当成 HTTP 失败。
- **并发 = 忽略**：一个忙碌旗标。

### 按需了解

- STS 模块层按 `expiration` 复用：本步不做。若做，必须考虑跨日 `dir`，且仍不进 Query。
- `refreshSTSToken`：ali-oss 支持自动续期，本步每次 POST 更短。
- 分片 / `multipartUpload`：后台封面和资料一期用不到。
- Vue Admin 的按钮实现、内存缓存、文件名细节：不搬。
- schema 单测：Step 16。

### 下一步

Step 8 验收通过后再进入 Step 9：

- 运营三页会第一次**正式**消费 `OssUploadButton`（首页图标）。
- 本步不要提前写 home-block / ad-slot 的真 CRUD。

---

## 9. 未验证项

- 本文没有替你实现 `upload.ts` / `OssUploadButton` 源码，因此不能声称「按本文复制即可运行」。
- 未在隔离空目录复现（本步是累计项目，依赖 Step 1–5 的仓库状态）。
- 未代替你调用真实 Bucket：`mode=oss` 的 PUT / CORS / ACL 取决于本机 `config.yaml` 与阿里云控制台。
- 完成实现后，请以 `pnpm verify`、`pnpm build` 和「手动验证矩阵」为最终验收依据。
