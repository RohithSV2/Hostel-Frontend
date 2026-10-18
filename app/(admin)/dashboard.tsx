import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Alert, RefreshControl } from 'react-native';
import { Text, Card, Avatar, ActivityIndicator, IconButton, useTheme, Button, TextInput, Chip, Surface } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/useAuthStore';
import { fetchAdminStats, fetchLeaveRequests, updateGatePass, sendBroadcast } from '../../src/services/api'; 
import { colors } from '../../src/constants/colors';
import { formatCurrency } from '../../src/utils/formatDate';

export default function AdminDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { logout, user } = useAuthStore();
  
  const [stats, setStats] = useState<any>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [noticeText, setNoticeText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingNotice, setSendingNotice] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [])
  );

  const loadAllData = async () => {
    try {
      const [statsData, leavesData] = await Promise.all([
        fetchAdminStats(), 
        fetchLeaveRequests()
      ]);
      setStats(statsData);
      setLeaves(leavesData ? leavesData.filter((l: any) => l.status === 'Pending') : []);
    } catch (e) {
      console.error('Dashboard Load Error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  const handleLeaveAction = async (id: number | string, action: 'Approved' | 'Rejected') => {
    setLeaves(prev => prev.filter(item => item.id !== id));
    try {
      await updateGatePass(id, action);
      Alert.alert('Success', `Gate Pass ${action}`);
      loadAllData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update request');
    }
  };

  const postNotice = async () => {
    if (!noticeText.trim()) return;
    setSendingNotice(true);
    try {
      await sendBroadcast(noticeText, user?.id || 1);
      Alert.alert('Sent', 'Official notice posted to Community Chat and Student Noticeboard.');
      setNoticeText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send notice.');
    } finally {
      setSendingNotice(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const occupiedPercent = stats?.totalRooms 
    ? Math.round(((stats.occupiedRooms || 0) / stats.totalRooms) * 100) 
    : 0;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: colors.primary }}>
            Admin Dashboard
          </Text>
          <Text variant="bodySmall" style={{ color: colors.secondary }}>
            Welcome, {user?.name || 'Hostel Warden'}
          </Text>
        </View>
        <IconButton 
          icon="logout" 
          mode="contained-tonal" 
          onPress={() => { 
            logout(); 
            router.replace('/(auth)/login'); 
          }} 
        />
      </View>

      {/* 1. QUICK STATS CARDS */}
      <View style={styles.statsRow}>
        <Surface style={styles.statCard} elevation={2}>
          <Avatar.Icon size={36} icon="account-group" style={{ backgroundColor: colors.primaryContainer }} color={colors.primary} />
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginTop: 4 }}>
            {stats?.totalStudents || 0}
          </Text>
          <Text variant="labelSmall" style={{ color: '#666' }}>Students</Text>
        </Surface>

        <Surface style={styles.statCard} elevation={2}>
          <Avatar.Icon size={36} icon="bed" style={{ backgroundColor: '#E8F5E9' }} color="#2E7D32" />
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginTop: 4 }}>
            {occupiedPercent}%
          </Text>
          <Text variant="labelSmall" style={{ color: '#666' }}>Occupancy</Text>
        </Surface>

        <Surface style={styles.statCard} elevation={2}>
          <Avatar.Icon size={36} icon="alert-circle" style={{ backgroundColor: '#FFEBEE' }} color={colors.error} />
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginTop: 4 }}>
            {stats?.pendingComplaints || 0}
          </Text>
          <Text variant="labelSmall" style={{ color: '#666' }}>Issues</Text>
        </Surface>

        <Surface style={styles.statCard} elevation={2}>
          <Avatar.Icon size={36} icon="cash" style={{ backgroundColor: '#FFF3E0' }} color="#E65100" />
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginTop: 4 }}>
            {formatCurrency(stats?.pendingFees ? Math.round(stats.pendingFees / 1000) * 1000 : 0)}
          </Text>
          <Text variant="labelSmall" style={{ color: '#666' }}>Due Fees</Text>
        </Surface>
      </View>

      {/* 2. OCCUPANCY TREND CHART */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Hostel Occupancy Trend</Text>
      <View style={styles.chartContainer}>
        <LineChart
          data={{
            labels: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
            datasets: [{ 
              data: [12, 16, 18, stats?.occupiedRooms || 19, stats?.totalRooms || 20] 
            }] 
          }}
          width={Dimensions.get('window').width - 32}
          height={180}
          yAxisLabel=""
          yAxisSuffix=" rms"
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(155, 17, 30, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(45, 34, 36, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: { r: '5', strokeWidth: '2', stroke: colors.primary }
          }}
          bezier
          style={{ marginVertical: 4, borderRadius: 16 }}
        />
      </View>

      {/* 3. GATE PASS REQUESTS */}
      <View style={styles.sectionHeaderRow}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Gate Pass Requests ({leaves.length})
        </Text>
      </View>

      {leaves.length === 0 ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={{ textAlign: 'center', color: '#888', paddingVertical: 10 }}>
              No pending gate pass requests.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        leaves.slice(0, 3).map((leave) => (
          <Card key={leave.id} style={styles.leaveCard} mode="outlined">
            <Card.Content>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                    {leave.User?.name || 'Student'}{' '}
                    <Text style={{ color: colors.secondary, fontSize: 13 }}>
                      (Room {leave.User?.roomNumber || 'N/A'})
                    </Text>
                  </Text>
                  <Text variant="bodySmall" style={{ marginTop: 2, color: '#444' }}>
                    {leave.reason}
                  </Text>
                  <Chip icon="calendar" style={{ marginTop: 6, height: 26 }} textStyle={{ fontSize: 10 }} compact>
                    {leave.from} - {leave.to}
                  </Chip>
                </View>
                <View style={{ gap: 6, marginLeft: 10 }}>
                  <Button 
                    mode="contained" 
                    compact 
                    buttonColor="#2E7D32" 
                    onPress={() => handleLeaveAction(leave.id, 'Approved')}
                  >
                    Approve
                  </Button>
                  <Button 
                    mode="contained-tonal" 
                    compact 
                    buttonColor="#FFEBEE" 
                    textColor="#C62828" 
                    onPress={() => handleLeaveAction(leave.id, 'Rejected')}
                  >
                    Reject
                  </Button>
                </View>
              </View>
            </Card.Content>
          </Card>
        ))
      )}

      {/* 4. BROADCAST NOTICE */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Broadcast Notice</Text>
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <TextInput
            label="Announcement for Residents"
            placeholder="e.g. Hostel Wi-Fi maintenance tonight..."
            value={noticeText}
            onChangeText={setNoticeText}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={{ backgroundColor: 'white', marginBottom: 10 }}
          />
          <Button 
            mode="contained" 
            icon="bullhorn" 
            onPress={postNotice} 
            loading={sendingNotice}
            disabled={!noticeText.trim() || sendingNotice}
          >
            Send Broadcast to All
          </Button>
        </Card.Content>
      </Card>

      {/* 5. RECENT ACTIVITY FEED */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Recent Hostel Activity</Text>
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          {stats?.recentActivities && stats.recentActivities.length > 0 ? (
            stats.recentActivities.map((act: any) => (
              <View key={act.id} style={styles.activityItem}>
                <Avatar.Icon size={32} icon={act.icon} style={{ backgroundColor: '#F0F0F0' }} color="#555" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text variant="bodySmall" style={{ fontWeight: '500' }}>{act.text}</Text>
                  <Text variant="labelSmall" style={{ color: '#888' }}>{act.time}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 }}>
              No recent activity recorded
            </Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginTop: 36, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontWeight: 'bold', marginBottom: 8, marginTop: 14, marginLeft: 2 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statCard: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: 'white', alignItems: 'center' },
  chartContainer: { alignItems: 'center', marginBottom: 8, backgroundColor: 'white', borderRadius: 16, padding: 6, elevation: 1 },
  card: { backgroundColor: 'white', borderRadius: 14, marginBottom: 10, borderColor: '#EEE' },
  leaveCard: { backgroundColor: 'white', borderRadius: 14, marginBottom: 8, borderColor: '#EEE', borderLeftWidth: 4, borderLeftColor: colors.primary },
  activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }
});