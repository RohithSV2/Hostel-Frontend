import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Avatar, List, Divider, FAB, ActivityIndicator, Badge, Portal, Modal, Searchbar, Appbar } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { fetchChats, fetchAllStudents } from '../../src/services/api'; // Real API functions
import { colors } from '../../src/constants/colors';

export default function InboxScreen() {
  const router = useRouter();
  
  // Inbox State
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Chat Modal State
  const [visible, setVisible] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]); // Real student list
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Load Chats when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadChats();
    }, [])
  );

  // Load Student list only when Modal is opened
  useEffect(() => {
    if (visible) {
      loadStudents();
    }
  }, [visible]);

  const loadChats = async () => {
    const data = await fetchChats();
    setChats(data);
    setLoading(false);
  };

  const loadStudents = async () => {
    setLoadingStudents(true);
    const data = await fetchAllStudents();
    setAllStudents(data);
    setLoadingStudents(false);
  };

  const openChat = (id: string, name: string) => {
    setVisible(false);
    // Navigate to Chat Detail. 
    // Note: 'id' here is the USER ID of the other person (receiverId)
    router.push({ pathname: '/messages/chat_detail', params: { id, name } });
  };

  // Filter students for the modal
  const filteredStudents = allStudents.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.roomNumber?.includes(searchQuery)
  );

  if (loading) return <ActivityIndicator style={{marginTop: 50}} />;

  return (
    <View style={styles.container}>
      {/* --- HEADER --- */}
      <Appbar.Header style={{backgroundColor: colors.surface, elevation: 1}}>
        <Appbar.BackAction onPress={() => router.back()} color={colors.primary} />
        <Appbar.Content title="Direct Messages" titleStyle={{fontWeight:'bold', color: colors.primary}} />
      </Appbar.Header>

      {/* --- INBOX LIST --- */}
      <FlatList
        data={chats}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface, marginHorizontal: 16, marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
            <List.Item
              title={item.name}
              titleStyle={{ fontWeight: 'bold', color: colors.textPrimary }}
              description={item.lastMessage}
              descriptionStyle={{ color: colors.textSecondary }}
              descriptionNumberOfLines={1}
              left={props => (
                <Avatar.Text 
                  size={46} 
                  label={item.name ? item.name.substring(0,2).toUpperCase() : 'U'} 
                  style={{ backgroundColor: colors.primaryContainer, alignSelf: 'center', marginLeft: 12 }} 
                  color={colors.primary}
                />
              )}
              right={props => item.unread > 0 ? <Badge style={{ alignSelf:'center', marginRight: 12, backgroundColor: colors.primary }}>{item.unread}</Badge> : null}
              onPress={() => openChat(item.id, item.name)}
              style={{ paddingVertical: 8 }}
            />
          </View>
        )}
        ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 30, color: colors.textSecondary}}>No conversations yet.</Text>}
      />
      
      <FAB icon="plus" style={styles.fab} onPress={() => setVisible(true)} color="white" />

      {/* --- NEW CHAT MODAL --- */}
      <Portal>
        <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={{fontWeight:'bold', color: colors.textPrimary, marginBottom: 12}}>New Direct Message</Text>
          
          <Searchbar 
            placeholder="Search student or room..." 
            onChangeText={setSearchQuery} 
            value={searchQuery} 
            style={{marginBottom: 12, backgroundColor: colors.surfaceVariant}} 
            elevation={0}
          />
          
          {loadingStudents ? (
             <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={filteredStudents}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => openChat(item.id.toString(), item.name)}>
                  <View style={styles.userRow}>
                    <Avatar.Text size={40} label={item.name.substring(0,2).toUpperCase()} style={{backgroundColor: colors.primaryContainer}} color={colors.primary} />
                    <View style={{marginLeft: 14}}>
                       <Text variant="bodyLarge" style={{fontWeight: '600', color: colors.textPrimary}}>{item.name}</Text>
                       <Text variant="labelSmall" style={{color: colors.secondary}}>Room: {item.roomNumber || 'Unassigned'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{textAlign:'center', marginTop:20, color: colors.textSecondary}}>No matching students found.</Text>}
            />
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: colors.primary },
  modal: { backgroundColor: colors.surface, padding: 22, margin: 20, borderRadius: 18, height: '70%' },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }
});