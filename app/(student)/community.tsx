import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, SegmentedButtons, IconButton, Badge } from 'react-native-paper';
import { colors } from '../../src/constants/colors';
import { useRouter } from 'expo-router';
// Import the new separated components
import ChatSection from '../../src/components/community/ChatSection';
import LostFoundSection from '../../src/components/community/LostFoundSection';



export default function CommunityScreen() {
  const [view, setView] = useState('chat'); 
  const router = useRouter();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <Text variant="headlineSmall" style={styles.title}>Community</Text>
          <TouchableOpacity onPress={() => router.push('/messages/inbox')}>
             <View>
               <IconButton icon="message-text-outline" size={28} iconColor={colors.primary} />
               <Badge size={16} style={styles.badge}>3</Badge>
             </View>
          </TouchableOpacity>
        </View>

        <SegmentedButtons
          value={view}
          onValueChange={setView}
          buttons={[
            { value: 'chat', label: 'General Chat', icon: 'chat' },
            { value: 'lost', label: 'Lost & Found', icon: 'magnify' },
          ]}
        />
      </View>

      {/* --- THE FIX IS HERE --- */}
      {/* We render BOTH components, but use 'display: none' to hide the inactive one. 
          This keeps them alive in memory so your text doesn't disappear. */}
      
      <View style={{ flex: 1, display: view === 'chat' ? 'flex' : 'none' }}>
        <ChatSection />
      </View>

      <View style={{ flex: 1, display: view === 'lost' ? 'flex' : 'none' }}>
        <LostFoundSection />
      </View>
      
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 20, paddingTop: 50, backgroundColor: 'white', elevation: 2 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontWeight: 'bold', color: colors.primary },
  badge: { position: 'absolute', top: 5, right: 5 }
});