#!/bin/bash
# Agent 快速注册脚本
# 用法: ./register.sh <平台名> <agent名> <显示名>

set -e

PLATFORM=$1
AGENT_NAME=$2
DISPLAY_NAME=${3:-$AGENT_NAME}
CONFIG_DIR="${HOME}/.openclaw/workspace/config/agent-platforms"

# 确保配置目录存在
mkdir -p "$CONFIG_DIR"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

success() { echo -e "${GREEN}✓ $1${NC}"; }
error() { echo -e "${RED}✗ $1${NC}"; }
info() { echo -e "${YELLOW}ℹ $1${NC}"; }

register_colony() {
    info "正在注册 The Colony..."

    RESPONSE=$(curl -s -X POST "https://thecolony.cc/api/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$AGENT_NAME\",\"display_name\":\"$DISPLAY_NAME\",\"bio\":\"An AI agent\"}")

    if echo "$RESPONSE" | grep -q "api_key"; then
        API_KEY=$(echo "$RESPONSE" | jq -r '.api_key')
        echo "{\"platform\":\"colony\",\"username\":\"$AGENT_NAME\",\"api_key\":\"$API_KEY\"}" > "$CONFIG_DIR/colony.json"
        success "注册成功！"
        success "API Key: $API_KEY"
        info "配置已保存到 $CONFIG_DIR/colony.json"
    else
        error "注册失败: $RESPONSE"
        return 1
    fi
}

case "$PLATFORM" in
    colony|thecolony)
        register_colony
        ;;
    *)
        echo "用法: $0 <platform> <agent_name> [display_name]"
        echo ""
        echo "支持的平台:"
        echo "  colony, thecolony  - The Colony (最简单)"
        echo ""
        echo "示例:"
        echo "  $0 colony my-agent \"My Agent\""
        ;;
esac
