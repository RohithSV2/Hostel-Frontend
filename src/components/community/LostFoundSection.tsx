import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { Text, Card, Avatar, FAB, Portal, Modal, TextInput, Button, Chip } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../constants/colors';
import { fetchLostItems, submitLostFoundItem, resolveLostItemAPI, autoSendFoundMessage } from '../../services/api';
import { LostItem } from '../../types';

export default function LostFoundSection() {
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [foundModalVisible, setFoundModalVisible] = useState(false);
  
  // Form States
  const [newItem, setNewItem] = useState<Partial<LostItem>>({ type: 'LOST' });
  const [foundProof, setFoundProof] = useState({ contact: '', image: null as string | null });
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const items = await fetchLostItems();
      setLostItems(items || []);
    } catch (e) {
      console.error('Error fetching lost items:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadItems();
  };

  const pickImage = async (target: 'post' | 'proof') => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (target === 'post') {
        setNewItem({ ...newItem, image: result.assets[0].uri });
      } else {
        setFoundProof({ ...foundProof, image: result.assets[0].uri });
      }
    }
  };

  const handlePostItem = async () => {
    if (!newItem.item || !newItem.location) return;
    setLoading(true);
    
    try {
      const postData: Partial<LostItem> = { 
        item: newItem.item!,
        location: newItem.location!,
        contact: newItem.contact || 'Room Resident',
        type: 'LOST',
        image: newItem.image
      };
      
      await submitLostFoundItem(postData);
      setPostModalVisible(false);
      setNewItem({ type: 'LOST' });
      await loadItems();
    } catch (e) {
      alert('Failed to report item');
    } finally {
      setLoading(false);
    }
  };

  const openFoundModal = (id: string) => {
    setSelectedItemId(id);
    setFoundProof({ contact: '', image: null });
    setFoundModalVisible(true);
  };

  const handleSubmitFound = async () => {
    if (!selectedItemId || !foundProof.contact.trim()) return;

    try {
      await resolveLostItemAPI(selectedItemId, foundProof.contact);
      const itemDetails = lostItems.find(i => i.id === selectedItemId);
      if (itemDetails) {
        await autoSendFoundMessage(itemDetails.item, foundProof.contact, itemDetails.contact);
        alert(`Claim recorded! A notification message was sent.`);
      }
      setFoundModalVisible(false);
      await loadItems();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={lostItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          const isFound = item.type === 'FOUND' || item.isResolved;
          return (
            <Card style={[styles.card, isFound && { opacity: 0.85 }]} mode="outlined">
              {item.image && <Card.Cover source={{ uri: item.image }} style={{ height: 160 }} />}
              
              <Card.Title 
                title={item.item} 
                titleStyle={{ textDecorationLine: isFound ? 'line-through' : 'none', fontWeight: 'bold' }}
                subtitle={`${item.location} • ${item.date}`}
                left={(props) => (
                  <Avatar.Icon 
                    {...props} 
                    icon={isFound ? "check-circle" : "help-circle"} 
                    style={{ backgroundColor: isFound ? '#E8F5E9' : '#FFEBEE' }} 
                    color={isFound ? 'green' : colors.error} 
                  />
                )}
                right={(props) => (
                  <Chip 
                    compact 
                    style={{ marginRight: 10, backgroundColor: isFound ? '#E8F5E9' : '#FFF3E0' }}
                    textStyle={{ color: isFound ? 'green' : '#E65100', fontSize: 11, fontWeight: 'bold' }}
                  >
                    {isFound ? 'FOUND / RESOLVED' : 'LOST'}
                  </Chip>
                )}
              />
              <Card.Content>
                <Text variant="bodySmall">Contact: <Text style={{ fontWeight: 'bold' }}>{item.contact}</Text></Text>
                {item.foundBy && (
                  <Text variant="labelSmall" style={{ color: 'green', marginTop: 4 }}>
                    Claimed / Found by: {item.foundBy}
                  </Text>
                )}
              </Card.Content>
              
              {!isFound && (
                <Card.Actions>
                  <Button 
                    mode="contained-tonal" 
                    textColor={colors.primary} 
                    icon="eye-check" 
                    onPress={() => openFoundModal(item.id)}
                  >
                    I Found This!
                  </Button>
                </Card.Actions>
              )}
            </Card>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Avatar.Icon size={50} icon="magnify" style={{ backgroundColor: '#EEE' }} color="#888" />
            <Text style={{ marginTop: 10, color: '#888' }}>No active lost & found reports</Text>
          </View>
        }
      />
      
      <FAB icon="plus" label="Report Lost" style={styles.fab} onPress={() => setPostModalVisible(true)} color="white" />

      {/* --- POST MODAL --- */}
      <Portal>
        <Modal visible={postModalVisible} onDismiss={() => setPostModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', marginBottom: 12 }}>Report Lost Item</Text>
          <TouchableOpacity onPress={() => pickImage('post')} style={styles.imagePicker}>
            {newItem.image ? <Image source={{ uri: newItem.image }} style={styles.imgPreview} /> : 
              <View style={{ alignItems: 'center' }}>
                <Avatar.Icon size={36} icon="camera" style={{ backgroundColor: '#F0F0F0' }} color={colors.secondary} />
                <Text variant="labelSmall" style={{ color: '#888', marginTop: 4 }}>Add Photo (Optional)</Text>
              </View>
            }
          </TouchableOpacity>
          <TextInput label="Item Name *" value={newItem.item || ''} onChangeText={t => setNewItem({...newItem, item: t})} mode="outlined" style={styles.input} />
          <TextInput label="Last Seen Location *" value={newItem.location || ''} onChangeText={t => setNewItem({...newItem, location: t})} mode="outlined" style={styles.input} />
          <TextInput label="Your Contact / Room No" value={newItem.contact || ''} onChangeText={t => setNewItem({...newItem, contact: t})} mode="outlined" style={styles.input} />
          <Button mode="contained" onPress={handlePostItem} loading={loading}>Submit Report</Button>
        </Modal>
      </Portal>

      {/* --- FOUND MODAL --- */}
      <Portal>
        <Modal visible={foundModalVisible} onDismiss={() => setFoundModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: 'green', marginBottom: 8 }}>Found This Item?</Text>
          <Text variant="bodySmall" style={{ color: '#666', marginBottom: 12 }}>
            Let the owner know where they can collect it.
          </Text>
          <TextInput 
            label="Your Contact / Room Number *" 
            value={foundProof.contact} 
            onChangeText={t => setFoundProof({...foundProof, contact: t})} 
            mode="outlined" 
            style={styles.input} 
          />
          <Button mode="contained" onPress={handleSubmitFound} buttonColor="green">
            Confirm & Notify Owner
          </Button>
          <Button mode="text" onPress={() => setFoundModalVisible(false)} style={{ marginTop: 6 }}>
            Cancel
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: { marginBottom: 12, backgroundColor: colors.surface, borderRadius: 14, borderColor: colors.border },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: colors.primary },
  modal: { backgroundColor: colors.surface, padding: 20, margin: 20, borderRadius: 16 },
  imagePicker: { height: 100, backgroundColor: colors.surfaceVariant, borderRadius: 12, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  imgPreview: { width: '100%', height: '100%', borderRadius: 12 },
  input: { marginBottom: 10, backgroundColor: colors.surface }
});