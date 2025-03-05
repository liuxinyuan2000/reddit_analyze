'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Input,
  Button,
  Text,
  Container,
  Flex,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { PaymentModal } from './PaymentModal';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  subreddit: string;
}

// 免费用户的每日最大消息数
const DAILY_MESSAGE_LIMIT = 10;

export function ChatInterface({ subreddit }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [error, setError] = useState<string>();
  const [isTyping, setIsTyping] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [messageCount, setMessageCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // 初始化用户ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 从localStorage获取用户ID，如果不存在则创建一个新的
      let storedUserId = localStorage.getItem('userId');
      if (!storedUserId) {
        storedUserId = 'user_' + Date.now();
        localStorage.setItem('userId', storedUserId);
      }
      setUserId(storedUserId);
    }
  }, []);
  
  // 从 localStorage 加载消息计数和会员状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedIsPremium = localStorage.getItem('isPremium');
      
      if (storedIsPremium === 'true') {
        setIsPremium(true);
      }
    }
  }, []);
  
  // 当用户ID初始化后从后端获取消息计数
  useEffect(() => {
    const fetchMessageCount = async () => {
      if (!userId) return;
      
      try {
        const response = await fetch(`/api/user/message-count?userId=${encodeURIComponent(userId)}`);
        const data = await response.json();
        
        if (response.ok) {
          setMessageCount(data.count);
          if (data.premium) {
            setIsPremium(true);
          }
        }
      } catch (error) {
        console.error('获取消息计数失败:', error);
      }
    };
    
    fetchMessageCount();
  }, [userId]);
  
  // 实现光标闪烁效果
  useEffect(() => {
    if (!isTyping) return;
    
    const interval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 500);
    
    return () => clearInterval(interval);
  }, [isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setError(undefined);
    
    const userMessage: Message = {
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // 仅用于UI显示
    const newCount = messageCount + 1;
    setMessageCount(newCount);
    
    // 将消息计数和日期保存到 localStorage (仅用于UI显示)
    if (typeof window !== 'undefined') {
      localStorage.setItem('messageCount', newCount.toString());
      localStorage.setItem('lastMessageDate', new Date().toDateString());
    }

    try {
      // 创建一个占位消息
      const placeholderMessage: Message = {
        role: 'assistant',
        content: '',
      };
      setMessages((prev) => [...prev, placeholderMessage]);

      console.log('Sending request with data:', {
        message: input,
        subreddit,
        conversationId,
        userId,
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message: input,
          subreddit,
          conversationId,
          userId,
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const contentType = response.headers.get('Content-Type');
      console.log('Content type:', contentType);
      
      if (!response.ok) {
        if (contentType?.includes('application/json')) {
          const data = await response.json();
          console.error('Error response:', data);
          throw new Error(data.error || '请求失败');
        }
        const text = await response.text();
        console.error('Error response text:', text);
        throw new Error(`请求失败: ${response.status} ${text}`);
      }

      if (!response.body || !contentType?.includes('text/event-stream')) {
        throw new Error('响应流不可用');
      }

      // 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = '';
      let buffer = '';
      
      // 设置打字中状态
      setIsTyping(true);
      
      // 创建一个空的助手消息
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = '';
        return newMessages;
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(5).trim());
              if (data.content) {
                // 逐字显示效果
                const newContent = data.content;
                for (let i = 0; i < newContent.length; i++) {
                  content += newContent[i];
                  // 使用闭包保存当前内容
                  const currentContent = content;
                  // 设置延迟，创建打字效果
                  await new Promise(resolve => setTimeout(resolve, 15));
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content = currentContent;
                    return newMessages;
                  });
                }
              } else if (data.conversationId) {
                setConversationId(data.conversationId);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e, line);
            }
          }
        }
      }
      
      // 结束打字状态
      setIsTyping(false);
      
      // 请求更新消息计数
      if (userId) {
        try {
          const countResponse = await fetch(`/api/user/message-count?userId=${encodeURIComponent(userId)}`);
          const countData = await countResponse.json();
          
          if (countResponse.ok) {
            setMessageCount(countData.count);
          }
        } catch (error) {
          console.error('更新消息计数失败:', error);
        }
      }

    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : '发生未知错误';
      setError(errorMessage);
      // 删除占位消息
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };
  
  const toast = useToast();
  
  const handlePaymentSuccess = () => {
    // 支付成功后更新会员状态
    setIsPremium(true);
    
    // 将会员状态保存到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('isPremium', 'true');
    }
    
    toast({
      title: '升级成功',
      description: '您已成功升级到高级会员，享受无限消息特权！',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
    
    onClose();
  };

  return (
    <Container maxW="container.lg" h="100vh" py={8}>
      <VStack h="full" spacing={4}>
        <Box
          flex={1}
          w="full"
          overflowY="auto"
          borderWidth={1}
          borderRadius="lg"
          p={4}
          position="relative"
        >
          {messages.length === 0 && (
            <Text color="gray.500" textAlign="center" py={8}>
              输入问题，我会基于 r/{subreddit} 的内容为您分析和回答
            </Text>
          )}
          {messages.map((message, index) => (
            <Flex
              key={index}
              justify={message.role === 'user' ? 'flex-end' : 'flex-start'}
              mb={4}
            >
              <Box
                maxW="70%"
                bg={message.role === 'user' ? 'blue.500' : 'gray.100'}
                color={message.role === 'user' ? 'white' : 'black'}
                p={3}
                borderRadius="lg"
                shadow="md"
                position="relative"
              >
                <Text whiteSpace="pre-wrap">{message.content}</Text>
                {isTyping && cursorVisible && index === messages.length - 1 && message.role === 'assistant' && (
                  <Text as="span" ml={1}>▌</Text>
                )}
              </Box>
            </Flex>
          ))}
          {error && (
            <Box
              position="absolute"
              bottom={4}
              left={0}
              right={0}
              mx={4}
              bg="red.100"
              color="red.700"
              p={3}
              borderRadius="md"
              textAlign="center"
            >
              {error}
            </Box>
          )}
        </Box>
        <Flex w="full">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入问题..."
            mr={2}
            isDisabled={isLoading}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            colorScheme="blue"
            onClick={handleSend}
            isLoading={isLoading}
            loadingText="发送中"
          >
            发送
          </Button>
        </Flex>
        
        {/* 消息计数显示 - 暂时隐藏付费相关信息 */}
        <Flex width="100%" justifyContent="center" alignItems="center" mt={2}>
          <Text fontSize="sm" color="gray.500">
            今日已发送 {messageCount}/{DAILY_MESSAGE_LIMIT} 条消息
          </Text>
          
          {/* 测试用重置按钮 */}
          <Button 
            size="xs" 
            ml={2} 
            colorScheme="gray" 
            variant="ghost"
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('messageCount');
                localStorage.removeItem('isPremium');
                localStorage.setItem('lastMessageDate', new Date().toDateString());
                setMessageCount(0);
                setIsPremium(false);
              }
            }}
          >
            重置
          </Button>
        </Flex>
        
        {/* 付费升级模态框 - 暂时隐藏 */}
        {/* <PaymentModal 
          isOpen={isOpen} 
          onClose={onClose} 
          onPaymentSuccess={handlePaymentSuccess}
          messageCount={messageCount}
          freeMessageLimit={FREE_MESSAGE_LIMIT}
        /> */}
      </VStack>
    </Container>
  );
}
