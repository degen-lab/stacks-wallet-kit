import { Button, Platform, Text, View } from 'react-native';

import { createNetwork } from '@stacks/network';
import {
  broadcastTransaction,
  makeSTXTokenTransfer,
} from '@stacks/transactions';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';

export default function HomeScreen() {
  function getDevnetUrl() {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3999';
    } else {
      // iOS simulator, web, or physical devices
      return 'http://localhost:3999';
    }
  };
  
  const devnetUrl = getDevnetUrl();
  const network = createNetwork({network: 'devnet', client:{baseUrl: devnetUrl}});
  const [log, setLog] = useState('');
  
  const PRIVATE_KEY =
    '16226f674796712dfbd53bf402304579b8b6d04d4bed4d466bf84ce6db973d4401';
  const RECIPIENT_ADDRESS = 'ST31H84KP59QYJ4A3WF8TA2JX8NYA40FT20WF7YPT';
  const AMOUNT = BigInt(1_000_000);
  const MEMO = 'SDK login send test';
  
  async function sendTestStx() {
    setLog(`Sending transaction...`);
    try {
      const tx = await makeSTXTokenTransfer({
        recipient: RECIPIENT_ADDRESS,
        amount: AMOUNT,
        memo: MEMO,
        senderKey: PRIVATE_KEY,
        network: network, // Use the same network for consistency
        fee: BigInt(1000), // Set fee manually to avoid fee estimation (devnet may not have /v2/fees/transaction endpoint)
      });
      
      const txId = tx.txid();
      setLog(`Transaction created: ${txId}`);
  
      const response = await broadcastTransaction({transaction: tx, network: network});
      
      if ('error' in response) {
        const errorMsg = response.error;
        setLog(`Error: ${errorMsg}`);
        return;
      }
      
      const responseStr = JSON.stringify(response, null, 2);
      const responseTxId = response.txid || txId;
      const successMessage = `Success! Transaction ID: ${responseTxId}\n\n${responseStr}`;
      setLog(successMessage);
      return response;
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      setLog(`Error: ${errorMessage}`);
      throw error;
    }
  }
  const router = useRouter();
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      >
      <View className="flex-row items-center gap-2 bg-white dark:bg-[#151718]">
        <Text className="text-4xl font-bold text-[#11181C] dark:text-[#ECEDEE]">Welcome!</Text>
        <Button title="Send Test STX" onPress={sendTestStx} className="bg-blue-500 text-white p-2 rounded-md">
          <Text className="text-white">Send Test STX</Text>
        </Button> 
        <Button title="Go to sdk playground" onPress={ () => router.push('/(tabs)/sdk-playground')}>
          <Text className="text-white">Go to sdk playground</Text>
        </Button>
      </View>
    
      <View className="gap-2 mb-2 bg-white dark:bg-[#151718]">
        <Text className="text-xl font-bold text-[#11181C] dark:text-[#ECEDEE]">{log}</Text>
        <Link href="/modal">
          <Link.Trigger>
            <Text className="text-xl font-bold text-[#11181C] dark:text-[#ECEDEE]">Step 2: Explore</Text>
          </Link.Trigger>
          <Link.Preview />
          <Link.Menu>
            <Link.MenuAction title="Action" icon="cube" onPress={() => alert('Action pressed')} />
            <Link.MenuAction
              title="Share"
              icon="square.and.arrow.up"
              onPress={() => alert('Share pressed')}
            />
            <Link.Menu title="More" icon="ellipsis">
              <Link.MenuAction
                title="Delete"
                icon="trash"
                destructive
                onPress={() => alert('Delete pressed')}
              />
            </Link.Menu>
          </Link.Menu>
        </Link>

        <Text className="text-base text-[#11181C] dark:text-[#ECEDEE]">
          {`Tap the Explore tab to learn more about what's included in this starter app.`}
        </Text>
      </View>
      <View className="gap-2 mb-2 bg-white dark:bg-[#151718]">
        <Text className="text-xl font-bold text-[#11181C] dark:text-[#ECEDEE]">Step 3: Get a fresh start</Text>
        <Text className="text-base text-[#11181C] dark:text-[#ECEDEE]">
          {`When you're ready, run `}
          <Text className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">npm run reset-project</Text> to get a fresh{' '}
          <Text className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">app</Text> directory. This will move the current{' '}
          <Text className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">app</Text> to{' '}
          <Text className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">app-example</Text>.
        </Text>
      </View>
    </ParallaxScrollView>
  );
}
