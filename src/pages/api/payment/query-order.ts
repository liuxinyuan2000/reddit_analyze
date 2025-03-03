import type { NextApiRequest, NextApiResponse } from 'next';
// 暂时注释掉，避免构建错误
// import { wechatPayConfig } from '../../../config/wechatpay';
// import { Pay } from 'wechatpay-node-v3';

// 暂时注释掉微信支付初始化功能
/*
const initWechatPay = () => {
  try {
    return new Pay({
      appid: wechatPayConfig.appid,
      mchid: wechatPayConfig.mchid,
      publicKey: wechatPayConfig.privateKey,
      privateKey: wechatPayConfig.privateKey,
      serialNo: wechatPayConfig.serialNo,
      key: wechatPayConfig.apiV3Key,
    });
  } catch (error) {
    console.error('初始化微信支付失败:', error);
    return null;
  }
};
*/

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只支持GET请求' });
  }

  try {
    const { orderId } = req.query;

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ error: '缺少订单ID' });
    }

    // 简化的订单查询逻辑 - 我们始终返回“等待支付”状态
    // 实际支付将通过前端的“我已完成支付”按钮手动确认
    console.log('查询订单:', orderId);
    
    return res.status(200).json({
      success: true,
      orderId,
      status: 'pending',
      message: '等待支付',
      tradeState: 'NOTPAY',
      tradeStateDesc: '等待支付',
      isRealPayment: true
    });
  } catch (error: any) {
    console.error('查询订单失败:', error);
    return res.status(500).json({ 
      error: '查询订单失败', 
      message: error.message || '未知错误' 
    });
  }
}
