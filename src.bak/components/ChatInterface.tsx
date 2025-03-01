'use client';

import { useState } from 'react';
import {
  Box,
  VStack,
  Input,
  Button,
  Text,
  Container,
  Flex,
} from '@chakra-ui/react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  subreddit: string;
}

export function ChatInterface({ subreddit }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [error, setError] = useState<string>();

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
                content += data.content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = content;
                  return newMessages;
                });
              } else if (data.conversationId) {
                setConversationId(data.conversationId);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e, line);
            }
          }
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
              >
                <Text whiteSpace="pre-wrap">{message.content}</Text>
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
      </VStack>
    </Container>
  );
}
