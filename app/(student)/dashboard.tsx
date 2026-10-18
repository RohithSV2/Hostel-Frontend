import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Button, ActivityIndicator, Surface, Chip, Avatar, Card, useTheme } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/useAuthStore';
import { fetchStudentData, fetchLeaveRequests, updateStudentProfile } from '../../src/services/api';
import InfoCard from '../../src/components/cards/InfoCard';
import { colors } from '../../src/constants/colors';
import { formatCurrency } from '../../src/utils/formatDate';

export default function StudentDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  
  const [studentData, setStudentData] = useState<any>(null);
  const [activePass, setActivePass] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState('In Campus');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [data, passes] = await Promise.all([
        fetchStudentData(),
        fetchLeaveRequests()
      ]);
      setStudentData(data);
      if (data?.checkInStatus) {
        setCheckInStatus(data.checkInStatus);
      }
      
      // Find latest approved or active pass
      if (passes && passes.length > 0) {
        const approved = passes.find((p: any) => p.status === 'Approved');
        setActivePass(approved || passes[0]);
      }
    } catch (e) {
      console.error('Student dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleCheckIn = async () => {
    const nextStatus = checkInStatus === 'In Campus' ? 'Out of Campus' : 'In Campus';
    setCheckInStatus(nextStatus);
    try {
      await updateStudentProfile({ checkInStatus: nextStatus });
    } catch (e) {}
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const roomNo = studentData?.roomNumber || 'Unassigned';
  const block = studentData?.block || 'A-Block';
  const bedId = studentData?.bedId || 'A';
  const feesPending = studentData?.feesPending || 0;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineMedium" style={styles.welcomeText}>
            Hello, {user?.name || 'Student'} 👋
          </Text>
          <Text variant="bodySmall" style={{ color: colors.secondary }}>
            {studentData?.course || 'Resident Student'} • Roll: {studentData?.rollNumber || '--'}
          </Text>
        </View>
        <Avatar.Image 
          size={48} 
          source={{ uri: studentData?.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80' }} 
        />
      </View>

      {/* CURFEW & CHECK-IN STATUS BADGE */}
      <Surface style={styles.statusBanner} elevation={1}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar.Icon 
              size={32} 
              icon={checkInStatus === 'In Campus' ? 'shield-check' : 'door-open'} 
              style={{ backgroundColor: checkInStatus === 'In Campus' ? '#E8F5E9' : '#FFF3E0' }} 
              color={checkInStatus === 'In Campus' ? '#2E7D32' : '#E65100'} 
            />
            <View style={{ marginLeft: 10 }}>
              <Text variant="labelSmall" style={{ color: '#888' }}>Campus Presence</Text>
              <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>{checkInStatus}</Text>
            </View>
          </View>
          <Button 
            mode="outlined" 
            compact 
            onPress={toggleCheckIn}
            textColor={colors.primary}
          >
            {checkInStatus === 'In Campus' ? 'Log Exit' : 'Log Return'}
          </Button>
        </View>
      </Surface>

      {/* ROOM ALLOCATION & FEE GRID */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Room & Resident Details</Text>
      <View style={styles.gridContainer}>
        <View style={styles.row}>
          <InfoCard title="Room Number" value={roomNo} icon="door" />
          <InfoCard title="Hostel Block" value={block} icon="office-building" />
        </View>
        <View style={styles.row}>
          <InfoCard title="Bed Assignment" value={`Bed ${bedId}`} icon="bed" />
          <InfoCard 
            title="Fees Balance" 
            value={formatCurrency(feesPending)} 
            icon="cash" 
            color={feesPending > 0 ? '#FFEBEE' : '#E8F5E9'} 
          />
        </View>
      </View>

      {/* ACTIVE GATE PASS PREVIEW (IF ANY) */}
      {activePass && (
        <>
          <Text variant="titleMedium" style={styles.sectionTitle}>Digital Gate Pass</Text>
          <Card style={styles.passCard} mode="outlined">
            <Card.Content>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text variant="labelSmall" style={{ color: colors.secondary }}>
                    {activePass.passType || 'Gate Pass'}
                  </Text>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                    {activePass.reason}
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#666', marginTop: 2 }}>
                    Valid: {activePass.from} to {activePass.to}
                  </Text>
                </View>
                <Chip 
                  style={{
                    backgroundColor: activePass.status === 'Approved' ? '#E8F5E9' : '#FFF3E0'
                  }}
                  textStyle={{
                    color: activePass.status === 'Approved' ? '#2E7D32' : '#E65100',
                    fontWeight: 'bold',
                    fontSize: 11
                  }}
                >
                  {activePass.status}
                </Chip>
              </View>

              {activePass.passToken && (
                <View style={styles.tokenBox}>
                  <Text variant="labelSmall" style={{ color: '#666' }}>Pass Verification Token:</Text>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold', letterSpacing: 1, color: colors.primary }}>
                    {activePass.passToken}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        </>
      )}

      {/* QUICK ACTIONS SECTION */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Quick Services</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => router.push('/(student)/complaints')}
        >
          <Avatar.Icon size={42} icon="tools" style={{ backgroundColor: colors.primaryContainer }} color={colors.primary} />
          <Text variant="labelMedium" style={{ fontWeight: 'bold', marginTop: 6 }}>
            Report Issue
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => router.push('/(student)/complaints')}
        >
          <Avatar.Icon size={42} icon="door-open" style={{ backgroundColor: '#E8F5E9' }} color="#2E7D32" />
          <Text variant="labelMedium" style={{ fontWeight: 'bold', marginTop: 6 }}>
            Gate Pass
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => router.push('/(student)/mess')}
        >
          <Avatar.Icon size={42} icon="food" style={{ backgroundColor: '#FFF3E0' }} color="#E65100" />
          <Text variant="labelMedium" style={{ fontWeight: 'bold', marginTop: 6 }}>
            Mess Menu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => router.push('/(student)/community')}
        >
          <Avatar.Icon size={42} icon="forum" style={{ backgroundColor: '#E1F5FE' }} color="#0288D1" />
          <Text variant="labelMedium" style={{ fontWeight: 'bold', marginTop: 6 }}>
            Community
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginTop: 36, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeText: { fontWeight: 'bold', color: colors.primary },
  statusBanner: { padding: 12, borderRadius: 14, backgroundColor: 'white', marginBottom: 16 },
  gridContainer: { marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { fontWeight: 'bold', marginBottom: 8, marginTop: 10, marginLeft: 2 },
  passCard: { backgroundColor: 'white', borderRadius: 14, marginBottom: 14, borderColor: '#EEE' },
  tokenBox: { marginTop: 10, padding: 8, backgroundColor: '#F9F9F9', borderRadius: 8, alignItems: 'center' },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  actionButton: { flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#EEE' }
});