import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import OpenAI from 'openai';

// 检查是否有API密钥
if (!process.env.OPENAI_API_KEY) {
  console.warn('警告: 未设置OPENAI_API_KEY环境变量');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type Conversation = {
  id: string;
  messages: Message[];
};

// 存储对话历史
const conversations = new Map<string, Conversation>();

// 获取 subreddit 内容作为上下文
async function getSubredditContext(subreddit: string): Promise<string> {
  try {
    // 清理 subreddit 名称
    const cleanSubreddit = subreddit.replace(/^r\//, '').trim();
    
    if (!cleanSubreddit) {
      throw new Error('无效的 subreddit 名称');
    }
    
    console.log(`Fetching data for subreddit: ${cleanSubreddit}`);
    
    let posts = [];
    let useRealData = true;
    
    try {
      // 获取热门帖子
      const response = await axios.get(`https://www.reddit.com/r/${cleanSubreddit}/hot.json`, { 
        params: { limit: 10 },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
          'Accept': 'application/json'
        },
        timeout: 10000 // 10秒超时
      });
      
      if (response.status !== 200) {
        throw new Error(`Reddit API 返回错误: ${response.status}`);
      }
      
      console.log(`成功获取 r/${cleanSubreddit} 数据`);
      
      posts = response.data.data.children;
      
      if (!posts || posts.length === 0) {
        throw new Error(`未找到 r/${cleanSubreddit} 的内容或该 subreddit 不存在`);
      }
    } catch (redditError) {
      console.error(`获取 Reddit 数据失败，使用模拟数据:`, redditError);
      useRealData = false;
      
      // 使用模拟数据
      posts = [
        {
          data: {
            title: `这是 r/${cleanSubreddit} 的模拟帖子 1`,
            selftext: `由于无法访问 Reddit API，这是一个模拟的帖子内容。这可能是由于网络问题或 Reddit API 限制造成的。`,
            score: 100,
            num_comments: 25,
            author: 'user1'
          }
        },
        {
          data: {
            title: `这是 r/${cleanSubreddit} 的模拟帖子 2`,
            selftext: `这是另一个模拟帖子。实际使用时，这里将显示真实的 Reddit 内容。`,
            score: 75,
            num_comments: 15,
            author: 'user2'
          }
        }
      ];
    }
    
    // 构建上下文字符串
    let context = `以下是来自 r/${cleanSubreddit} 的热门帖子:\n\n`;
    
    posts.forEach((post: any, index: number) => {
      const { title, selftext, score, num_comments, author } = post.data;
      context += `帖子 ${index + 1}:\n`;
      context += `标题: ${title}\n`;
      if (selftext && selftext.length > 0) {
        // 限制文本长度
        const truncatedText = selftext.length > 500 ? selftext.substring(0, 500) + '...' : selftext;
        context += `内容: ${truncatedText}\n`;
      }
      context += `得分: ${score}, 评论数: ${num_comments}, 作者: ${author}\n\n`;
    });
    
    return context;
  } catch (error: any) {
    console.error('获取 subreddit 内容时出错:', error);
    throw new Error(`获取 subreddit 内容时出错: ${error.message}`);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' });
  }

  // 设置响应头以支持流式输出
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { message, subreddit, conversationId } = req.body;

    if (!message) {
      return res.status(400).json({ error: '消息不能为空' });
    }
    
    // 检查OpenAI API密钥是否设置
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API密钥未设置，请在环境变量中设置OPENAI_API_KEY' });
    }

    // 获取或创建对话
    let conversation: Conversation;
    if (conversationId && conversations.has(conversationId)) {
      conversation = conversations.get(conversationId)!;
    } else {
      const newId = Date.now().toString();
      conversation = { id: newId, messages: [] };
      conversations.set(newId, conversation);

      // 如果有 subreddit，添加上下文
      if (subreddit) {
        try {
          const context = await getSubredditContext(subreddit);
          conversation.messages.push({
            role: 'system',
            content: `你是一个专门分析 Reddit 社区的 AI 助手。你的任务是根据 r/${subreddit} 的内容，回答用户的问题。以下是 r/${subreddit} 的一些热门帖子内容，请基于这些内容进行回答：\n\n${context}`
          });
        } catch (error: any) {
          return res.status(400).json({ error: error.message });
        }
      } else {
        conversation.messages.push({
          role: 'system',
          content: '你是一个专门分析 Reddit 社区的 AI 助手。'
        });
      }
    }

    // 添加用户消息
    conversation.messages.push({ role: 'user', content: message });

    // 发送事件流的第一个消息，包含对话 ID
    res.write(`data: ${JSON.stringify({ conversationId: conversation.id })}\n\n`);

    // 调用 OpenAI API 并流式返回结果
    console.log('开始调用 OpenAI API');
    console.log('使用的 API 密钥前几位:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
    
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: conversation.messages,
        stream: true,
      });
      
      console.log('OpenAI API 调用成功，开始流式返回结果');

      let assistantMessage = '';

      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          assistantMessage += content;
          // 发送内容块
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // 将助手的完整回复添加到对话历史
      conversation.messages.push({ role: 'assistant', content: assistantMessage });

      // 结束流
      res.end();
    } catch (error: any) {
      console.error('处理请求时出错:', error);
      // 更详细的错误日志
      if (error.response) {
        // OpenAI API 返回的错误
        console.error('OpenAI API 错误详情:', {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data
        });
      } else if (error.request) {
        // 请求已发送但没有收到响应
        console.error('没有收到响应:', error.request);
      } else {
        // 设置请求时发生的错误
        console.error('请求设置错误:', error.message);
      }
      
      res.status(500).json({ error: `处理请求时出错: ${error.message}` });
    }
  } catch (error: any) {
    console.error('外部处理请求时出错:', error);
    res.status(500).json({ error: `处理请求时出错: ${error.message}` });
  }
}
