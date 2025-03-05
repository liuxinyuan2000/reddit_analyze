import fs from 'fs';
import path from 'path';

// 消息限制配置
export const DAILY_MESSAGE_LIMIT = 10;

// 用户消息计数接口
export interface UserMessageCount {
  count: number;
  date: string;
  premium?: boolean;
}

// 用户消息计数数据存储接口
export interface MessageCountsData {
  [userId: string]: UserMessageCount;
}

// 数据文件路径
const DATA_FILE = path.join(process.cwd(), 'data', 'message_counts.json');

// 确保数据目录存在
const ensureDataDir = () => {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// 从文件加载数据
export const loadMessageCounts = (): MessageCountsData => {
  ensureDataDir();
  
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('加载消息计数数据失败:', error);
  }
  
  return {};
};

// 保存数据到文件
export const saveMessageCounts = (data: MessageCountsData): void => {
  ensureDataDir();
  
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('保存消息计数数据失败:', error);
  }
};

// 获取用户当日消息计数
export const getUserMessageCount = (userId: string): UserMessageCount => {
  const counts = loadMessageCounts();
  const currentDate = new Date().toDateString();
  
  if (!counts[userId] || counts[userId].date !== currentDate) {
    // 新用户或新的一天，重置计数
    return { count: 0, date: currentDate };
  }
  
  return counts[userId];
};

// 增加用户消息计数
export const incrementUserMessageCount = (userId: string): UserMessageCount => {
  const counts = loadMessageCounts();
  const currentDate = new Date().toDateString();
  
  if (!counts[userId] || counts[userId].date !== currentDate) {
    // 新用户或新的一天，初始化计数
    counts[userId] = { count: 1, date: currentDate };
  } else {
    // 增加现有计数
    counts[userId].count += 1;
  }
  
  saveMessageCounts(counts);
  return counts[userId];
};

// 检查用户是否超过了每日消息限制
export const checkUserMessageLimit = (userId: string): boolean => {
  const userCount = getUserMessageCount(userId);
  
  // 如果用户是高级会员，不受限制
  if (userCount.premium) {
    return false;
  }
  
  return userCount.count >= DAILY_MESSAGE_LIMIT;
};

// 将用户设置为高级会员
export const setPremiumStatus = (userId: string, premium: boolean): void => {
  const counts = loadMessageCounts();
  const currentDate = new Date().toDateString();
  
  if (!counts[userId]) {
    counts[userId] = { count: 0, date: currentDate, premium };
  } else {
    counts[userId].premium = premium;
  }
  
  saveMessageCounts(counts);
};
