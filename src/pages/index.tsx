import { useState } from 'react';
import { Box, Container, Input, Button, VStack, Heading, ChakraProvider, Text } from '@chakra-ui/react';
import { ChatInterface } from '../components/ChatInterface';

export default function Home() {
  const [subredditInput, setSubredditInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [extractedSubreddit, setExtractedSubreddit] = useState('');

  const extractSubredditFromLink = (input: string): string => {
    // 移除前后空格
    input = input.trim();
    
    // 检查是否是简单的subreddit名称 (例如 "askreddit")
    if (!input.includes('/') && !input.includes('.')) {
      return input;
    }
    
    try {
      // 尝试处理作为完整URL的输入
      let url: URL;
      
      // 如果没有http(s)前缀，添加它
      if (!input.startsWith('http://') && !input.startsWith('https://')) {
        url = new URL(`https://${input}`);
      } else {
        url = new URL(input);
      }
      
      // 检查是否是reddit域名
      if (!url.hostname.includes('reddit.com')) {
        throw new Error('不是有效的Reddit链接');
      }
      
      // 从路径中提取subreddit名称
      const pathParts = url.pathname.split('/').filter(part => part);
      
      // reddit链接格式通常是 /r/subreddit_name/...
      if (pathParts.length >= 2 && pathParts[0].toLowerCase() === 'r') {
        return pathParts[1];
      } else {
        throw new Error('无法从链接中提取subreddit');
      }
    } catch (err) {
      // 如果上面的解析失败，尝试使用正则表达式
      const redditRegex = /(?:^|(?:https?:\/\/)?(?:www\.)?reddit\.com\/)?r\/([a-zA-Z0-9_]+)(?:\/|$)/i;
      const match = input.match(redditRegex);
      
      if (match && match[1]) {
        return match[1];
      }
      
      // 如果还是无法解析，返回原始输入
      return input;
    }
  };

  const handleConnect = () => {
    if (!subredditInput.trim()) {
      setError('请输入subreddit链接');
      return;
    }
    
    const extracted = extractSubredditFromLink(subredditInput);
    if (!extracted) {
      setError('无法从链接中提取subreddit');
      return;
    }
    
    setExtractedSubreddit(extracted);
    setError('');
    setIsConnected(true);
  };

  return (
    <ChakraProvider>
      <Box display="flex" minH="100vh" alignItems="center" justifyContent="center">
        <Container maxW="container.xl" py={8}>
          {!isConnected ? (
            <VStack spacing={8} align="center">
              <Heading size="2xl">Reddit社区分析助手</Heading>
              <Box w="100%" maxW="md" p={8} borderRadius="lg" boxShadow="lg" bg="white">
                <Input
                  placeholder="输入subreddit链接"
                  value={subredditInput}
                  onChange={(e) => setSubredditInput(e.target.value)}
                  mb={4}
                  size="lg"
                />
                {error && <Text color="red.500" mb={4}>{error}</Text>}
                <Button colorScheme="blue" onClick={handleConnect} width="100%" size="lg">
                  连接
                </Button>
              </Box>
            </VStack>
          ) : (
            <ChatInterface subreddit={extractedSubreddit} />
          )}
        </Container>
      </Box>
    </ChakraProvider>
  );
}
