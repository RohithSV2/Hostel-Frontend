import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, IconButton, useTheme, Appbar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchChats, sendDM } from '../../src/services/api'; // Use the new API functions

import { colors } from '../../src/constants/colors';

export default function ChatDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id, name } = useLocalSearchParams();

  const [msgText, setMsgText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    loadThread();
    const interval = setInterval(loadThread, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const loadThread = async () => {
    const allThreads = await fetchChats();
    const thisThread = allThreads.find((t: any) => t.id === id);
    if (thisThread) {
      setMessages(thisThread.messages.reverse());
    }
  };

  const handleSend = async () => {
    if (!msgText.trim()) return;
    await sendDM(id as string, msgText);
    setMsgText('');
    loadThread();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1, backgroundColor: colors.background}}>
      <Appbar.Header style={{backgroundColor: colors.surface, elevation: 1}}>
        <Appbar.BackAction onPress={() => router.back()} color={colors.primary} />
        <Appbar.Content title={name as string} titleStyle={{ fontWeight: 'bold', color: colors.textPrimary }} />
      </Appbar.Header>

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        inverted 
        renderItem={({ item }) => {
          const isMe = item.sender === 'me';
          return (
            <View style={[
              styles.bubble, 
              isMe ? styles.me : styles.other,
              { backgroundColor: isMe ? colors.primary : colors.surface, borderWidth: isMe ? 0 : 1, borderColor: colors.border }
            ]}>
              <Text style={{ color: isMe ? 'white' : colors.textPrimary, fontSize: 14 }}>{item.text}</Text>
            </View>
          );
        }}
      />

      <View style={styles.inputArea}>
        <TextInput 
          mode="outlined" 
          value={msgText} 
          onChangeText={setMsgText} 
          placeholder="Type a message..." 
          style={{flex:1, backgroundColor: colors.surface}} 
          dense 
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
        />
        <IconButton icon="send" mode="contained" onPress={handleSend} iconColor="white" containerColor={colors.primary} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, maxWidth: '80%', marginVertical: 4 },
  me: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  other: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  inputArea: { flexDirection: 'row', padding: 10, backgroundColor: colors.surface, alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.border }
});