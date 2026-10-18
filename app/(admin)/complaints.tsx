import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, RefreshControl, ScrollView, Linking } from 'react-native';
import { Text, Card, Chip, Avatar, Portal, Modal, Button, IconButton, SegmentedButtons, Divider, useTheme, TextInput, Searchbar } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { fetchComplaints, updateComplaintStatusAPI } from '../../src/services/api';
import { colors } from '../../src/constants/colors';
import { formatDate, getPriorityColor } from '../../src/utils/formatDate';
import { Complaint } from '../../src/types';

export default function AdminComplaintsScreen() {
  const theme = useTheme();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [statusFilter, setStatusFilter] = useState<'Pending' | 'In Progress' | 'Resolved'>('Pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [statusFilter, categoryFilter])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchComplaints({
        status: statusFilter,
        category: categoryFilter !== 'All' ? categoryFilter : undefined
      });
      setComplaints(data || []);
    } catch (e) {
      console.error('Error loading complaints:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: 'In Progress' | 'Resolved' | 'Rejected') => {
    if (!selectedComplaint) return;
    setUpdating(true);
    try {
      await updateComplaintStatusAPI(selectedComplaint.id, newStatus, adminRemarks);
      Alert.alert('Status Updated', `Issue marked as ${newStatus}`);
      setModalVisible(false);
      setAdminRemarks('');
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update complaint status');
    } finally {
      setUpdating(false);
    }
  };

  const makeCall = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert('Notice', 'No contact phone number provided');
  };

  const categories = ['All', 'Electrical', 'Plumbing', 'WiFi/Internet', 'Carpentry', 'Cleaning', 'Food'];

  const filteredComplaints = complaints.filter(c => {
    if (searchQuery) {
      const matchTitle = c.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRoom = c.User?.roomNumber?.includes(searchQuery);
      const matchStudent = c.User?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTitle || matchRoom || matchStudent;
    }
    return true;
  });

  const renderItem = ({ item }: { item: Complaint }) => {
    const isPending = item.status === 'Pending';
    const isInProgress = item.status === 'In Progress';
    const isResolved = item.status === 'Resolved';

    const statusBorderColor = isPending ? colors.error : isInProgress ? '#F57C00' : '#2E7D32';

    return (
      <Card
        style={[styles.card, { borderLeftColor: statusBorderColor, borderLeftWidth: 5 }]}
        mode="outlined"
        onPress={() => {
          setSelectedComplaint(item);
          setAdminRemarks(item.adminRemarks || '');
          setModalVisible(true);
        }}
      >
        <Card.Title
          title={item.title}
          titleStyle={{ fontWeight: 'bold' }}
          subtitle={`${item.category} • Room ${item.User?.roomNumber || 'N/A'}`}
          left={(props) => (
            <Avatar.Icon
              {...props}
              icon={isResolved ? 'check-circle' : isInProgress ? 'progress-wrench' : 'clock-outline'}
              style={{ backgroundColor: 'transparent' }}
              color={statusBorderColor}
            />
          )}
          right={(props) => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Chip
                compact
                style={{
                  backgroundColor: `${getPriorityColor(item.priority)}15`,
                  marginRight: 4
                }}
                textStyle={{
                  color: getPriorityColor(item.priority),
                  fontSize: 10,
                  fontWeight: 'bold'
                }}
              >
                {item.priority || 'Normal'}
              </Chip>
              <IconButton {...props} icon="chevron-right" size={20} />
            </View>
          )}
        />
        <Card.Content>
          {item.description ? (
            <Text variant="bodySmall" numberOfLines={2} style={{ color: '#555' }}>
              {item.description}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text variant="labelSmall" style={{ color: '#888' }}>
              Reported by: <Text style={{ fontWeight: '600' }}>{item.User?.name || 'Student'}</Text>
            </Text>
            <Text variant="labelSmall" style={{ color: '#888' }}>
              {formatDate(item.createdAt || item.date)}
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Maintenance & Issue Tracker
        </Text>
        <Text variant="bodySmall" style={{ color: colors.secondary, marginBottom: 12 }}>
          Manage hostel repairs and facility complaints
        </Text>

        <SegmentedButtons
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val as any)}
          buttons={[
            { value: 'Pending', label: 'Pending', icon: 'alert-circle-outline' },
            { value: 'In Progress', label: 'Working', icon: 'wrench' },
            { value: 'Resolved', label: 'Resolved', icon: 'check-circle-outline' },
          ]}
          style={{ marginBottom: 10 }}
        />

        {/* Category Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((cat) => (
            <Chip
              key={cat}
              selected={categoryFilter === cat}
              onPress={() => setCategoryFilter(cat)}
              style={[
                styles.categoryChip,
                categoryFilter === cat && { backgroundColor: theme.colors.primaryContainer }
              ]}
              showSelectedOverlay
            >
              {cat}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* COMPLAINTS LIST */}
      <FlatList
        data={filteredComplaints}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Avatar.Icon size={60} icon="check-circle-outline" style={{ backgroundColor: '#E8F5E9' }} color="#2E7D32" />
            <Text variant="titleMedium" style={{ marginTop: 10, color: '#666' }}>All Clear!</Text>
            <Text variant="bodySmall" style={{ color: '#999' }}>No {statusFilter.toLowerCase()} complaints found.</Text>
          </View>
        }
      />

      {/* --- DETAIL & ACTION MODAL --- */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          {selectedComplaint && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Chip icon="account">
                  {selectedComplaint.User?.name || 'Student'} (Room {selectedComplaint.User?.roomNumber || 'N/A'})
                </Chip>
                <Chip
                  style={{
                    backgroundColor: `${getPriorityColor(selectedComplaint.priority)}20`
                  }}
                  textStyle={{
                    color: getPriorityColor(selectedComplaint.priority),
                    fontWeight: 'bold'
                  }}
                >
                  {selectedComplaint.priority || 'Normal'} Priority
                </Chip>
              </View>

              <Text variant="headlineSmall" style={{ fontWeight: 'bold', marginTop: 12 }}>
                {selectedComplaint.title}
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.secondary, marginBottom: 8 }}>
                Category: <Text style={{ fontWeight: 'bold' }}>{selectedComplaint.category}</Text>
              </Text>

              {/* Description */}
              <View style={styles.descBox}>
                <Text variant="bodyMedium">
                  {selectedComplaint.description || 'No additional description provided.'}
                </Text>
              </View>

              {/* Student Phone Contact */}
              {selectedComplaint.User?.phone && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ color: '#666' }}>Student Phone: {selectedComplaint.User.phone}</Text>
                  <Button
                    mode="text"
                    compact
                    icon="phone"
                    onPress={() => makeCall(selectedComplaint.User?.phone)}
                  >
                    Call
                  </Button>
                </View>
              )}

              {/* Admin Remarks Input */}
              <Text variant="titleSmall" style={{ fontWeight: 'bold', marginBottom: 6 }}>
                Resolution / Administrative Remarks:
              </Text>
              <TextInput
                placeholder="e.g. Electrician scheduled for 3 PM, replaced spare part..."
                value={adminRemarks}
                onChangeText={setAdminRemarks}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={{ backgroundColor: 'white', marginBottom: 15 }}
              />

              {/* Status Action Buttons */}
              <View style={{ gap: 8 }}>
                {selectedComplaint.status !== 'In Progress' && selectedComplaint.status !== 'Resolved' && (
                  <Button
                    mode="contained"
                    buttonColor="#F57C00"
                    icon="wrench"
                    loading={updating}
                    onPress={() => handleStatusUpdate('In Progress')}
                  >
                    Mark In Progress
                  </Button>
                )}

                {selectedComplaint.status !== 'Resolved' && (
                  <Button
                    mode="contained"
                    buttonColor="#2E7D32"
                    icon="check"
                    loading={updating}
                    onPress={() => handleStatusUpdate('Resolved')}
                  >
                    Mark Resolved
                  </Button>
                )}

                <Button mode="text" onPress={() => setModalVisible(false)}>
                  Close
                </Button>
              </View>
            </ScrollView>
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 16, paddingTop: 48, backgroundColor: 'white', elevation: 2 },
  title: { fontWeight: 'bold', color: colors.primary },
  categoryChip: { marginRight: 8, height: 32 },
  card: { marginBottom: 10, backgroundColor: 'white', borderRadius: 12, borderColor: '#EEE' },
  emptyState: { alignItems: 'center', marginTop: 60 },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 16, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  descBox: { marginVertical: 10, padding: 14, backgroundColor: '#F5F5F5', borderRadius: 10 }
});