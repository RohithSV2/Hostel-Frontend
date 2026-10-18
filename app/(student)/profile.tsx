import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text, Avatar, List, Switch, Button, Divider, Surface, useTheme, IconButton, Portal, Modal, TextInput, Chip } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/useAuthStore';
import { fetchStudentData } from '../../src/services/api';
import { colors } from '../../src/constants/colors';
import { formatCurrency } from '../../src/utils/formatDate';
import { setCustomApiUrl, CURRENT_BASE_URL } from '../../src/services/axiosConfig';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);

  // Server IP Modal
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [customIp, setCustomIp] = useState(CURRENT_BASE_URL);

  // Password Modal
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchStudentData();
      setUser(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout of HostelMate?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Logout', 
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        } 
      }
    ]);
  };

  const dialNumber = (number?: string) => {
    if (number) Linking.openURL(`tel:${number}`);
    else Alert.alert('Notice', 'Phone number not available');
  };

  const saveServerUrl = async () => {
    await setCustomApiUrl(customIp);
    Alert.alert('Server Updated', `Connecting to ${customIp}`);
    setServerModalVisible(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HEADER WITH AVATAR */}
      <View style={[styles.headerBackground, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.headerContent}>
          <Avatar.Image 
            size={96} 
            source={{ uri: user?.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80' }} 
            style={styles.avatar} 
          />
          <Text variant="headlineSmall" style={styles.nameText}>
            {user?.name || 'Student Name'}
          </Text>
          <Text variant="bodyMedium" style={styles.courseText}>
            {user?.course || 'Student'}
          </Text>
          
          <View style={styles.idTag}>
            <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 12 }}>
              ROLL: {user?.rollNumber || 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* CONTENT CARDS */}
      <View style={styles.contentContainer}>
        {/* ROOM & CONTACT DETAILS */}
        <Surface style={styles.infoCard} elevation={2}>
          <View style={styles.infoRow}>
            <InfoItem label="Room No" value={user?.roomNumber || '--'} icon="door" />
            <View style={styles.verticalDivider} />
            <InfoItem label="Block" value={user?.block || 'A-Block'} icon="office-building" />
            <View style={styles.verticalDivider} />
            <InfoItem label="Bed ID" value={user?.bedId || 'A'} icon="bed" />
          </View>
        </Surface>

        {/* FEE BALANCE SUMMARY */}
        <Surface style={styles.feeCard} elevation={1}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text variant="labelSmall" style={{ color: '#666' }}>Pending Hostel & Mess Fees</Text>
              <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: (user?.feesPending || 0) > 0 ? colors.error : 'green' }}>
                {formatCurrency(user?.feesPending)}
              </Text>
            </View>
            <Chip 
              icon={(user?.feesPending || 0) > 0 ? 'alert-circle' : 'check-circle'} 
              style={{ backgroundColor: (user?.feesPending || 0) > 0 ? '#FFEBEE' : '#E8F5E9' }}
            >
              {(user?.feesPending || 0) > 0 ? 'Due Pending' : 'All Clear'}
            </Chip>
          </View>
        </Surface>

        {/* EMERGENCY CONTACT */}
        <List.Section>
          <List.Subheader style={styles.subheader}>Emergency Contact</List.Subheader>
          <Surface style={styles.guardianCard} elevation={1}>
            <List.Item
              title={user?.guardianName || 'Guardian'}
              description={user?.guardianPhone || 'Phone number not provided'}
              left={props => <List.Icon {...props} icon="shield-account" color={colors.primary} />}
              right={props => (
                <IconButton 
                  icon="phone" 
                  mode="contained" 
                  containerColor={theme.colors.primaryContainer} 
                  iconColor={colors.primary}
                  onPress={() => dialNumber(user?.guardianPhone)}
                />
              )}
            />
          </Surface>
        </List.Section>

        {/* APP PREFERENCES */}
        <List.Section>
          <List.Subheader style={styles.subheader}>Application Settings</List.Subheader>
          <List.Item
            title="Push Notifications"
            description="Alerts for gate passes and notices"
            left={props => <List.Icon {...props} icon="bell-outline" />}
            right={() => <Switch value={notifications} onValueChange={setNotifications} color={colors.primary} />}
          />
          <Divider />
          <List.Item
            title="Server Connection Settings"
            description={CURRENT_BASE_URL}
            left={props => <List.Icon {...props} icon="server-network" />}
            right={props => <List.Icon {...props} icon="pencil" />}
            onPress={() => {
              setCustomIp(CURRENT_BASE_URL);
              setServerModalVisible(true);
            }}
          />
        </List.Section>

        {/* LOGOUT */}
        <View style={styles.logoutContainer}>
          <Button 
            mode="outlined" 
            textColor={colors.error} 
            style={{ borderColor: colors.error }} 
            icon="logout" 
            onPress={handleLogout}
          >
            Sign Out
          </Button>
          <Text style={styles.versionText}>HostelMate v2.0 • Android App</Text>
        </View>
      </View>

      {/* --- SERVER SETTINGS MODAL --- */}
      <Portal>
        <Modal
          visible={serverModalVisible}
          onDismiss={() => setServerModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 10 }}>
            Configure Backend Server URL
          </Text>
          <Text variant="bodySmall" style={{ color: '#666', marginBottom: 12 }}>
            Default for Android Emulator is http://10.0.2.2:5000/api. For local testing or real phone, use your Wi-Fi IP address.
          </Text>

          <TextInput
            label="API Base URL"
            value={customIp}
            onChangeText={setCustomIp}
            mode="outlined"
            style={{ marginBottom: 15 }}
          />

          <Button mode="contained" onPress={saveServerUrl}>
            Save Server URL
          </Button>
          <Button mode="text" onPress={() => setServerModalVisible(false)} style={{ marginTop: 6 }}>
            Cancel
          </Button>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const InfoItem = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <View style={{ alignItems: 'center', flex: 1 }}>
    <Avatar.Icon size={32} icon={icon} style={{ backgroundColor: '#F0F0F0', marginBottom: 4 }} color="#555" />
    <Text variant="labelSmall" style={{ color: '#888' }}>{label}</Text>
    <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBackground: { paddingTop: 52, paddingBottom: 36, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, alignItems: 'center' },
  headerContent: { alignItems: 'center' },
  avatar: { borderWidth: 3, borderColor: 'white', marginBottom: 8 },
  nameText: { color: 'white', fontWeight: 'bold' },
  courseText: { color: 'rgba(255,255,255,0.85)', marginBottom: 8 },
  idTag: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  contentContainer: { paddingHorizontal: 16, marginTop: -20 },
  infoCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12 },
  feeCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verticalDivider: { width: 1, height: '70%', backgroundColor: '#E0E0E0' },
  subheader: { fontWeight: 'bold', color: colors.secondary, paddingHorizontal: 4 },
  guardianCard: { backgroundColor: 'white', borderRadius: 14, overflow: 'hidden' },
  logoutContainer: { marginTop: 24, marginBottom: 40, alignItems: 'center' },
  versionText: { marginTop: 10, color: '#999', fontSize: 11 },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 16 }
});