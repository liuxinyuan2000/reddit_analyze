import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserMessageCount, DAILY_MESSAGE_LIMIT } from '../../../utils/messageLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只支持 GET 请求' });
  }

  try {
    const { userId } = req.query;
    
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: '用户ID不能为空' });
    }
    
    const userCount = getUserMessageCount(userId);
    
    return res.status(200).json({
      count: userCount.count,
      limit: DAILY_MESSAGE_LIMIT,
      remaining: Math.max(0, DAILY_MESSAGE_LIMIT - userCount.count),
      premium: !!userCount.premium,
      date: userCount.date
    });
  } catch (error: any) {
    console.error('获取消息计数时出错:', error);
    return res.status(500).json({ error: `获取消息计数时出错: ${error.message}` });
  }
}
