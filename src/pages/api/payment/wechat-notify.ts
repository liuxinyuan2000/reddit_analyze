import type { NextApiRequest, NextApiResponse } from 'next';
// 暂时注释掉，避免构建错误
// import { wechatPayConfig } from '../../../config/wechatpay';
// import { Pay } from 'wechatpay-node-v3';
import getRawBody from 'raw-body';

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

// 这个API路由需要禁用默认的bodyParser
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  try {
    // 获取原始请求体
    const rawBody = await getRawBody(req);
    
    // 简化的通知处理 - 暂时不实现完整的支付功能
    console.log('收到支付通知:', rawBody.toString());
    
    // 直接返回成功响应，不进行实际处理
    return res.status(200).json({
      code: 'SUCCESS',
      message: '支付功能暂时关闭',
    });

    /* 暂时注释掉完整的支付处理逻辑
    // 获取微信支付通知的请求头
    const wechatpaySerial = req.headers['wechatpay-serial'] as string;
    const wechatpaySignature = req.headers['wechatpay-signature'] as string;
    const wechatpayTimestamp = req.headers['wechatpay-timestamp'] as string;
    const wechatpayNonce = req.headers['wechatpay-nonce'] as string;

    if (!wechatpaySerial || !wechatpaySignature || !wechatpayTimestamp || !wechatpayNonce) {
      return res.status(400).json({ error: '缺少必要的请求头' });
    }

    // 初始化微信支付
    const pay = initWechatPay();
    if (!pay) {
      return res.status(500).json({ error: '初始化微信支付失败' });
    }

    // 验证签名
    const verified = pay.verifySign({
      serial: wechatpaySerial,
      message: `${wechatpayTimestamp}\n${wechatpayNonce}\n${rawBody.toString()}\n`,
      signature: wechatpaySignature,
    });

    if (!verified) {
      console.error('微信支付通知签名验证失败');
      return res.status(401).json({ error: '签名验证失败' });
    }

    // 解密通知数据
    const notification = JSON.parse(rawBody.toString());
    const resource = notification.resource;
    const decryptedData = pay.decipher_gcm(
      resource.ciphertext,
      resource.associated_data,
      resource.nonce,
      wechatPayConfig.apiV3Key
    );

    // 解析解密后的数据
    const parsedData = JSON.parse(decryptedData);
    
    // 处理支付成功的逻辑
    if (parsedData.trade_state === 'SUCCESS') {
      const outTradeNo = parsedData.out_trade_no;
      const transactionId = parsedData.transaction_id;
      
      console.log('支付成功:', { outTradeNo, transactionId });
      
      // TODO: 在这里更新数据库中的订单状态
      // 例如：await updateOrderStatus(outTradeNo, 'paid', transactionId);
      
      // TODO: 为用户激活相应的会员权限
      // 例如：await activateSubscription(userId, productId, outTradeNo);
    }
    */

    // 已在上面返回响应
  } catch (error: any) {
    console.error('处理微信支付通知失败:', error);
    return res.status(500).json({ error: '处理通知失败', message: error.message });
  }
}
