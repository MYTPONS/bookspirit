# bookspirit · 书灵

把一本书变成可对话的阅读陪练：用结构化书模定义章节、知识单元和导读人格，再通过 OpenAI 兼容接口提供流式对话。

公开仓库只带一个虚构的演示书模，不包含真实书籍原文或未授权内容。

## 快速开始

```bash
bun install
cp .env.example .env
bun run dev
```

默认地址：`http://localhost:3000`。

## 环境变量

```env
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=replace-me
OPENAI_MODEL=gpt-4o-mini
PORT=3000
```

## 书模

每本书是 `books/<id>/book.jsonc` 一个目录：

- `coach` 定义导读员角色、口吻和互动规则
- `structure` 定义章节、主题和进度单元
- 不含原文，只保存自行整理的结构化元数据

新增一本书：复制 `books/demo-book`，修改 `id`、标题、导读人格和结构。

## 目录

```text
src/       Bun HTTP 服务、书模加载、流式对话
public/    书架、对话页和样式
books/     书模目录
test/      书模加载测试
```

## 版权边界

书模与对话上下文只保存结构元数据。不要提交未经授权的原文、截图或长篇摘录；导入读者自己的电子版时，应确保内容只在本机处理。

## 测试

```bash
bun test
```
