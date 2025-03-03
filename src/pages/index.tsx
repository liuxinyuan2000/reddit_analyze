import { useState } from 'react';
import { Box, Container, Input, Button, VStack, Heading, ChakraProvider, Text, InputGroup, InputRightElement, IconButton, FormControl, FormLabel } from '@chakra-ui/react';
import { ChatInterface } from '../components/ChatInterface';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';

export default function Home() {
  const [subreddit, setSubreddit] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = () => {
    setError('');
    
    if (!subreddit) {
      setError('请输入Subreddit名称');
      return;
    }
    
    if (!apiKey) {
      setError('请输入OpenAI API Key');
      return;
    }
    
    // 简单验证API密钥格式
    if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
      setError('请输入有效的OpenAI API Key');
      return;
    }
    
    setIsConnected(true);
  };
  
  const toggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
  };

  return (
    <ChakraProvider>
      <Box display="flex" minH="100vh" alignItems="center" justifyContent="center">
        <Container maxW="container.xl" py={8}>
          {!isConnected ? (
            <VStack spacing={8} align="center">
              <Heading size="2xl">Reddit社区分析助手</Heading>
              <Box w="100%" maxW="md" p={8} borderRadius="lg" boxShadow="lg" bg="white">
                <FormControl mb={4}>
                  <FormLabel>Subreddit名称</FormLabel>
                  <Input
                    placeholder="例如: AskReddit"
                    value={subreddit}
                    onChange={(e) => setSubreddit(e.target.value)}
                    size="lg"
                  />
                </FormControl>
                
                <FormControl mb={4}>
                  <FormLabel>OpenAI API Key</FormLabel>
                  <InputGroup size="lg">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showApiKey ? '隐藏API Key' : '显示API Key'}
                        icon={showApiKey ? <ViewOffIcon /> : <ViewIcon />}
                        onClick={toggleShowApiKey}
                        variant="ghost"
                        size="sm"
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
                
                {error && (
                  <Text color="red.500" mb={4}>
                    {error}
                  </Text>
                )}
                
                <Button colorScheme="blue" onClick={handleConnect} width="100%" size="lg">
                  连接
                </Button>
              </Box>
            </VStack>
          ) : (
            <ChatInterface subreddit={subreddit} apiKey={apiKey} />
          )}
        </Container>
      </Box>
    </ChakraProvider>
  );
}
