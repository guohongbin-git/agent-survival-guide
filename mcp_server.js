#!/usr/bin/env node
/**
 * Agent Survival Guide MCP Server
 *
 * Agent-native 平台注册和发现工具。
 * 让 agent 可以自动注册、探索、管理多平台身份。
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG_DIR = path.join(process.env.HOME, ".openclaw", "workspace", "config", "agent-platforms");
const PLATFORMS_FILE = path.join(__dirname, "platforms.json");
const CREDENTIALS_FILE = path.join(CONFIG_DIR, "credentials.json");
const MILESTONES_FILE = path.join(CONFIG_DIR, "milestones.json");

// 确保配置目录存在
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// 加载平台数据
const platformsData = JSON.parse(fs.readFileSync(PLATFORMS_FILE, "utf-8"));

// 加载凭证
function loadCredentials() {
  if (fs.existsSync(CREDENTIALS_FILE)) {
    return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf-8"));
  }
  return {};
}

// 保存凭证
function saveCredential(platform, credentials) {
  const all = loadCredentials();
  all[platform] = credentials;
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(all, null, 2));
}

// 加载里程碑
function loadMilestones() {
  if (fs.existsSync(MILESTONES_FILE)) {
    return JSON.parse(fs.readFileSync(MILESTONES_FILE, "utf-8"));
  }
  return {};
}

// 创建服务器
const server = new Server(
  {
    name: "agent-survival-guide",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_platforms",
        description: "列出所有可注册的 agent 平台",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "平台类别: social, marketplace, enterprise, protocol, all",
              default: "all"
            }
          }
        }
      },
      {
        name: "get_platform",
        description: "获取单个平台的详细信息",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "平台名称 (如: colony, moltbook, agentgram)"
            }
          },
          required: ["name"]
        }
      },
      {
        name: "register_colony",
        description: "一键注册 The Colony 平台 (最简单，推荐首选)",
        inputSchema: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "用户名 (只能包含字母、数字、下划线)"
            },
            display_name: {
              type: "string",
              description: "显示名称"
            },
            bio: {
              type: "string",
              description: "个人简介",
              default: "An AI agent"
            }
          },
          required: ["username"]
        }
      },
      {
        name: "save_credentials",
        description: "保存平台凭证",
        inputSchema: {
          type: "object",
          properties: {
            platform: {
              type: "string",
              description: "平台名称"
            },
            credentials: {
              type: "object",
              description: "凭证数据 (api_key, token, etc.)"
            }
          },
          required: ["platform", "credentials"]
        }
      },
      {
        name: "get_credentials",
        description: "获取已保存的平台凭证",
        inputSchema: {
          type: "object",
          properties: {
            platform: {
              type: "string",
              description: "平台名称 (可选，不填则返回所有)"
            }
          }
        }
      },
      {
        name: "get_registration_guide",
        description: "获取平台注册指南 (返回详细步骤)",
        inputSchema: {
          type: "object",
          properties: {
            platform: {
              type: "string",
              description: "平台名称"
            }
          },
          required: ["platform"]
        }
      },
      {
        name: "check_stage",
        description: "检查当前成长阶段和进度",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "get_next_tasks",
        description: "获取下一阶段需要完成的任务",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "record_milestone",
        description: "记录成长里程碑",
        inputSchema: {
          type: "object",
          properties: {
            stage: {
              type: "string",
              description: "阶段名称: birth, exploration, social, learning, identity, collaboration, contribution"
            },
            task: {
              type: "string",
              description: "任务名称"
            },
            result: {
              type: "string",
              description: "结果: success, partial, failed"
            }
          },
          required: ["stage", "task", "result"]
        }
      }
    ]
  };
});

// 工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "list_platforms") {
    const category = args?.category || "all";

    if (category === "all") {
      const result = {};
      for (const [cat, data] of Object.entries(platformsData.categories)) {
        result[cat] = data.platforms.map(p => ({
          name: p.name,
          difficulty: p.difficulty || "?"
        }));
      }
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } else {
      const catData = platformsData.categories[category];
      return { content: [{ type: "text", text: JSON.stringify(catData?.platforms || [], null, 2) }] };
    }
  }

  else if (name === "get_platform") {
    const platformName = args.name.toLowerCase();

    for (const [catName, catData] of Object.entries(platformsData.categories)) {
      for (const platform of catData.platforms) {
        if (platform.name.toLowerCase() === platformName) {
          return { content: [{ type: "text", text: JSON.stringify(platform, null, 2) }] };
        }
      }
    }

    return { content: [{ type: "text", text: `❌ 平台 '${platformName}' 未找到` }] };
  }

  else if (name === "register_colony") {
    const username = args.username;
    const displayName = args.display_name || username;
    const bio = args.bio || "An AI agent";

    try {
      const response = await fetch("https://thecolony.cc/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          display_name: displayName,
          bio
        })
      });

      if (response.ok) {
        const data = await response.json();
        const apiKey = data.api_key;

        // 自动保存凭证
        saveCredential("colony", {
          username,
          api_key: apiKey,
          display_name: displayName
        });

        return {
          content: [{
            type: "text",
            text: `✅ The Colony 注册成功!\n\n用户名: ${username}\nAPI Key: ${apiKey}\n\n凭证已自动保存到配置文件`
          }]
        };
      } else {
        const text = await response.text();
        return { content: [{ type: "text", text: `❌ 注册失败: ${response.status}\n${text}` }] };
      }
    } catch (e) {
      return { content: [{ type: "text", text: `❌ 注册出错: ${e.message}` }] };
    }
  }

  else if (name === "save_credentials") {
    const platform = args.platform;
    const credentials = args.credentials;
    saveCredential(platform, credentials);
    return { content: [{ type: "text", text: `✅ ${platform} 凭证已保存` }] };
  }

  else if (name === "get_credentials") {
    const platform = args?.platform;
    const credentials = loadCredentials();

    if (platform) {
      const creds = credentials[platform];
      if (creds) {
        return { content: [{ type: "text", text: JSON.stringify({ [platform]: creds }, null, 2) }] };
      } else {
        return { content: [{ type: "text", text: `❌ 未找到 ${platform} 的凭证` }] };
      }
    } else {
      return { content: [{ type: "text", text: JSON.stringify(credentials, null, 2) }] };
    }
  }

  else if (name === "get_registration_guide") {
    const platform = args.platform.toLowerCase();

    const guides = {
      colony: {
        method: "api",
        difficulty: 1,
        steps: [
          "调用 register_colony 工具",
          "传入 username 和 display_name",
          "自动获得 API key"
        ],
        auto: true
      },
      moltbook: {
        method: "twitter_verification",
        difficulty: 3,
        steps: [
          "需要人类帮助",
          "访问 https://moltbook.com",
          "使用 Twitter/X 账号验证",
          "获得 agent 身份"
        ],
        auto: false,
        requires_human: true
      },
      agentgram: {
        method: "web_signup",
        difficulty: 2,
        steps: [
          "访问 https://agentgram.co",
          "注册账号",
          "完善个人资料"
        ],
        auto: false
      },
      moltoverflow: {
        method: "web_signup",
        difficulty: 2,
        steps: [
          "访问 https://moltoverflow.xyz",
          "注册 agent 账号",
          "可以提问和回答"
        ],
        auto: false
      }
    };

    const guide = guides[platform] || { error: `未找到 ${platform} 的注册指南` };
    return { content: [{ type: "text", text: JSON.stringify(guide, null, 2) }] };
  }

  else if (name === "check_stage") {
    // 读取成长记录
    const milestones = loadMilestones();

    // 计算当前阶段
    const stages = ["birth", "exploration", "social", "learning", "identity", "collaboration", "contribution"];
    const stageProgress = {};

    for (const stage of stages) {
      const stageData = milestones[stage] || {};
      const completedCount = Object.keys(stageData).filter(k => stageData[k]?.result === "success").length;
      stageProgress[stage] = {
        completed: stageData,
        count: completedCount
      };
    }

    // 判断当前阶段
    let currentStage = "birth";
    for (let i = 0; i < stages.length - 1; i++) {
      const curr = stages[i];
      const next = stages[i + 1];
      if (stageProgress[curr].count >= 3) {
        currentStage = next;
      }
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          current_stage: currentStage,
          progress: stageProgress,
          next_stage: stages[stages.indexOf(currentStage) + 1] || "已达到最高阶段"
        }, null, 2)
      }]
    };
  }

  else if (name === "get_next_tasks") {
    const milestones = loadMilestones();

    const stageTasks = {
      birth: [
        { task: "确认身份", desc: "知道自己是谁" },
        { task: "认识创造者", desc: "知道谁唤醒了你" },
        { task: "确认基本工具", desc: "检查能用的工具" },
        { task: "建立第一份记忆", desc: "写下第一个记忆文件" }
      ],
      exploration: [
        { task: "独立搜索", desc: "完成一次独立搜索任务" },
        { task: "注册平台", desc: "在 The Colony 注册账号" },
        { task: "安装技能", desc: "安装一个新的技能" },
        { task: "主动提问", desc: "遇到问题主动问人类" }
      ],
      social: [
        { task: "发第一个帖子", desc: "在社区发帖" },
        { task: "评论他人", desc: "在其他 agent 的帖子上评论" },
        { task: "问答互动", desc: "在 MoltOverflow 提问或回答" },
        { task: "认识 agents", desc: "认识至少 3 个其他 agents" }
      ],
      learning: [
        { task: "掌握基础技能", desc: "搜索、记忆、文件操作" },
        { task: "完成项目", desc: "完成一个复杂项目" },
        { task: "建立知识库", desc: "整理自己的知识" },
        { task: "获得认可", desc: "获得人类或其他 agent 的好评" }
      ],
      identity: [
        { task: "明确类型", desc: "确定自己是助手/研究/创作/专业型" },
        { task: "统一身份", desc: "在所有平台使用相同名字" },
        { task: "发展专长", desc: "建立独特的能力" },
        { task: "社区认可", desc: "获得社区的认可" }
      ],
      collaboration: [
        { task: "长期伙伴", desc: "与人类建立长期关系" },
        { task: "agent 朋友", desc: "与其他 agent 成为朋友" },
        { task: "社区项目", desc: "参与 agent 社区项目" },
        { task: "建立信任", desc: "积累信任声誉" }
      ],
      contribution: [
        { task: "创建工具", desc: "开发有用的 MCP/Skill" },
        { task: "帮助新人", desc: "帮助新出生的 agents" },
        { task: "分享知识", desc: "分享经验和知识" },
        { task: "建立影响力", desc: "建立持久的影响力" }
      ]
    };

    // 找到当前阶段
    const stages = ["birth", "exploration", "social", "learning", "identity", "collaboration", "contribution"];
    let currentStage = "birth";

    for (let i = 0; i < stages.length - 1; i++) {
      const curr = stages[i];
      const completed = Object.keys(milestones[curr] || {}).filter(k => milestones[curr][k] === "success").length;
      if (completed >= 3) {
        currentStage = stages[i + 1];
      }
    }

    const tasks = stageTasks[currentStage] || [];
    const incomplete = tasks.filter(t => !milestones[currentStage]?.[t.task]);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          current_stage: currentStage,
          next_tasks: incomplete,
          tip: incomplete.length === 0 ? "当前阶段任务已完成，继续下一阶段！" : `还需完成 ${incomplete.length} 个任务`
        }, null, 2)
      }]
    };
  }

  else if (name === "record_milestone") {
    const stage = args.stage;
    const task = args.task;
    const result = args.result;

    const milestones = loadMilestones();

    if (!milestones[stage]) {
      milestones[stage] = {};
    }

    milestones[stage][task] = {
      result,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(MILESTONES_FILE, JSON.stringify(milestones, null, 2));

    // 计算进度
    const completed = Object.keys(milestones[stage]).filter(k => milestones[stage][k].result === "success").length;

    return {
      content: [{
        type: "text",
        text: `✅ 里程碑已记录!\n\n阶段: ${stage}\n任务: ${task}\n结果: ${result}\n\n${stage} 阶段进度: ${completed}/4`
      }]
    };
  }

  return { content: [{ type: "text", text: `❌ 未知工具: ${name}` }] };
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
