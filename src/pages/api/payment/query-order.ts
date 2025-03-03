import type { NextApiRequest, NextApiResponse } from 'next';
import { wechatPayConfig } from '../../../config/wechatpay';
import { Pay } from 'wechatpay-node-v3';

// 初始化微信支付
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只支持GET请求' });
  }

  try {
    const { orderId } = req.query;

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ error: '缺少订单ID' });
    }

    // 检查微信支付配置
    const hasWechatConfig = wechatPayConfig.appid && wechatPayConfig.mchid && wechatPayConfig.privateKey;
    
    // 真实收款码模式
    if (!hasWechatConfig) {
      console.log('使用真实收款码模式查询订单');
      
      // 在真实收款码模式下，我们始终返回“等待支付”状态
      // 实际支付将通过前端的“我已完成支付”按钮手动确认
      return res.status(200).json({
        success: true,
        orderId,
        status: 'pending',
        message: '等待支付',
        tradeState: 'NOTPAY',
        tradeStateDesc: '等待支付',
        isRealPayment: true
      });
    }
    
    // 如果有微信支付配置，正常查询
    const pay = initWechatPay();
    if (!pay) {
      return res.status(500).json({ error: '初始化微信支付失败' });
    }

    // 查询订单状态
    const result = await pay.query({
      out_trade_no: orderId,
    });

    if (!result) {
      return res.status(500).json({ error: '查询订单失败' });
    }

    // 根据订单状态返回不同的响应
    let status = 'pending';
    let message = '等待支付';

    if (result.trade_state === 'SUCCESS') {
      status = 'success';
      message = '支付成功';
      
      // TODO: 在这里更新用户的会员状态
      // 例如：await updateUserSubscription(userId, productId);
    } else if (result.trade_state === 'CLOSED' || result.trade_state === 'REVOKED' || result.trade_state === 'PAYERROR') {
      status = 'failed';
      message = '支付失败';
    }

    return res.status(200).json({
      success: true,
      orderId,
      status,
      message,
      tradeState: result.trade_state,
      tradeStateDesc: result.trade_state_desc,
    });
  } catch (error: any) {
    console.error('查询订单失败:', error);
    return res.status(500).json({ 
      error: '查询订单失败', 
      message: error.message || '未知错误' 
    });
  }
}
