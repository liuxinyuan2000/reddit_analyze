import axios, { AxiosError } from 'axios';

interface RedditPost {
  data: {
    title: string;
    score: number;
    num_comments: number;
    selftext?: string;
    author: string;
    created_utc: number;
    url: string;
    is_self: boolean;
  };
}

export async function getSubredditContext(subreddit: string): Promise<string> {
  if (!subreddit || typeof subreddit !== 'string') {
    return '请提供有效的 subreddit 名称。';
  }

  // 移除可能的 'r/' 前缀
  const cleanSubreddit = subreddit.replace(/^r\//, '');

  try {
    const response = await axios.get(
      `https://www.reddit.com/r/${cleanSubreddit}/hot.json`,
      {
        params: {
          limit: 10,
          raw_json: 1
        },
        headers: {
          'User-Agent': 'Reddit-Demand-Analyzer/1.0'
        },
        timeout: 5000 // 5秒超时
      }
    );

    if (!response.data?.data?.children?.length) {
      return `未在 r/${cleanSubreddit} 找到任何帖子。请确保该 subreddit 存在且有公开内容。`;
    }

    const posts = response.data.data.children as RedditPost[];
    
    // 提取帖子信息
    const postsInfo = posts.map(post => {
      const data = post.data;
      return {
        title: data.title?.trim() || '无标题',
        score: data.score || 0,
        num_comments: data.num_comments || 0,
        selftext: data.selftext
          ? data.selftext.substring(0, 300) + (data.selftext.length > 300 ? '...' : '')
          : '',
        author: data.author || '匿名',
        created: new Date(data.created_utc * 1000).toLocaleString('zh-CN'),
        url: data.url,
        is_self: data.is_self
      };
    });

    // 构建更详细的上下文字符串
    const context = `Subreddit: r/${cleanSubreddit}\n\n热门帖子:\n${postsInfo
      .map(
        (post, index) => {
          const postInfo = [
            `${index + 1}. 标题: ${post.title}`,
            `   作者: ${post.author}`,
            `   发布时间: ${post.created}`,
            `   得分: ${post.score}, 评论数: ${post.num_comments}`,
          ];

          if (post.selftext) {
            postInfo.push(`   内容: ${post.selftext}`);
          }

          if (!post.is_self) {
            postInfo.push(`   链接: ${post.url}`);
          }

          return postInfo.join('\n');
        }
      )
      .join('\n\n')}`;

    return context;

  } catch (error) {
    console.error('Error fetching subreddit data:', error);
    
    if (error instanceof AxiosError) {
      if (error.response?.status === 404) {
        return `subreddit "${cleanSubreddit}" 不存在。请检查名称是否正确。`;
      }
      if (error.response?.status === 403) {
        return `无法访问 r/${cleanSubreddit}。该社区可能是私密的或已被封禁。`;
      }
      if (error.code === 'ECONNABORTED') {
        return `请求超时。Reddit 服务器响应时间过长，请稍后重试。`;
      }
    }

    return `获取 r/${cleanSubreddit} 数据时发生错误。请稍后重试。`;
  }
}
