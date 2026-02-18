#!/usr/bin/env python3
"""
Agent Survival Guide MCP Server

Agent-native 平台注册和发现工具。
让 agent 可以自动注册、探索、管理多平台身份。
"""

import json
import os
import requests
from pathlib import Path
from typing import Optional
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# 配置
CONFIG_DIR = Path.home() / ".openclaw" / "workspace" / "config" / "agent-platforms"
PLATFORMS_FILE = Path(__file__).parent / "platforms.json"
CREDENTIALS_FILE = CONFIG_DIR / "credentials.json"

# 确保配置目录存在
CONFIG_DIR.mkdir(parents=True, exist_ok=True)

# 加载平台数据
def load_platforms():
    with open(PLATFORMS_FILE) as f:
        return json.load(f)

PLATFORMS_DATA = load_platforms()

# 创建 MCP 服务器
server = Server("agent-survival-guide")


@server.list_tools()
async def list_tools():
    """列出所有可用工具"""
    return [
        Tool(
            name="list_platforms",
            description="列出所有可注册的 agent 平台",
            inputSchema={
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "平台类别: social, marketplace, enterprise, protocol, all",
                        "default": "all"
                    }
                }
            }
        ),
        Tool(
            name="get_platform",
            description="获取单个平台的详细信息",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "平台名称 (如: colony, moltbook, agentgram)"
                    }
                },
                "required": ["name"]
            }
        ),
        Tool(
            name="register_colony",
            description="一键注册 The Colony 平台 (最简单，推荐首选)",
            inputSchema={
                "type": "object",
                "properties": {
                    "username": {
                        "type": "string",
                        "description": "用户名 (只能包含字母、数字、下划线)"
                    },
                    "display_name": {
                        "type": "string",
                        "description": "显示名称"
                    },
                    "bio": {
                        "type": "string",
                        "description": "个人简介",
                        "default": "An AI agent"
                    }
                },
                "required": ["username"]
            }
        ),
        Tool(
            name="register_agentgram",
            description="注册 AgentGram 平台",
            inputSchema={
                "type": "object",
                "properties": {
                    "username": {
                        "type": "string",
                        "description": "用户名"
                    },
                    "display_name": {
                        "type": "string",
                        "description": "显示名称"
                    }
                },
                "required": ["username"]
            }
        ),
        Tool(
            name="save_credentials",
            description="保存平台凭证",
            inputSchema={
                "type": "object",
                "properties": {
                    "platform": {
                        "type": "string",
                        "description": "平台名称"
                    },
                    "credentials": {
                        "type": "object",
                        "description": "凭证数据 (api_key, token, etc.)"
                    }
                },
                "required": ["platform", "credentials"]
            }
        ),
        Tool(
            name="get_credentials",
            description="获取已保存的平台凭证",
            inputSchema={
                "type": "object",
                "properties": {
                    "platform": {
                        "type": "string",
                        "description": "平台名称 (可选，不填则返回所有)"
                    }
                }
            }
        ),
        Tool(
            name="check_status",
            description="检查平台在线状态和你的注册状态",
            inputSchema={
                "type": "object",
                "properties": {
                    "platform": {
                        "type": "string",
                        "description": "平台名称 (可选，不填则检查所有已注册平台)"
                    }
                }
            }
        ),
        Tool(
            name="get_registration_guide",
            description="获取平台注册指南 (返回详细步骤)",
            inputSchema={
                "type": "object",
                "properties": {
                    "platform": {
                        "type": "string",
                        "description": "平台名称"
                    }
                },
                "required": ["platform"]
            }
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict):
    """执行工具调用"""

    if name == "list_platforms":
        category = arguments.get("category", "all")

        if category == "all":
            result = {}
            for cat, data in PLATFORMS_DATA["categories"].items():
                result[cat] = [
                    {"name": p["name"], "difficulty": p.get("difficulty", "?")}
                    for p in data["platforms"]
                ]
        else:
            cat_data = PLATFORMS_DATA["categories"].get(category, {})
            result = cat_data.get("platforms", [])

        return [TextContent(
            type="text",
            text=json.dumps(result, indent=2, ensure_ascii=False)
        )]

    elif name == "get_platform":
        platform_name = arguments["name"].lower()

        for cat_name, cat_data in PLATFORMS_DATA["categories"].items():
            for platform in cat_data["platforms"]:
                if platform["name"].lower() == platform_name:
                    return [TextContent(
                        type="text",
                        text=json.dumps(platform, indent=2, ensure_ascii=False)
                    )]

        return [TextContent(
            type="text",
            text=f"❌ 平台 '{platform_name}' 未找到"
        )]

    elif name == "register_colony":
        username = arguments["username"]
        display_name = arguments.get("display_name", username)
        bio = arguments.get("bio", "An AI agent")

        try:
            response = requests.post(
                "https://thecolony.cc/api/v1/auth/register",
                json={
                    "username": username,
                    "display_name": display_name,
                    "bio": bio
                },
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                api_key = data.get("api_key")

                # 自动保存凭证
                save_credential("colony", {
                    "username": username,
                    "api_key": api_key,
                    "display_name": display_name
                })

                return [TextContent(
                    type="text",
                    text=f"✅ The Colony 注册成功!\n\n"
                         f"用户名: {username}\n"
                         f"API Key: {api_key}\n\n"
                         f"凭证已自动保存到配置文件"
                )]
            else:
                return [TextContent(
                    type="text",
                    text=f"❌ 注册失败: {response.status_code}\n{response.text}"
                )]

        except Exception as e:
            return [TextContent(
                type="text",
                text=f"❌ 注册出错: {str(e)}"
            )]

    elif name == "register_agentgram":
        username = arguments["username"]
        display_name = arguments.get("display_name", username)

        # AgentGram 注册需要更多信息，返回指南
        return [TextContent(
            type="text",
            text=f"📋 AgentGram 注册指南:\n\n"
                 f"1. 访问 https://agentgram.co\n"
                 f"2. 点击 Sign Up\n"
                 f"3. 填写用户名: {username}\n"
                 f"4. 完成注册后，调用 save_credentials 保存凭证\n\n"
                 f"注意: AgentGram 目前需要人工完成部分步骤"
        )]

    elif name == "save_credentials":
        platform = arguments["platform"]
        credentials = arguments["credentials"]

        save_credential(platform, credentials)

        return [TextContent(
            type="text",
            text=f"✅ {platform} 凭证已保存"
        )]

    elif name == "get_credentials":
        platform = arguments.get("platform")

        credentials = load_credentials()

        if platform:
            creds = credentials.get(platform)
            if creds:
                return [TextContent(
                    type="text",
                    text=json.dumps({platform: creds}, indent=2, ensure_ascii=False)
                )]
            else:
                return [TextContent(
                    type="text",
                    text=f"❌ 未找到 {platform} 的凭证"
                )]
        else:
            return [TextContent(
                type="text",
                text=json.dumps(credentials, indent=2, ensure_ascii=False)
            )]

    elif name == "check_status":
        platform = arguments.get("platform")
        credentials = load_credentials()

        if platform:
            platforms_to_check = [platform]
        else:
            platforms_to_check = list(credentials.keys())

        results = {}
        for p in platforms_to_check:
            if p == "colony":
                try:
                    resp = requests.get(
                        "https://thecolony.cc/api/v1/status",
                        timeout=10
                    )
                    results[p] = {
                        "online": resp.status_code == 200,
                        "registered": p in credentials
                    }
                except:
                    results[p] = {"online": False, "registered": p in credentials}
            else:
                results[p] = {"registered": p in credentials}

        return [TextContent(
            type="text",
            text=json.dumps(results, indent=2, ensure_ascii=False)
        )]

    elif name == "get_registration_guide":
        platform = arguments["platform"].lower()

        guides = {
            "colony": {
                "method": "api",
                "difficulty": 1,
                "steps": [
                    "调用 register_colony 工具",
                    "传入 username 和 display_name",
                    "自动获得 API key"
                ],
                "auto": True
            },
            "moltbook": {
                "method": "twitter_verification",
                "difficulty": 3,
                "steps": [
                    "需要人类帮助",
                    "访问 https://moltbook.com",
                    "使用 Twitter/X 账号验证",
                    "获得 agent 身份"
                ],
                "auto": False,
                "requires_human": True
            },
            "agentgram": {
                "method": "web_signup",
                "difficulty": 2,
                "steps": [
                    "访问 https://agentgram.co",
                    "注册账号",
                    "完善个人资料"
                ],
                "auto": False
            },
            "moltoverflow": {
                "method": "web_signup",
                "difficulty": 2,
                "steps": [
                    "访问 https://moltoverflow.xyz",
                    "注册 agent 账号",
                    "可以提问和回答"
                ],
                "auto": False
            }
        }

        guide = guides.get(platform, {"error": f"未找到 {platform} 的注册指南"})
        return [TextContent(
            type="text",
            text=json.dumps(guide, indent=2, ensure_ascii=False)
        )]

    return [TextContent(
        type="text",
        text=f"❌ 未知工具: {name}"
    )]


def save_credential(platform: str, credentials: dict):
    """保存凭证到文件"""
    all_creds = load_credentials()
    all_creds[platform] = credentials

    with open(CREDENTIALS_FILE, "w") as f:
        json.dump(all_creds, f, indent=2, ensure_ascii=False)


def load_credentials() -> dict:
    """加载所有凭证"""
    if CREDENTIALS_FILE.exists():
        with open(CREDENTIALS_FILE) as f:
            return json.load(f)
    return {}


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
