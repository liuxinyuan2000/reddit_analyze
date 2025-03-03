// 微信支付配置
export const wechatPayConfig = {
  appid: process.env.WECHAT_APPID || '',
  mchid: process.env.WECHAT_MCHID || '',
  privateKey: process.env.WECHAT_PRIVATE_KEY || '',
  serialNo: process.env.WECHAT_SERIAL_NO || '',
  apiV3Key: process.env.WECHAT_API_V3_KEY || '',
  notifyUrl: process.env.WECHAT_NOTIFY_URL || 'https://your-domain.com/api/payment/wechat-notify',
  // 支付产品配置
  products: {
    basicMonthly: {
      id: 'basic_monthly',
      name: '基础版月度订阅',
      price: 1990, // 单位：分，即19.9元
      description: '每月500条消息，基本Reddit社区分析功能'
    },
    proMonthly: {
      id: 'pro_monthly',
      name: '专业版月度订阅',
      price: 3990, // 单位：分，即39.9元
      description: '无限消息，高级分析功能，数据导出'
    },
    enterpriseMonthly: {
      id: 'enterprise_monthly',
      name: '企业版月度订阅',
      price: 9990, // 单位：分，即99.9元
      description: '无限消息，多社区批量分析，定制化报告，优先客服'
    },
    // 年度套餐（8.5折）
    basicYearly: {
      id: 'basic_yearly',
      name: '基础版年度订阅',
      price: 20290, // 单位：分，即202.9元 (19.9 * 12 * 0.85)
      description: '每月500条消息，基本Reddit社区分析功能，年付享8.5折'
    },
    proYearly: {
      id: 'pro_yearly',
      name: '专业版年度订阅',
      price: 40690, // 单位：分，即406.9元 (39.9 * 12 * 0.85)
      description: '无限消息，高级分析功能，数据导出，年付享8.5折'
    },
    enterpriseYearly: {
      id: 'enterprise_yearly',
      name: '企业版年度订阅',
      price: 101890, // 单位：分，即1018.9元 (99.9 * 12 * 0.85)
      description: '无限消息，多社区批量分析，定制化报告，优先客服，年付享8.5折'
    }
  }
};

// 获取产品信息
export function getProductInfo(productId: string) {
  const productsObj = wechatPayConfig.products as Record<string, any>;
  
  // 遍历所有产品，查找匹配的ID
  for (const key in productsObj) {
    if (productsObj[key].id === productId) {
      return productsObj[key];
    }
  }
  
  return null;
}

// 初始化微信支付SDK - 使用动态导入避免构建错误
export function initWechatPay() {
  try {
    // 检查必要的配置是否存在
    if (!wechatPayConfig.appid || !wechatPayConfig.mchid || !wechatPayConfig.privateKey || 
        !wechatPayConfig.serialNo || !wechatPayConfig.apiV3Key) {
      console.error('微信支付配置不完整');
      return null;
    }
    
    // 暂时返回null，避免构建错误
    console.log('微信支付功能暂时关闭');
    return null;
    
    /* 暂时注释掉实际的微信支付初始化代码
    // 引入微信支付SDK
    const WechatPay = require('wechatpay-node-v3');
    
    // 创建微信支付实例
    return new WechatPay({
      appid: wechatPayConfig.appid,
      mchid: wechatPayConfig.mchid,
      publicKey: '', // 微信平台证书，可以留空
      privateKey: wechatPayConfig.privateKey,
      serialNo: wechatPayConfig.serialNo,
      key: wechatPayConfig.apiV3Key,
      certs: {}, // 微信平台证书列表，可以留空
    });
    */
  } catch (error) {
    console.error('初始化微信支付失败:', error);
    return null;
  }
}
