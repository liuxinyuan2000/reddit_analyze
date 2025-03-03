import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Box,
  Flex,
  Text,
  Heading,
  VStack,
  Image,
  useToast,
  Spinner,
  Center,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
} from '@chakra-ui/react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  messageCount: number;
  freeMessageLimit: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
}

export function PaymentModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  messageCount,
  freeMessageLimit,
}: PaymentModalProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [paymentStep, setPaymentStep] = useState<'select' | 'pay'>('select');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const toast = useToast();

  // 产品列表
  const monthlyProducts: Product[] = [
    {
      id: 'basic_monthly',
      name: '基础版',
      price: 19.9,
      description: '适合个人用户',
      features: ['每月500条消息', '基本Reddit社区分析功能'],
    },
    {
      id: 'pro_monthly',
      name: '专业版',
      price: 39.9,
      description: '适合内容创作者',
      features: ['无限消息', '高级分析功能', '数据导出功能'],
      popular: true,
    },
    {
      id: 'enterprise_monthly',
      name: '企业版',
      price: 99.9,
      description: '适合专业团队',
      features: ['无限消息', '多社区批量分析', '定制化报告', '优先客服支持'],
    },
  ];

  const yearlyProducts: Product[] = [
    {
      id: 'basic_yearly',
      name: '基础版',
      price: 202.9,
      description: '适合个人用户 (省17%)',
      features: ['每月500条消息', '基本Reddit社区分析功能'],
    },
    {
      id: 'pro_yearly',
      name: '专业版',
      price: 406.9,
      description: '适合内容创作者 (省15%)',
      features: ['无限消息', '高级分析功能', '数据导出功能'],
      popular: true,
    },
    {
      id: 'enterprise_yearly',
      name: '企业版',
      price: 1018.9,
      description: '适合专业团队 (省15%)',
      features: ['无限消息', '多社区批量分析', '定制化报告', '优先客服支持'],
    },
  ];

  // 创建支付订单
  const createOrder = async (productId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          userId: 'user_' + Date.now(), // 在实际应用中，应该使用真实的用户ID
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '创建订单失败');
      }

      setOrderId(data.orderId);
      // 不再使用后端返回的二维码，而是使用静态图片
      setPaymentStep('pay');
      setPaymentStatus('pending');
      
      console.log(`创建订单成功: ${data.orderId}, 产品: ${data.productName}, 金额: ¥${data.amount}`);
    } catch (error: any) {
      toast({
        title: '创建订单失败',
        description: error.message || '请稍后再试',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 选择产品并创建订单
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    createOrder(product.id);
  };

  // 查询订单状态
  const checkOrderStatus = async () => {
    if (!orderId) return;

    try {
      const response = await fetch(`/api/payment/query-order?orderId=${orderId}`);
      const data = await response.json();

      if (data.status === 'success') {
        setPaymentStatus('success');
        toast({
          title: '支付成功',
          description: '您的会员已激活',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        // 通知父组件支付成功
        onPaymentSuccess();
        
        // 关闭模态框
        setTimeout(() => {
          onClose();
          setPaymentStep('select');
          setOrderId(null);
          setQrcode(null);
          setSelectedProduct(null);
        }, 2000);
      } else if (data.status === 'failed') {
        setPaymentStatus('failed');
        toast({
          title: '支付失败',
          description: data.message || '请重新尝试',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('查询订单状态失败:', error);
    }
  };
  
  // 确认支付成功
  const handleMockPayment = () => {
    setPaymentStatus('success');
    toast({
      title: '支付成功',
      description: '您的会员已激活',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
    
    // 通知父组件支付成功
    onPaymentSuccess();
    
    // 关闭模态框
    setTimeout(() => {
      onClose();
      setPaymentStep('select');
      setOrderId(null);
      setQrcode(null);
      setSelectedProduct(null);
    }, 2000);
  };

  // 定期查询订单状态
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (paymentStep === 'pay' && orderId && paymentStatus === 'pending') {
      intervalId = setInterval(checkOrderStatus, 3000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [paymentStep, orderId, paymentStatus]);

  // 返回产品选择页
  const handleBackToSelect = () => {
    setPaymentStep('select');
    setOrderId(null);
    setQrcode(null);
    setSelectedProduct(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent>
        <ModalHeader bg="blue.500" color="white" borderTopRadius="md">
          <Flex alignItems="center">
            <Image
              src="https://img.icons8.com/fluency/48/000000/diamond.png"
              alt="Premium"
              boxSize="32px"
              mr={2}
            />
            升级到高级版
          </Flex>
        </ModalHeader>
        <ModalCloseButton color="white" />

        {paymentStep === 'select' ? (
          <ModalBody py={6}>
            <VStack spacing={6} align="stretch">
              <Box textAlign="center">
                <Heading size="md" mb={2}>您已达到免费消息限制</Heading>
                <Text>您已经使用了 {messageCount} 条消息，免费版限制为 {freeMessageLimit} 条。</Text>
              </Box>

              <Tabs isFitted variant="enclosed" colorScheme="blue">
                <TabList mb="1em">
                  <Tab>月度订阅</Tab>
                  <Tab>年度订阅</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel>
                    <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
                      {monthlyProducts.map((product) => (
                        <Box
                          key={product.id}
                          p={5}
                          borderWidth={product.popular ? 2 : 1}
                          borderColor={product.popular ? 'blue.500' : 'gray.200'}
                          borderRadius="lg"
                          flex={1}
                          bg={product.popular ? 'blue.50' : 'white'}
                          boxShadow="md"
                          position="relative"
                          transition="all 0.3s"
                          _hover={{ transform: 'translateY(-5px)', boxShadow: 'lg' }}
                        >
                          {product.popular && (
                            <Badge
                              position="absolute"
                              top="-3"
                              right="-3"
                              bg="blue.500"
                              color="white"
                              fontSize="xs"
                              fontWeight="bold"
                              px={2}
                              py={1}
                              borderRadius="full"
                            >
                              推荐
                            </Badge>
                          )}

                          <Text color={product.popular ? 'blue.600' : 'gray.500'} fontWeight="bold">
                            {product.name}
                          </Text>
                          <Heading size="xl" my={2}>
                            ¥{product.price}
                            <Text as="span" fontSize="md">/月</Text>
                          </Heading>
                          <Text color={product.popular ? 'blue.600' : 'gray.600'} mb={4}>
                            {product.description}
                          </Text>

                          <VStack align="start" spacing={2} mb={4}>
                            {product.features.map((feature, index) => (
                              <Flex key={index} align="center">
                                <Text color="green.500" mr={2}>✓</Text>
                                <Text>{feature}</Text>
                              </Flex>
                            ))}
                          </VStack>

                          <Button
                            colorScheme="blue"
                            width="100%"
                            variant={product.popular ? 'solid' : 'outline'}
                            onClick={() => handleSelectProduct(product)}
                            isLoading={isLoading && selectedProduct?.id === product.id}
                          >
                            选择此套餐
                          </Button>
                        </Box>
                      ))}
                    </Flex>
                  </TabPanel>
                  <TabPanel>
                    <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
                      {yearlyProducts.map((product) => (
                        <Box
                          key={product.id}
                          p={5}
                          borderWidth={product.popular ? 2 : 1}
                          borderColor={product.popular ? 'blue.500' : 'gray.200'}
                          borderRadius="lg"
                          flex={1}
                          bg={product.popular ? 'blue.50' : 'white'}
                          boxShadow="md"
                          position="relative"
                          transition="all 0.3s"
                          _hover={{ transform: 'translateY(-5px)', boxShadow: 'lg' }}
                        >
                          {product.popular && (
                            <Badge
                              position="absolute"
                              top="-3"
                              right="-3"
                              bg="blue.500"
                              color="white"
                              fontSize="xs"
                              fontWeight="bold"
                              px={2}
                              py={1}
                              borderRadius="full"
                            >
                              推荐
                            </Badge>
                          )}

                          <Text color={product.popular ? 'blue.600' : 'gray.500'} fontWeight="bold">
                            {product.name}
                          </Text>
                          <Heading size="xl" my={2}>
                            ¥{product.price}
                            <Text as="span" fontSize="md">/年</Text>
                          </Heading>
                          <Text color={product.popular ? 'blue.600' : 'gray.600'} mb={4}>
                            {product.description}
                          </Text>

                          <VStack align="start" spacing={2} mb={4}>
                            {product.features.map((feature, index) => (
                              <Flex key={index} align="center">
                                <Text color="green.500" mr={2}>✓</Text>
                                <Text>{feature}</Text>
                              </Flex>
                            ))}
                          </VStack>

                          <Button
                            colorScheme="blue"
                            width="100%"
                            variant={product.popular ? 'solid' : 'outline'}
                            onClick={() => handleSelectProduct(product)}
                            isLoading={isLoading && selectedProduct?.id === product.id}
                          >
                            选择此套餐
                          </Button>
                        </Box>
                      ))}
                    </Flex>
                  </TabPanel>
                </TabPanels>
              </Tabs>

              <Box textAlign="center" mt={2}>
                <Text fontSize="sm" color="gray.500">所有套餐均支持7天无理由退款</Text>
                <Flex justify="center" mt={2}>
                  <Image src="https://img.icons8.com/color/48/000000/visa.png" height="20px" mx={1} />
                  <Image src="https://img.icons8.com/color/48/000000/mastercard.png" height="20px" mx={1} />
                  <Image src="https://img.icons8.com/color/48/000000/alipay.png" height="20px" mx={1} />
                  <Image src="https://img.icons8.com/color/48/000000/weixing.png" height="20px" mx={1} />
                </Flex>
              </Box>
            </VStack>
          </ModalBody>
        ) : (
          <ModalBody py={6}>
            <VStack spacing={6} align="center">
              {paymentStatus === 'pending' ? (
                <>
                  <Heading size="md">请使用微信扫码支付</Heading>
                  <Text textAlign="center">
                    您选择了 <strong>{selectedProduct?.name}</strong>，
                    金额 <strong>¥{selectedProduct?.price}</strong>
                  </Text>
                  
                  <Box borderWidth={1} borderRadius="md" p={4} bg="white">
                    <Image 
                      src="/images/payment-qr.jpg" 
                      alt="微信支付二维码" 
                      maxWidth="300px" 
                      maxHeight="300px" 
                      objectFit="contain" 
                    />
                  </Box>
                  
                  <Text fontSize="sm" color="gray.500">
                    请使用微信扫描二维码完成支付
                  </Text>
                  
                  <Box mt={4} p={4} borderWidth="1px" borderRadius="md" bg="gray.50">
                    <Text fontWeight="bold" color="red.500" mb={2}>
                      请扫码支付 {selectedProduct?.price.toFixed(2)} 元
                    </Text>
                    <Text fontSize="sm" color="gray.600" mb={2}>
                      支付完成后，请点击下方按钮确认支付
                    </Text>
                    <Button 
                      mt={2} 
                      colorScheme="green" 
                      onClick={handleMockPayment}
                      size="sm"
                    >
                      我已完成支付
                    </Button>
                  </Box>
                </>
              ) : paymentStatus === 'success' ? (
                <>
                  <Box
                    borderRadius="full"
                    bg="green.100"
                    p={4}
                    color="green.500"
                    fontSize="5xl"
                  >
                    ✓
                  </Box>
                  <Heading size="md" color="green.500">支付成功</Heading>
                  <Text>您的会员已激活，感谢您的支持！</Text>
                </>
              ) : (
                <>
                  <Box
                    borderRadius="full"
                    bg="red.100"
                    p={4}
                    color="red.500"
                    fontSize="5xl"
                  >
                    ✗
                  </Box>
                  <Heading size="md" color="red.500">支付失败</Heading>
                  <Text>支付遇到问题，请重新尝试</Text>
                  <Button colorScheme="blue" onClick={handleBackToSelect}>
                    返回选择套餐
                  </Button>
                </>
              )}
            </VStack>
          </ModalBody>
        )}

        <ModalFooter bg="gray.50" borderBottomRadius="md">
          {paymentStep === 'select' ? (
            <Button variant="ghost" onClick={onClose}>
              稍后再说
            </Button>
          ) : paymentStatus === 'pending' ? (
            <Button variant="ghost" onClick={handleBackToSelect}>
              返回选择套餐
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              关闭
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
