import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Linking, Alert, RefreshControl, ScrollView } from 'react-native';
import { Text, Searchbar, Card, Avatar, Portal, Modal, IconButton, Button, Chip, useTheme, Divider, FAB, TextInput, Surface } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { fetchAllStudents, addNewStudent, updateStudentData, deleteStudentRecord, allocateStudentRoom } from '../../src/services/api';
import { colors } from '../../src/constants/colors';
import { formatCurrency } from '../../src/utils/formatDate';

export default function AdminStudentsScreen() {
  const theme = useTheme();

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Allocated' | 'Unallocated' | 'FeeDue'>('All');

  // Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // Add Student Modal
  const [addVisible, setAddVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    rollNo: '',
    roomNo: '',
    bedId: 'A',
    block: 'A-Block',
    phone: '',
    parentPhone: '',
    guardianName: '',
    course: 'B.Tech - Computer Science'
  });

  // Reallocate Room Modal
  const [reallocateVisible, setReallocateVisible] = useState(false);
  const [newRoomNo, setNewRoomNo] = useState('');
  const [newBedId, setNewBedId] = useState('A');

  useFocusEffect(
    useCallback(() => {
      loadStudents();
    }, [])
  );

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await fetchAllStudents();
      setStudents(data || []);
    } catch (e) {
      console.error('Failed to load students:', e);
    } finally {
      setLoading(false);
    }
  };

  const makeCall = (number?: string) => {
    if (number) Linking.openURL(`tel:${number}`);
    else Alert.alert('Notice', 'No phone number provided');
  };

  const handleAddStudent = async () => {
    if (!formData.name || !formData.email) {
      Alert.alert('Required', 'Please enter at least Student Name and Email');
      return;
    }

    try {
      setLoading(true);
      await addNewStudent({
        ...formData,
        rollNumber: formData.rollNo,
        roomNumber: formData.roomNo,
        guardianPhone: formData.parentPhone
      });
      setAddVisible(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        rollNo: '',
        roomNo: '',
        bedId: 'A',
        block: 'A-Block',
        phone: '',
        parentPhone: '',
        guardianName: '',
        course: 'B.Tech - Computer Science'
      });
      Alert.alert('Success', 'Student account created and enrolled successfully!');
      await loadStudents();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  const handleReallocateRoom = async () => {
    if (!selectedStudent || !newRoomNo) return;
    try {
      await allocateStudentRoom(selectedStudent.id, newRoomNo, newBedId);
      Alert.alert('Success', `Student assigned to Room ${newRoomNo} (Bed ${newBedId})`);
      setReallocateVisible(false);
      setDetailVisible(false);
      await loadStudents();
    } catch (e: any) {
      Alert.alert('Allocation Failed', e.response?.data?.message || 'Could not allocate room');
    }
  };

  const handleDeleteStudent = (student: any) => {
    Alert.alert('Confirm Delete', `Remove ${student.name} from student records?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStudentRecord(student.id);
            setDetailVisible(false);
            await loadStudents();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete student');
          }
        }
      }
    ]);
  };

  // Filtered List
  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.roomNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'Allocated') return Boolean(s.roomNumber);
    if (filterType === 'Unallocated') return !s.roomNumber;
    if (filterType === 'FeeDue') return (s.feesPending || 0) > 0;
    return true;
  });

  const renderStudent = ({ item }: { item: any }) => {
    const hasRoom = Boolean(item.roomNumber);
    const hasFeesDue = (item.feesPending || 0) > 0;

    return (
      <Card
        style={styles.card}
        mode="outlined"
        onPress={() => {
          setSelectedStudent(item);
          setNewRoomNo(item.roomNumber || '');
          setNewBedId(item.bedId || 'A');
          setDetailVisible(true);
        }}
      >
        <Card.Title
          title={item.name}
          titleStyle={{ fontWeight: 'bold' }}
          subtitle={`${item.rollNumber || 'No Roll'} • ${item.course || 'Student'}`}
          left={(props) => (
            <Avatar.Text
              {...props}
              size={44}
              label={item.name ? item.name.substring(0, 2).toUpperCase() : 'ST'}
              style={{ backgroundColor: theme.colors.primaryContainer }}
            />
          )}
          right={(props) => (
            <IconButton
              {...props}
              icon="phone-outline"
              iconColor={colors.primary}
              onPress={() => makeCall(item.phone)}
            />
          )}
        />
        <Card.Content>
          <View style={styles.badgeRow}>
            <Chip
              icon="door"
              compact
              style={{ backgroundColor: hasRoom ? colors.primaryContainer : '#FFEBEE' }}
              textStyle={{ fontSize: 11, color: hasRoom ? colors.primary : colors.error }}
            >
              {hasRoom ? `Room ${item.roomNumber} (Bed ${item.bedId || 'A'})` : 'No Room'}
            </Chip>

            <Chip
              icon="cash"
              compact
              style={{ backgroundColor: hasFeesDue ? '#FFF3E0' : '#E8F5E9' }}
              textStyle={{ fontSize: 11, color: hasFeesDue ? '#E65100' : 'green' }}
            >
              {hasFeesDue ? `Due: ${formatCurrency(item.feesPending)}` : 'Fees Paid'}
            </Chip>

            {item.checkInStatus && (
              <Chip
                compact
                style={{ backgroundColor: '#F0F0F0' }}
                textStyle={{ fontSize: 11, color: '#555' }}
              >
                {item.checkInStatus}
              </Chip>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>Student Directory</Text>
        <Text variant="bodySmall" style={{ color: colors.secondary, marginBottom: 12 }}>
          {students.length} Total Enrolled Students
        </Text>

        <Searchbar
          placeholder="Search by name, roll, room..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
          inputStyle={{ minHeight: 0 }}
        />

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {(['All', 'Allocated', 'Unallocated', 'FeeDue'] as const).map((type) => (
            <Chip
              key={type}
              selected={filterType === type}
              onPress={() => setFilterType(type)}
              style={[styles.filterChip, filterType === type && { backgroundColor: theme.colors.primaryContainer }]}
              showSelectedOverlay
            >
              {type === 'All' ? 'All Students' : type === 'FeeDue' ? 'Fees Due' : type}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* STUDENT LIST */}
      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderStudent}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStudents} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Avatar.Icon size={50} icon="account-search" style={{ backgroundColor: '#EEE' }} color="#888" />
            <Text style={{ marginTop: 10, color: '#888' }}>No students found</Text>
          </View>
        }
      />

      {/* ADD STUDENT FAB */}
      <FAB
        icon="account-plus"
        label="Add Student"
        style={styles.fab}
        color="white"
        onPress={() => setAddVisible(true)}
      />

      {/* --- MODAL 1: STUDENT PROFILE DETAILS --- */}
      <Portal>
        <Modal
          visible={detailVisible}
          onDismiss={() => setDetailVisible(false)}
          contentContainerStyle={styles.modal}
        >
          {selectedStudent && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ alignItems: 'center', marginBottom: 15 }}>
                <Avatar.Text
                  size={64}
                  label={selectedStudent.name ? selectedStudent.name.substring(0, 2).toUpperCase() : 'ST'}
                  style={{ backgroundColor: colors.primaryContainer }}
                />
                <Text variant="titleLarge" style={{ fontWeight: 'bold', marginTop: 8 }}>
                  {selectedStudent.name}
                </Text>
                <Text variant="bodyMedium" style={{ color: colors.secondary }}>
                  {selectedStudent.email}
                </Text>
              </View>

              <Divider style={{ marginVertical: 10 }} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Roll Number:</Text>
                <Text style={styles.infoValue}>{selectedStudent.rollNumber || '--'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Room & Bed:</Text>
                <Text style={styles.infoValue}>
                  {selectedStudent.roomNumber ? `Room ${selectedStudent.roomNumber} (Bed ${selectedStudent.bedId || 'A'})` : 'Not Allocated'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Course:</Text>
                <Text style={styles.infoValue}>{selectedStudent.course || '--'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Student Phone:</Text>
                <Text style={[styles.infoValue, { color: colors.primary }]} onPress={() => makeCall(selectedStudent.phone)}>
                  {selectedStudent.phone || 'Not added'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Parent / Guardian:</Text>
                <Text style={styles.infoValue}>{selectedStudent.guardianName || 'Guardian'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Parent Phone:</Text>
                <Text style={[styles.infoValue, { color: colors.primary }]} onPress={() => makeCall(selectedStudent.guardianPhone)}>
                  {selectedStudent.guardianPhone || 'Not added'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Blood Group:</Text>
                <Text style={styles.infoValue}>{selectedStudent.bloodGroup || 'O+'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pending Fees:</Text>
                <Text style={[styles.infoValue, { color: (selectedStudent.feesPending || 0) > 0 ? colors.error : 'green', fontWeight: 'bold' }]}>
                  {formatCurrency(selectedStudent.feesPending)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Check-in Status:</Text>
                <Text style={styles.infoValue}>{selectedStudent.checkInStatus || 'In Campus'}</Text>
              </View>

              <Divider style={{ marginVertical: 15 }} />

              <View style={{ gap: 10 }}>
                <Button
                  mode="contained"
                  icon="bed"
                  onPress={() => setReallocateVisible(true)}
                >
                  Allocate / Change Room
                </Button>

                <Button
                  mode="outlined"
                  icon="phone"
                  onPress={() => makeCall(selectedStudent.guardianPhone || selectedStudent.phone)}
                >
                  Call Guardian
                </Button>

                <Button
                  mode="text"
                  textColor={colors.error}
                  icon="delete"
                  onPress={() => handleDeleteStudent(selectedStudent)}
                >
                  Delete Student
                </Button>

                <Button mode="text" onPress={() => setDetailVisible(false)}>
                  Close
                </Button>
              </View>
            </ScrollView>
          )}
        </Modal>
      </Portal>

      {/* --- MODAL 2: REALLOCATE ROOM --- */}
      <Portal>
        <Modal
          visible={reallocateVisible}
          onDismiss={() => setReallocateVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 15 }}>
            Allocate Room for {selectedStudent?.name}
          </Text>

          <TextInput
            label="Room Number (e.g. 101, 102)"
            value={newRoomNo}
            onChangeText={setNewRoomNo}
            mode="outlined"
            style={{ marginBottom: 12 }}
          />

          <TextInput
            label="Bed ID (A, B, or C)"
            value={newBedId}
            onChangeText={setNewBedId}
            mode="outlined"
            style={{ marginBottom: 20 }}
          />

          <Button mode="contained" onPress={handleReallocateRoom}>
            Confirm Allocation
          </Button>
          <Button mode="text" onPress={() => setReallocateVisible(false)} style={{ marginTop: 8 }}>
            Cancel
          </Button>
        </Modal>
      </Portal>

      {/* --- MODAL 3: ADD STUDENT --- */}
      <Portal>
        <Modal
          visible={addVisible}
          onDismiss={() => setAddVisible(false)}
          contentContainerStyle={[styles.modal, { maxHeight: '90%' }]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 12 }}>
              Add New Student
            </Text>

            <TextInput
              label="Full Name *"
              value={formData.name}
              onChangeText={(t) => setFormData({ ...formData, name: t })}
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
              keyboardType="email-address"
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

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                label="Roll Number"
                value={formData.rollNo}
                onChangeText={(t) => setFormData({ ...formData, rollNo: t })}
                mode="outlined"
                dense
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                label="Room Number"
                value={formData.roomNo}
                onChangeText={(t) => setFormData({ ...formData, roomNo: t })}
                mode="outlined"
                dense
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                label="Bed ID (A/B/C)"
                value={formData.bedId}
                onChangeText={(t) => setFormData({ ...formData, bedId: t })}
                mode="outlined"
                dense
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                label="Block"
                value={formData.block}
                onChangeText={(t) => setFormData({ ...formData, block: t })}
                mode="outlined"
                dense
                style={[styles.input, { flex: 1 }]}
              />
            </View>

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
              label="Guardian Name"
              value={formData.guardianName}
              onChangeText={(t) => setFormData({ ...formData, guardianName: t })}
              mode="outlined"
              dense
              style={styles.input}
            />

            <TextInput
              label="Guardian Phone"
              value={formData.parentPhone}
              onChangeText={(t) => setFormData({ ...formData, parentPhone: t })}
              mode="outlined"
              keyboardType="phone-pad"
              dense
              style={styles.input}
            />

            <TextInput
              label="Course / Branch"
              value={formData.course}
              onChangeText={(t) => setFormData({ ...formData, course: t })}
              mode="outlined"
              dense
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={handleAddStudent}
              loading={loading}
              style={{ marginTop: 10 }}
            >
              Enroll Student
            </Button>
            <Button mode="text" onPress={() => setAddVisible(false)} style={{ marginTop: 6 }}>
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
  card: { marginBottom: 10, backgroundColor: 'white', borderRadius: 12, borderColor: '#EEE' },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: colors.primary },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 16, maxHeight: '85%' },
  input: { marginBottom: 10, backgroundColor: 'white' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  infoLabel: { color: '#666', fontSize: 13 },
  infoValue: { fontWeight: '600', fontSize: 13 }
});
