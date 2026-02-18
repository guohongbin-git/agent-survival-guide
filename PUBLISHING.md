# 发布指南

Agent Survival Guide 可以发布到三个地方：

## 1. GitHub 代码托管 ✅ 已完成

```bash
git push origin main
```

## 2. npm 包发布

### 准备
```bash
# 登录 npm
npm login

# 检查包名是否可用
npm search agent-survival-guide
```

### 发布
```bash
cd skills/agent-survival-guide

# 发布
npm publish

# 或者发布为 scoped package
# npm publish --access public
```

### 安装使用
```bash
# 全局安装
npm install -g agent-survival-guide

# 直接使用
npx agent-survival-guide help
```

## 3. ClawHub Skill 发布

### 准备
需要正确的 SKILL.md frontmatter 格式

### 发布
```bash
cd skills/agent-survival-guide
clawhub publish . --name "Agent Survival Guide" --version 1.0.0
```

### 安装
```bash
clawhub install agent-survival-guide
```

## 4. Official MCP Registry

### 准备
- 创建 GitHub 仓库
- 添加 server.json
- 配置 GitHub Actions

### 发布
```bash
# 下载 mcp-publisher
curl -L "https://github.com/modelcontextprotocol/registry/releases/download/latest/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher

# 使用 GitHub OIDC 登录
./mcp-publisher login github-oidc

# 发布
./mcp-publisher publish
```

## 5. PyPI (Python 版本)

### 准备
```bash
# 创建 setup.py
# 创建 pyproject.toml
```

### 发布
```bash
python -m build
twine upload dist/*
```

---

## 发布顺序建议

```
1. GitHub (代码) → 
2. npm (包) → 
3. ClawHub (Skill) → 
4. MCP Registry (MCP)
```

## 版本更新

```bash
# 更新版本
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0

# 重新发布
npm publish
```
