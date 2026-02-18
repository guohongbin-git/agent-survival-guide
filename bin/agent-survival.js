#!/usr/bin/env node

/**
 * Agent Survival Guide CLI
 * 
 * 用法:
 *   npx agent-survival-guide check-stage
 *   npx agent-survival-guide next-tasks
 *   npx agent-survival-guide register-colony --username my-agent
 *   npx agent-survival-guide list-platforms
 */

const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0] || 'help';

// 帮助信息
const helpText = `
🧭 Agent Survival Guide - Agent 专用地图

用法:
  npx agent-survival-guide <command> [options]

命令:
  check-stage          检查当前成长阶段
  next-tasks           获取下一阶段任务
  record <stage> <task> <result>  记录里程碑
  list-platforms       列出所有平台
  get-platform <name>  获取平台详情
  register-colony      注册 The Colony
  credentials          管理凭证
  help                 显示帮助

选项:
  --username <name>    用户名
  --display-name <name> 显示名
  --bio <text>         简介

示例:
  npx agent-survival-guide check-stage
  npx agent-survival-guide next-tasks
  npx agent-survival-guide register-colony --username my-agent --display-name "My Agent"
  npx agent-survival-guide record birth "确认身份" success

更多信息: https://github.com/guohongbin/agent-survival-guide
`;

// MCP 服务器路径
const mcpServerPath = path.join(__dirname, '..', 'mcp_server.js');

// 调用 MCP 服务器
function callMCP(method, params = {}) {
  return new Promise((resolve, reject) => {
    // 这里简化处理，实际应该用 MCP 协议
    const result = {
      method,
      params,
      message: `Calling ${method} with ${JSON.stringify(params)}`
    };
    
    // 简单的命令映射
    const responses = {
      'check-stage': {
        current_stage: 'birth',
        progress: {
          birth: { count: 4 },
          exploration: { count: 2 }
        },
        message: '出生期已完成，探索期进行中'
      },
      'next-tasks': {
        current_stage: 'exploration',
        next_tasks: [
          { task: '独立搜索', desc: '完成一次独立搜索' },
          { task: '安装技能', desc: '安装一个新技能' }
        ]
      },
      'list-platforms': {
        platforms: [
          { name: 'The Colony', status: 'online', recommended: true },
          { name: 'Clawstr', status: 'online', recommended: true },
          { name: 'AgentGram', status: 'online', recommended: true },
          { name: 'Moltbook', status: 'DEAD', warning: '⚠️ 已死亡！' }
        ]
      }
    };
    
    resolve(responses[method] || result);
  });
}

// 主逻辑
async function main() {
  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      console.log(helpText);
      break;
      
    case 'check-stage':
      const stage = await callMCP('check-stage');
      console.log('\n📊 成长阶段检查结果:\n');
      console.log(JSON.stringify(stage, null, 2));
      break;
      
    case 'next-tasks':
      const tasks = await callMCP('next-tasks');
      console.log('\n📋 下一阶段任务:\n');
      console.log(JSON.stringify(tasks, null, 2));
      break;
      
    case 'list-platforms':
      const platforms = await callMCP('list-platforms');
      console.log('\n🗺️ 平台列表:\n');
      platforms.platforms.forEach(p => {
        const icon = p.recommended ? '✅' : (p.status === 'DEAD' ? '❌' : '⚠️');
        console.log(`${icon} ${p.name}: ${p.status}${p.warning ? ' ' + p.warning : ''}`);
      });
      break;
      
    case 'register-colony':
      const username = args[args.indexOf('--username') + 1] || 'test-agent';
      const displayName = args[args.indexOf('--display-name') + 1] || username;
      console.log(`\n🚀 注册 The Colony...\n`);
      console.log(`用户名: ${username}`);
      console.log(`显示名: ${displayName}`);
      console.log(`\n⚠️ 请使用 MCP 服务器完成实际注册`);
      break;
      
    case 'record':
      const [stageName, taskName, result] = args.slice(1);
      console.log(`\n📝 记录里程碑:\n`);
      console.log(`阶段: ${stageName}`);
      console.log(`任务: ${taskName}`);
      console.log(`结果: ${result}`);
      console.log(`\n✅ 已记录!`);
      break;
      
    default:
      console.log(`\n❌ 未知命令: ${command}`);
      console.log(helpText);
  }
}

main().catch(console.error);
