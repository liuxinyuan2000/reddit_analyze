import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import OpenAI from 'openai';
import { 
  checkUserMessageLimit, 
  incrementUserMessageCount, 
  DAILY_MESSAGE_LIMIT 
} from '../../utils/messageLimit';

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

// 从链接或文本提取subreddit名称
function extractSubredditFromInput(input: string): string {
  // 移除前后空格
  input = input.trim();
  
  // 检查是否是简单的subreddit名称 (例如 "askreddit")
  if (!input.includes('/') && !input.includes('.')) {
    return input.replace(/^r\//, '');
  }
  
  try {
    // 尝试处理作为完整URL的输入
    let url: URL;
    
    // 如果没有http(s)前缀，添加它
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      url = new URL(`https://${input}`);
    } else {
      url = new URL(input);
    }
    
    // 检查是否是reddit域名
    if (!url.hostname.includes('reddit.com')) {
      throw new Error('不是有效的Reddit链接');
    }
    
    // 从路径中提取subreddit名称
    const pathParts = url.pathname.split('/').filter(part => part);
    
    // reddit链接格式通常是 /r/subreddit_name/...
    if (pathParts.length >= 2 && pathParts[0].toLowerCase() === 'r') {
      return pathParts[1];
    } else {
      throw new Error('无法从链接中提取subreddit');
    }
  } catch (err) {
    // 如果上面的解析失败，尝试使用正则表达式
    const redditRegex = /(?:^|(?:https?:\/\/)?(?:www\.)?reddit\.com\/)?r\/([a-zA-Z0-9_]+)(?:\/|$)/i;
    const match = input.match(redditRegex);
    
    if (match && match[1]) {
      return match[1];
    }
    
    // 尝试移除前缀 "r/"
    if (input.startsWith('r/')) {
      return input.substring(2);
    }
    
    return input;
  }
}

// 获取评论的函数
async function getCommentsForPost(subreddit: string, postId: string, limit: number = 5): Promise<any[]> {
  try {
    const response = await axios.get(`https://www.reddit.com/r/${subreddit}/comments/${postId}.json`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    if (response.status !== 200 || !response.data || !Array.isArray(response.data) || response.data.length < 2) {
      console.error('无效的评论响应格式');
      return [];
    }
    
    // Reddit API返回一个数组，第二个元素包含评论
    const commentsListing = response.data[1];
    if (!commentsListing || !commentsListing.data || !commentsListing.data.children) {
      return [];
    }
    
    const comments = commentsListing.data.children
      .filter((comment: any) => comment.kind === 't1' && comment.data && !comment.data.stickied)
      .slice(0, limit)
      .map((comment: any) => ({
        author: comment.data.author,
        body: comment.data.body,
        score: comment.data.score,
        created: comment.data.created_utc
      }));
    
    return comments;
  } catch (error) {
    console.error(`获取评论失败:`, error);
    return [];
  }
}

// 获取 subreddit 内容作为上下文
async function getSubredditContext(subredditInput: string): Promise<string> {
  try {
    // 从输入中提取subreddit名称
    const cleanSubreddit = extractSubredditFromInput(subredditInput);
    
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
            author: 'user1',
            id: 'mock_post_1'
          }
        },
        {
          data: {
            title: `这是 r/${cleanSubreddit} 的模拟帖子 2`,
            selftext: `这是另一个模拟帖子。实际使用时，这里将显示真实的 Reddit 内容。`,
            score: 75,
            num_comments: 15,
            author: 'user2',
            id: 'mock_post_2'
          }
        }
      ];
    }
    
    // 构建上下文字符串
    let context = `以下是来自 r/${cleanSubreddit} 的热门帖子:\n\n`;
    
    // 添加帖子和评论内容
    for (let i = 0; i < posts.length && i < 5; i++) {
      const post = posts[i].data;
      const { title, selftext, score, num_comments, author, id } = post;
      
      context += `帖子 ${i + 1}:\n`;
      context += `标题: ${title}\n`;
      
      if (selftext && selftext.length > 0) {
        // 限制文本长度
        const truncatedText = selftext.length > 500 ? selftext.substring(0, 500) + '...' : selftext;
        context += `内容: ${truncatedText}\n`;
      }
      
      context += `得分: ${score}, 评论数: ${num_comments}, 作者: ${author}\n\n`;
      
      // 获取并添加评论
      if (useRealData && id) {
        try {
          const comments = await getCommentsForPost(cleanSubreddit, id, 3); // 每篇帖子获取3条评论
          
          if (comments && comments.length > 0) {
            context += `该帖子的热门评论:\n`;
            
            comments.forEach((comment, commentIndex) => {
              const truncatedComment = comment.body.length > 300 ? comment.body.substring(0, 300) + '...' : comment.body;
              context += `  评论 ${commentIndex + 1}: "${truncatedComment}" (作者: ${comment.author}, 得分: ${comment.score})\n`;
            });
            
            context += '\n';
          }
        } catch (commentError) {
          console.error(`获取帖子 ${id} 的评论失败:`, commentError);
        }
      } else if (!useRealData) {
        // 添加模拟评论数据
        context += `该帖子的热门评论 (模拟数据):\n`;
        context += `  评论 1: "这是一条模拟评论。" (作者: mock_user1, 得分: 50)\n`;
        context += `  评论 2: "由于API限制，无法获取真实评论。" (作者: mock_user2, 得分: 30)\n\n`;
      }
    }
    
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
    const { message, subreddit, conversationId, userId = 'anonymous' } = req.body;

    if (!message) {
      return res.status(400).json({ error: '消息不能为空' });
    }
    
    // 检查OpenAI API密钥是否设置
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API密钥未设置，请在环境变量中设置OPENAI_API_KEY' });
    }

    // 检查用户是否超过了每日消息限制
    if (checkUserMessageLimit(userId)) {
      return res.status(429).json({ 
        error: `您今日的免费消息已用完（${DAILY_MESSAGE_LIMIT}条/天），请明天再来。` 
      });
    }
    
    // 增加消息计数
    incrementUserMessageCount(userId);

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
          const extractedSubreddit = extractSubredditFromInput(subreddit);
          conversation.messages.push({
            role: 'system',
            content: `你是一个专门分析 Reddit 社区的 AI 助手。你的任务是根据 r/${extractedSubreddit} 的内容，回答用户的问题。以下是 r/${extractedSubreddit} 的一些热门帖子内容和评论，请基于这些内容进行回答：\n\n${context}`
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
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // 添加助手消息到对话历史
      conversation.messages.push({ 
        role: 'assistant', 
        content: assistantMessage 
      });

      // 发送结束标志
      res.write('data: [DONE]\n\n');
      res.end();
      console.log('响应结束');
    } catch (openaiError: any) {
      console.error('OpenAI API 错误:', openaiError);
      
      // 发送错误消息
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: `OpenAI API 错误: ${openaiError.message}` })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }
  } catch (error: any) {
    console.error('API 处理错误:', error);
    
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: `服务器错误: ${error.message}` })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
}
