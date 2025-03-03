import { useState } from 'react';
import { Box, Container, Input, Button, VStack, Heading, ChakraProvider } from '@chakra-ui/react';
import { ChatInterface } from '../components/ChatInterface';

export default function Home() {
  const [subreddit, setSubreddit] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = () => {
    if (subreddit) {
      setIsConnected(true);
    }
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
                  placeholder="输入Subreddit名称"
                  value={subreddit}
                  onChange={(e) => setSubreddit(e.target.value)}
                  mb={4}
                  size="lg"
                />
                <Button colorScheme="blue" onClick={handleConnect} width="100%" size="lg">
                  连接
                </Button>
              </Box>
            </VStack>
          ) : (
            <ChatInterface subreddit={subreddit} />
          )}
        </Container>
      </Box>
    </ChakraProvider>
  );
}
