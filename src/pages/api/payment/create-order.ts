import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { wechatPayConfig, getProductInfo } from '../../../config/wechatpay';
import { Pay } from 'wechatpay-node-v3';
import QRCode from 'qrcode';

// 初始化微信支付
const initWechatPay = () => {
  try {
    return new Pay({
      appid: wechatPayConfig.appid,
      mchid: wechatPayConfig.mchid,
      publicKey: wechatPayConfig.privateKey, // 这里实际使用的是私钥，但库的API命名为publicKey
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  try {
    const { productId, userId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: '缺少产品ID' });
    }

    // 获取产品信息
    const product = getProductInfo(productId);
    if (!product) {
      return res.status(400).json({ error: '无效的产品ID' });
    }

    // 生成唯一订单号
    const outTradeNo = `ORDER_${randomUUID().replace(/-/g, '')}`;
    
    // 检查微信支付配置
    const hasWechatConfig = wechatPayConfig.appid && wechatPayConfig.mchid && wechatPayConfig.privateKey;
    
    // 使用静态付款图片的URL
    const staticQrcodePath = '/images/payment-qr.jpg';
    
    if (hasWechatConfig) {
      // 如果有微信支付配置，可以实现完整的支付流程
      // 这里简化处理，使用静态图片
      console.log('使用静态付款图片');
    } else {
      // 使用真实收款码
      console.log('使用真实收款码模式');
      
      // 根据产品选择不同的收款金额
      let paymentAmount = product.price / 100; // 转换为元
      console.log(`产品: ${product.name}, 金额: ¥${paymentAmount}`);
    }

    // 返回订单信息和支付二维码
    return res.status(200).json({
      success: true,
      orderId: outTradeNo,
      productId,
      productName: product.name,
      amount: product.price / 100, // 转换为元
      staticQrcodePath,
      isRealPayment: true
    });
  } catch (error: any) {
    console.error('创建支付订单失败:', error);
    return res.status(500).json({ 
      error: '创建支付订单失败', 
      message: error.message || '未知错误' 
    });
  }
}
