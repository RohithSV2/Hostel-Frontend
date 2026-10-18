import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ScrollView, Alert } from 'react-native';
import { Text, FAB, Modal, Portal, TextInput, Button, ActivityIndicator, SegmentedButtons, Card, Chip, useTheme, Divider, Avatar } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { fetchComplaints, submitComplaint, fetchLeaveRequests, submitLeaveRequest } from '../../src/services/api';
import { colors } from '../../src/constants/colors';
import ComplaintCard from '../../src/components/cards/ComplaintCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDate, getPriorityColor } from '../../src/utils/formatDate';
import { Complaint, GatePass } from '../../src/types';

export default function StudentHelpScreen() {
  const theme = useTheme();
  const [view, setView] = useState<'issues' | 'gatepass'>('issues');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [leaves, setLeaves] = useState<GatePass[]>([]);

  // Modals
  const [issueModal, setIssueModal] = useState(false);
  const [leaveModal, setLeaveModal] = useState(false);

  // Form Data
  const [newIssue, setNewIssue] = useState({
    title: '',
    category: 'Electrical',
    priority: 'Normal',
    description: ''
  });

  const [newLeave, setNewLeave] = useState({
    reason: '',
    passType: 'Day Out',
    from: '',
    to: '',
    departureTime: '10:00 AM',
    returnTime: '07:00 PM',
    destination: ''
  });

  const categories = ['Electrical', 'Plumbing', 'WiFi/Internet', 'Carpentry', 'Cleaning', 'Food', 'Other'];
  const priorities = ['Low', 'Normal', 'High', 'Urgent'];
  const passTypes = ['Day Out', 'Night Stay', 'Home Visit', 'Emergency Leave'];

  useFocusEffect(
    useCallback(() => {
      init();
    }, [])
  );

  const init = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const id = JSON.parse(userStr).id;
        setUserId(id);
        await loadAllData(id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAllData = async (id?: number | null) => {
    setLoading(true);
    try {
      const [issuesData, leavesData] = await Promise.all([
        fetchComplaints(),
        fetchLeaveRequests()
      ]);
      setComplaints(issuesData || []);
      setLeaves(leavesData || []);
    } catch (e) {
      console.error('Load Error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData(userId);
  };

  const handleIssueSubmit = async () => {
    if (!newIssue.title || !newIssue.category) {
      Alert.alert('Required', 'Please enter a title and category');
      return;
    }
    try {
      await submitComplaint({ ...newIssue, userId: userId || undefined });
      setIssueModal(false);
      setNewIssue({ title: '', category: 'Electrical', priority: 'Normal', description: '' });
      Alert.alert('Success', 'Complaint registered. Admin has been notified.');
      loadAllData(userId);
    } catch (e) {
      Alert.alert('Error', 'Failed to submit complaint');
    }
  };

  const handleLeaveSubmit = async () => {
    if (!newLeave.reason || !newLeave.from || !newLeave.to) {
      Alert.alert('Required', 'Please fill in Reason, From, and To dates');
      return;
    }
    try {
      await submitLeaveRequest({ ...newLeave, studentId: userId || undefined });
      setLeaveModal(false);
      setNewLeave({
        reason: '',
        passType: 'Day Out',
        from: '',
        to: '',
        departureTime: '10:00 AM',
        returnTime: '07:00 PM',
        destination: ''
      });
      Alert.alert('Success', 'Gate Pass request submitted for warden approval.');
      loadAllData(userId);
    } catch (e) {
      Alert.alert('Error', 'Failed to submit gate pass request');
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Help & Requests
        </Text>
        <Text variant="bodySmall" style={{ color: colors.secondary, marginBottom: 12 }}>
          Lodge maintenance tickets or request hostel exit passes
        </Text>

        <SegmentedButtons
          value={view}
          onValueChange={(v) => setView(v as any)}
          buttons={[
            { value: 'issues', label: 'Maintenance', icon: 'tools' },
            { value: 'gatepass', label: 'Gate Pass', icon: 'door-open' },
          ]}
        />
      </View>

      <View style={{ flex: 1, padding: 16 }}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 50 }} />
        ) : view === 'issues' ? (
          <>
            <FlatList
              data={complaints}
              keyExtractor={(item) => item.id.toString()}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              renderItem={({ item }) => {
                const isResolved = item.status === 'Resolved';
                const isInProgress = item.status === 'In Progress';
                const statusColor = isResolved ? '#2E7D32' : isInProgress ? '#F57C00' : '#C62828';

                return (
                  <Card style={[styles.card, { borderLeftColor: statusColor, borderLeftWidth: 4 }]} mode="outlined">
                    <Card.Content>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                            {item.title}
                          </Text>
                          <Text variant="bodySmall" style={{ color: '#666', marginTop: 2 }}>
                            {formatDate(item.createdAt || item.date)} • {item.category}
                          </Text>
                        </View>
                        <Chip
                          compact
                          style={{ backgroundColor: `${statusColor}15` }}
                          textStyle={{ color: statusColor, fontWeight: 'bold', fontSize: 11 }}
                        >
                          {item.status}
                        </Chip>
                      </View>

                      {item.description ? (
                        <Text variant="bodySmall" style={{ color: '#444', marginTop: 6 }}>
                          {item.description}
                        </Text>
                      ) : null}

                      {item.adminRemarks ? (
                        <View style={styles.remarksBox}>
                          <Text variant="labelSmall" style={{ fontWeight: 'bold', color: colors.primary }}>
                            Warden Remark:
                          </Text>
                          <Text variant="bodySmall" style={{ color: '#333' }}>
                            {item.adminRemarks}
                          </Text>
                        </View>
                      ) : null}
                    </Card.Content>
                  </Card>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Avatar.Icon size={50} icon="tools" style={{ backgroundColor: '#EEE' }} color="#888" />
                  <Text style={{ marginTop: 10, color: '#888' }}>No maintenance issues reported.</Text>
                </View>
              }
            />
            <FAB
              icon="plus"
              label="Report Issue"
              style={styles.fab}
              onPress={() => setIssueModal(true)}
              color="white"
            />
          </>
        ) : (
          <>
            <FlatList
              data={leaves}
              keyExtractor={(item) => item.id.toString()}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              renderItem={({ item }) => {
                const isApproved = item.status === 'Approved';
                const isRejected = item.status === 'Rejected';
                const statusColor = isApproved ? '#2E7D32' : isRejected ? '#C62828' : '#F57C00';

                return (
                  <Card style={[styles.card, { borderLeftColor: statusColor, borderLeftWidth: 4 }]} mode="outlined">
                    <Card.Content>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                          <Chip compact style={{ alignSelf: 'flex-start', marginBottom: 4 }}>
                            {item.passType || 'Day Out'}
                          </Chip>
                          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                            {item.reason}
                          </Text>
                          <Text variant="bodySmall" style={{ color: '#666', marginTop: 2 }}>
                            📅 {item.from} to {item.to}
                          </Text>
                          {item.destination ? (
                            <Text variant="labelSmall" style={{ color: '#888', marginTop: 2 }}>
                              Destination: {item.destination}
                            </Text>
                          ) : null}
                        </View>
                        <Chip
                          style={{ backgroundColor: `${statusColor}15` }}
                          textStyle={{ color: statusColor, fontWeight: 'bold', fontSize: 11 }}
                        >
                          {item.status}
                        </Chip>
                      </View>

                      {item.passToken && (
                        <View style={styles.passTokenBox}>
                          <Text variant="labelSmall" style={{ color: '#666' }}>Pass Code:</Text>
                          <Text variant="titleSmall" style={{ fontWeight: 'bold', color: colors.primary, letterSpacing: 1 }}>
                            {item.passToken}
                          </Text>
                        </View>
                      )}

                      {item.adminRemarks ? (
                        <Text variant="bodySmall" style={{ color: '#666', fontStyle: 'italic', marginTop: 6 }}>
                          Note: {item.adminRemarks}
                        </Text>
                      ) : null}
                    </Card.Content>
                  </Card>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Avatar.Icon size={50} icon="door-open" style={{ backgroundColor: '#EEE' }} color="#888" />
                  <Text style={{ marginTop: 10, color: '#888' }}>No gate pass requests found.</Text>
                </View>
              }
            />
            <FAB
              icon="walk"
              label="Apply Gate Pass"
              style={styles.fab}
              onPress={() => setLeaveModal(true)}
              color="white"
            />
          </>
        )}
      </View>

      {/* --- MODAL 1: REPORT ISSUE --- */}
      <Portal>
        <Modal
          visible={issueModal}
          onDismiss={() => setIssueModal(false)}
          contentContainerStyle={[styles.modal, { maxHeight: '85%' }]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 12 }}>
              Report Maintenance Issue
            </Text>

            <TextInput
              label="Problem Title *"
              placeholder="e.g. Broken study lamp, water leak"
              value={newIssue.title}
              onChangeText={(t) => setNewIssue({ ...newIssue, title: t })}
              mode="outlined"
              style={styles.input}
            />

            <Text variant="labelMedium" style={{ fontWeight: 'bold', marginTop: 6, marginBottom: 4 }}>
              Select Category:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  selected={newIssue.category === cat}
                  onPress={() => setNewIssue({ ...newIssue, category: cat })}
                  style={{ marginRight: 6 }}
                  showSelectedOverlay
                >
                  {cat}
                </Chip>
              ))}
            </ScrollView>

            <Text variant="labelMedium" style={{ fontWeight: 'bold', marginTop: 6, marginBottom: 4 }}>
              Priority Level:
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
              {priorities.map((pri) => (
                <Chip
                  key={pri}
                  selected={newIssue.priority === pri}
                  onPress={() => setNewIssue({ ...newIssue, priority: pri })}
                  showSelectedOverlay
                  style={newIssue.priority === pri ? { backgroundColor: `${getPriorityColor(pri)}25` } : {}}
                  textStyle={newIssue.priority === pri ? { color: getPriorityColor(pri), fontWeight: 'bold' } : {}}
                >
                  {pri}
                </Chip>
              ))}
            </View>

            <TextInput
              label="Detailed Description"
              placeholder="Provide exact room location or details..."
              value={newIssue.description}
              onChangeText={(t) => setNewIssue({ ...newIssue, description: t })}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <Button mode="contained" onPress={handleIssueSubmit} style={{ marginTop: 10 }}>
              Submit Issue
            </Button>
            <Button mode="text" onPress={() => setIssueModal(false)} style={{ marginTop: 6 }}>
              Cancel
            </Button>
          </ScrollView>
        </Modal>

        {/* --- MODAL 2: APPLY GATE PASS --- */}
        <Modal
          visible={leaveModal}
          onDismiss={() => setLeaveModal(false)}
          contentContainerStyle={[styles.modal, { maxHeight: '85%' }]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 12 }}>
              Request Digital Gate Pass
            </Text>

            <Text variant="labelMedium" style={{ fontWeight: 'bold', marginBottom: 4 }}>
              Pass Type:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {passTypes.map((pt) => (
                <Chip
                  key={pt}
                  selected={newLeave.passType === pt}
                  onPress={() => setNewLeave({ ...newLeave, passType: pt })}
                  style={{ marginRight: 6 }}
                  showSelectedOverlay
                >
                  {pt}
                </Chip>
              ))}
            </ScrollView>

            <TextInput
              label="Purpose / Reason *"
              placeholder="e.g. Going home for weekend, project visit"
              value={newLeave.reason}
              onChangeText={(t) => setNewLeave({ ...newLeave, reason: t })}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Destination *"
              placeholder="City, Mall, Home address"
              value={newLeave.destination}
              onChangeText={(t) => setNewLeave({ ...newLeave, destination: t })}
              mode="outlined"
              style={styles.input}
            />

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                label="From Date (YYYY-MM-DD)"
                value={newLeave.from}
                onChangeText={(t) => setNewLeave({ ...newLeave, from: t })}
                mode="outlined"
                dense
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                label="To Date (YYYY-MM-DD)"
                value={newLeave.to}
                onChangeText={(t) => setNewLeave({ ...newLeave, to: t })}
                mode="outlined"
                dense
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                label="Departure Time"
                value={newLeave.departureTime}
                onChangeText={(t) => setNewLeave({ ...newLeave, departureTime: t })}
                mode="outlined"
                dense
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                label="Expected Return Time"
                value={newLeave.returnTime}
                onChangeText={(t) => setNewLeave({ ...newLeave, returnTime: t })}
                mode="outlined"
                dense
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            <Button mode="contained" onPress={handleLeaveSubmit} style={{ marginTop: 10 }}>
              Send Request
            </Button>
            <Button mode="text" onPress={() => setLeaveModal(false)} style={{ marginTop: 6 }}>
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
  card: { marginBottom: 10, backgroundColor: 'white', borderRadius: 12, borderColor: '#EEE' },
  remarksBox: { marginTop: 8, padding: 8, backgroundColor: colors.primaryContainer, borderRadius: 8 },
  passTokenBox: { marginTop: 8, padding: 6, backgroundColor: '#F5F5F5', borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: colors.primary },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 16 },
  input: { marginBottom: 10, backgroundColor: 'white' }
});