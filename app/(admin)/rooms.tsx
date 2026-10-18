import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Linking, ScrollView, Alert, RefreshControl } from 'react-native';
import { Text, Searchbar, Card, Avatar, Portal, Modal, IconButton, Button, Chip, useTheme, Divider, FAB, TextInput, SegmentedButtons } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { fetchRooms, addNewStudent, allocateStudentRoom, deallocateStudentRoom, updateRoomMaintenanceStatus, fetchAllStudents } from '../../src/services/api';
import { colors } from '../../src/constants/colors';
import { Room } from '../../src/types';

export default function RoomsScreen() {
  const theme = useTheme();

  // Data State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'FULL' | 'MAINTENANCE'>('ALL');
  const [blockFilter, setBlockFilter] = useState<'All' | 'A-Block' | 'B-Block'>('All');

  // Room Detail Modal State
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Direct Allocation State
  const [allocateModalVisible, setAllocateModalVisible] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [targetBedId, setTargetBedId] = useState('A');
  const [studentSearch, setStudentSearch] = useState('');

  // Add Student Modal State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    rollNo: '',
    roomNo: '',
    bedId: 'A',
    phone: '',
    parentPhone: ''
  });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [roomsData, studentsData] = await Promise.all([
        fetchRooms(),
        fetchAllStudents()
      ]);
      setRooms(roomsData as Room[]);
      setAllStudents(studentsData || []);
    } catch (e) {
      console.error('Error loading rooms:', e);
    } finally {
      setLoading(false);
    }
  };

  const makeCall = (number?: string) => {
    if (number) Linking.openURL(`tel:${number}`);
    else Alert.alert('Notice', 'Phone number not available');
  };

  const handleRoomPress = (room: Room) => {
    setSelectedRoom(room);
    setDetailModalVisible(true);
  };

  const handleDeallocate = (studentId: number, studentName: string) => {
    Alert.alert('Vacate Bed', `Remove ${studentName} from this room?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Vacate',
        style: 'destructive',
        onPress: async () => {
          try {
            await deallocateStudentRoom(studentId);
            Alert.alert('Success', `${studentName} has been unallocated.`);
            setDetailModalVisible(false);
            await loadData();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not vacate bed');
          }
        }
      }
    ]);
  };

  const handleToggleMaintenance = async () => {
    if (!selectedRoom) return;
    const newStatus = selectedRoom.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
    try {
      await updateRoomMaintenanceStatus(selectedRoom.id, newStatus);
      Alert.alert('Updated', `Room status changed to ${newStatus}`);
      setDetailModalVisible(false);
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to update room maintenance status');
    }
  };

  const openAllocateModal = (bedId: string) => {
    setTargetBedId(bedId);
    setSelectedStudentId(null);
    setStudentSearch('');
    setAllocateModalVisible(true);
  };

  const handleConfirmAllocation = async () => {
    if (!selectedStudentId || !selectedRoom) {
      Alert.alert('Selection Required', 'Please select a student to allocate');
      return;
    }
    try {
      await allocateStudentRoom(selectedStudentId, selectedRoom.roomNumber, targetBedId, selectedRoom.block);
      Alert.alert('Success', `Student allocated to Room ${selectedRoom.roomNumber} (Bed ${targetBedId})`);
      setAllocateModalVisible(false);
      setDetailModalVisible(false);
      await loadData();
    } catch (e: any) {
      Alert.alert('Allocation Failed', e.response?.data?.message || 'Could not allocate');
    }
  };

  const handleAddStudent = async () => {
    if (!formData.name || !formData.email) {
      Alert.alert('Error', 'Please fill in Name and Email');
      return;
    }

    setLoading(true);
    try {
      await addNewStudent({
        ...formData,
        rollNumber: formData.rollNo,
        roomNumber: formData.roomNo,
        guardianPhone: formData.parentPhone
      });
      setAddModalVisible(false);
      setFormData({ name: '', email: '', password: '', rollNo: '', roomNo: '', bedId: 'A', phone: '', parentPhone: '' });
      Alert.alert('Success', 'Student account created and room allocated!');
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  // Filter Rooms
  const filteredRooms = rooms.filter((r) => {
    if (blockFilter !== 'All' && r.block !== blockFilter) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (searchQuery) {
      const matchRoom = r.roomNumber.includes(searchQuery);
      const matchOccupant = r.occupants?.some((s: any) =>
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return matchRoom || matchOccupant;
    }
    return true;
  });

  const renderRoom = ({ item }: { item: Room }) => {
    const occupantCount = item.occupants ? item.occupants.length : 0;
    const isFull = occupantCount >= item.capacity;
    const isMaintenance = item.status === 'MAINTENANCE';

    const borderColor = isMaintenance ? '#FFA000' : isFull ? colors.error : '#43A047';

    return (
      <Card
        style={[styles.roomCard, { borderColor }]}
        mode="outlined"
        onPress={() => handleRoomPress(item)}
      >
        <View style={styles.roomInner}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
            {item.roomNumber}
          </Text>

          <Text variant="labelSmall" style={{ color: '#888', fontSize: 10 }}>
            {item.type || '3-Sharing'}
          </Text>

          {/* Beds indicator */}
          <View style={styles.bedRow}>
            {Array.from({ length: item.capacity || 3 }).map((_, index) => {
              const isOccupied = index < occupantCount;
              return (
                <View
                  key={index}
                  style={[
                    styles.bedDot,
                    {
                      backgroundColor: isOccupied ? colors.primary : '#E0E0E0',
                      borderWidth: isOccupied ? 0 : 1,
                      borderColor: '#BDBDBD'
                    }
                  ]}
                />
              );
            })}
          </View>

          <Text
            variant="labelSmall"
            style={{
              color: isMaintenance ? '#FFA000' : isFull ? colors.error : '#43A047',
              fontWeight: '600',
              marginTop: 4
            }}
          >
            {isMaintenance ? 'MAINTENANCE' : isFull ? 'FULL' : `${item.capacity - occupantCount} Beds Left`}
          </Text>
        </View>
      </Card>
    );
  };

  // Filter students for allocation popup
  const candidateStudents = allStudents.filter((s: any) => {
    const matches =
      s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.rollNumber?.toLowerCase().includes(studentSearch.toLowerCase());
    return matches;
  });

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Room Allocation
        </Text>
        <Text variant="bodySmall" style={{ color: colors.secondary, marginBottom: 10 }}>
          Manage hostel blocks, capacity & bed assignments
        </Text>

        <Searchbar
          placeholder="Search Room or Resident..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
          inputStyle={{ minHeight: 0 }}
        />

        {/* Status Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {(['ALL', 'AVAILABLE', 'FULL', 'MAINTENANCE'] as const).map((status) => (
            <Chip
              key={status}
              selected={statusFilter === status}
              onPress={() => setStatusFilter(status)}
              style={[
                styles.filterChip,
                statusFilter === status && { backgroundColor: theme.colors.primaryContainer }
              ]}
              showSelectedOverlay
            >
              {status}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* ROOMS GRID */}
      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => item.roomNumber}
        numColumns={3}
        renderItem={renderRoom}
        contentContainerStyle={styles.gridContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Avatar.Icon size={50} icon="bed-empty" style={{ backgroundColor: '#EEE' }} color="#888" />
            <Text style={{ marginTop: 10, color: '#888' }}>No rooms match the criteria</Text>
          </View>
        }
      />

      {/* FAB: ADD STUDENT & ALLOCATE */}
      <FAB
        icon="account-plus"
        label="Add Student"
        style={styles.fab}
        color="white"
        onPress={() => setAddModalVisible(true)}
      />

      {/* --- MODAL 1: ROOM DETAILS & OCCUPANTS --- */}
      <Portal>
        <Modal
          visible={detailModalVisible}
          onDismiss={() => setDetailModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          {selectedRoom && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View>
                  <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>
                    Room {selectedRoom.roomNumber}
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.secondary }}>
                    {selectedRoom.block} • Floor {selectedRoom.floor || 1} • {selectedRoom.type}
                  </Text>
                </View>
                <Chip icon="bed">
                  {(selectedRoom.occupants?.length || 0)} / {selectedRoom.capacity} Occupied
                </Chip>
              </View>

              <Divider style={{ marginVertical: 12 }} />

              <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 8 }}>
                Bed Occupants
              </Text>

              {/* Bed Slots */}
              {['A', 'B', 'C'].slice(0, selectedRoom.capacity).map((bedId) => {
                const occupant = selectedRoom.occupants?.find((s: any) => s.bedId === bedId) || selectedRoom.occupants?.[['A', 'B', 'C'].indexOf(bedId)];

                if (occupant) {
                  return (
                    <View key={bedId} style={styles.bedSlotOccupied}>
                      <Avatar.Text
                        size={36}
                        label={`B-${bedId}`}
                        style={{ backgroundColor: colors.primaryContainer }}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
                          {occupant.name}
                        </Text>
                        <Text variant="labelSmall" style={{ color: '#666' }}>
                          Roll: {occupant.rollNumber || '--'}
                        </Text>
                      </View>
                      <IconButton
                        icon="phone"
                        size={20}
                        iconColor={colors.primary}
                        onPress={() => makeCall(occupant.phone)}
                      />
                      <IconButton
                        icon="account-minus"
                        size={20}
                        iconColor={colors.error}
                        onPress={() => occupant.id && handleDeallocate(occupant.id, occupant.name || 'Student')}
                      />
                    </View>
                  );
                }

                return (
                  <View key={bedId} style={styles.bedSlotVacant}>
                    <Avatar.Icon
                      size={36}
                      icon="bed-outline"
                      style={{ backgroundColor: '#E8F5E9' }}
                      color="#2E7D32"
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text variant="bodyMedium" style={{ color: '#2E7D32', fontWeight: 'bold' }}>
                        Bed {bedId} Available
                      </Text>
                      <Text variant="labelSmall" style={{ color: '#888' }}>
                        Ready for allocation
                      </Text>
                    </View>
                    <Button
                      mode="contained-tonal"
                      compact
                      onPress={() => openAllocateModal(bedId)}
                    >
                      Allocate
                    </Button>
                  </View>
                );
              })}

              <Divider style={{ marginVertical: 12 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Button
                  mode="outlined"
                  icon="wrench"
                  textColor={selectedRoom.status === 'MAINTENANCE' ? 'green' : '#FFA000'}
                  style={{ flex: 1 }}
                  onPress={handleToggleMaintenance}
                >
                  {selectedRoom.status === 'MAINTENANCE' ? 'Clear Maintenance' : 'Set Maintenance'}
                </Button>

                <Button mode="text" onPress={() => setDetailModalVisible(false)}>
                  Close
                </Button>
              </View>
            </ScrollView>
          )}
        </Modal>
      </Portal>

      {/* --- MODAL 2: ALLOCATE STUDENT TO BED --- */}
      <Portal>
        <Modal
          visible={allocateModalVisible}
          onDismiss={() => setAllocateModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 8 }}>
            Assign Student to Bed {targetBedId} (Room {selectedRoom?.roomNumber})
          </Text>

          <Searchbar
            placeholder="Search student..."
            value={studentSearch}
            onChangeText={setStudentSearch}
            style={{ marginBottom: 12, backgroundColor: '#F0F0F0', elevation: 0 }}
            inputStyle={{ minHeight: 0 }}
          />

          <ScrollView style={{ maxHeight: 250 }}>
            {candidateStudents.map((st: any) => {
              const isSelected = selectedStudentId === st.id;
              return (
                <Card
                  key={st.id}
                  style={[
                    styles.studentSelectCard,
                    isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryContainer }
                  ]}
                  mode="outlined"
                  onPress={() => setSelectedStudentId(st.id)}
                >
                  <Card.Title
                    title={st.name}
                    subtitle={`Roll: ${st.rollNumber || '--'} • Curr: ${st.roomNumber ? `Room ${st.roomNumber}` : 'Unassigned'}`}
                    left={(props) => (
                      <Avatar.Text
                        {...props}
                        size={32}
                        label={st.name ? st.name.substring(0, 2).toUpperCase() : 'ST'}
                      />
                    )}
                    right={(props) =>
                      isSelected ? <IconButton {...props} icon="check-circle" iconColor={colors.primary} /> : null
                    }
                  />
                </Card>
              );
            })}
          </ScrollView>

          <View style={{ marginTop: 15, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <Button mode="text" onPress={() => setAllocateModalVisible(false)}>
              Cancel
            </Button>
            <Button
              mode="contained"
              disabled={!selectedStudentId}
              onPress={handleConfirmAllocation}
            >
              Assign Bed
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* --- MODAL 3: ADD NEW STUDENT --- */}
      <Portal>
        <Modal
          visible={addModalVisible}
          onDismiss={() => setAddModalVisible(false)}
          contentContainerStyle={[styles.modal, { maxHeight: '90%' }]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 12 }}>
              Add & Allocate Student
            </Text>

            <TextInput
              label="Full Name *"
              value={formData.name}
              onChangeText={(t) => setFormData({ ...formData, name: t })}
              mode="outlined"
              dense
              style={styles.input}
            />

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                label="Room No"
                value={formData.roomNo}
                onChangeText={(t) => setFormData({ ...formData, roomNo: t })}
                mode="outlined"
                dense
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                label="Bed ID (A/B/C)"
                value={formData.bedId}
                onChangeText={(t) => setFormData({ ...formData, bedId: t })}
                mode="outlined"
                dense
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            <TextInput
              label="Roll Number"
              value={formData.rollNo}
              onChangeText={(t) => setFormData({ ...formData, rollNo: t })}
              mode="outlined"
              dense
              style={styles.input}
            />

            <TextInput
              label="Email (Login ID) *"
              value={formData.email}
              onChangeText={(t) => setFormData({ ...formData, email: t })}
              mode="outlined"
              autoCapitalize="none"
              dense
              style={styles.input}
            />

            <TextInput
              label="Password (Default: 123456)"
              value={formData.password}
              onChangeText={(t) => setFormData({ ...formData, password: t })}
              mode="outlined"
              secureTextEntry
              dense
              style={styles.input}
            />

            <TextInput
              label="Student Phone"
              value={formData.phone}
              onChangeText={(t) => setFormData({ ...formData, phone: t })}
              mode="outlined"
              keyboardType="phone-pad"
              dense
              style={styles.input}
            />

            <TextInput
              label="Parent Phone"
              value={formData.parentPhone}
              onChangeText={(t) => setFormData({ ...formData, parentPhone: t })}
              mode="outlined"
              keyboardType="phone-pad"
              dense
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={handleAddStudent}
              loading={loading}
              style={{ marginTop: 10 }}
            >
              Save & Allocate
            </Button>
            <Button mode="text" onPress={() => setAddModalVisible(false)} style={{ marginTop: 6 }}>
              Cancel
            </Button>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 16, paddingTop: 48, backgroundColor: 'white', elevation: 2 },
  title: { fontWeight: 'bold', color: colors.primary },
  searchbar: { backgroundColor: '#F0F0F0', borderRadius: 10, elevation: 0 },
  filterChip: { marginRight: 8, height: 32 },
  gridContent: { padding: 10, paddingBottom: 90 },
  roomCard: { flex: 1, margin: 4, backgroundColor: 'white', borderWidth: 1.5, borderRadius: 14 },
  roomInner: { padding: 10, alignItems: 'center', justifyContent: 'center', minHeight: 96 },
  bedRow: { flexDirection: 'row', gap: 5, marginVertical: 6 },
  bedDot: { width: 10, height: 10, borderRadius: 5 },
  emptyContainer: { alignItems: 'center', marginTop: 60, width: '100%' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: colors.primary },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 16, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bedSlotOccupied: { flexDirection: 'row', alignItems: 'center', padding: 8, marginVertical: 4, backgroundColor: '#F9F9F9', borderRadius: 10 },
  bedSlotVacant: { flexDirection: 'row', alignItems: 'center', padding: 8, marginVertical: 4, backgroundColor: '#E8F5E9', borderRadius: 10, borderWidth: 1, borderColor: '#C8E6C9' },
  studentSelectCard: { marginBottom: 6, backgroundColor: 'white', borderRadius: 10 },
  input: { marginBottom: 10, backgroundColor: 'white' }
});