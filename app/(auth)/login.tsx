import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput, ActivityIndicator, Chip, Portal, Modal, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/useAuthStore';
import { colors } from '../../src/constants/colors';
import { CURRENT_BASE_URL, setCustomApiUrl } from '../../src/services/axiosConfig';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { login, isLoading, error } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Server Settings Modal
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [serverUrl, setServerUrl] = useState(CURRENT_BASE_URL);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Required', 'Please enter your email and password');
      return;
    }

    try {
      await login(email.trim(), password);
      
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.role === 'admin') {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(student)/dashboard');
      }
    } catch (e: any) {
      const msg = useAuthStore.getState().error || e.message || 'Unable to connect to server';
      Alert.alert('Login Failed', msg);
    }
  };

  const fillQuickDemo = (role: 'student' | 'admin') => {
    if (role === 'admin') {
      setEmail('admin@test.com');
      setPassword('123456');
    } else {
      setEmail('student@test.com');
      setPassword('123456');
    }
  };

  const handleSaveServer = async () => {
    await setCustomApiUrl(serverUrl);
    Alert.alert('Updated', `API URL set to: ${serverUrl}`);
    setServerModalVisible(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Text variant="displaySmall" style={styles.title}>HostelMate</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>Smart Hostel Management App</Text>

          {/* QUICK DEMO PILLS */}
          <Text variant="labelSmall" style={styles.demoLabel}>1-Tap Demo Logins:</Text>
          <View style={styles.pillRow}>
            <Chip 
              icon="account" 
              onPress={() => fillQuickDemo('student')}
              style={styles.demoChip}
              textStyle={{ fontSize: 11 }}
            >
              Demo Student
            </Chip>
            <Chip 
              icon="shield-account" 
              onPress={() => fillQuickDemo('admin')}
              style={styles.demoChip}
              textStyle={{ fontSize: 11 }}
            >
              Chief Warden (Admin)
            </Chip>
          </View>

          <TextInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
          />

          <Button 
            mode="contained" 
            onPress={handleLogin} 
            loading={isLoading} 
            disabled={isLoading}
            style={styles.button}
          >
            Sign In
          </Button>
        </View>
      </ScrollView>

      {/* --- SERVER SETTINGS MODAL --- */}
      <Portal>
        <Modal
          visible={serverModalVisible}
          onDismiss={() => setServerModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 8 }}>
            Hostel Backend Server URL
          </Text>
          <Text variant="bodySmall" style={{ color: '#666', marginBottom: 12 }}>
            If using Android Emulator, use http://10.0.2.2:5000/api. For physical phone or web, use your local network IP (e.g. http://192.168.x.x:5000/api).
          </Text>

          <TextInput
            label="Backend API URL"
            value={serverUrl}
            onChangeText={setServerUrl}
            mode="outlined"
            autoCapitalize="none"
            style={{ marginBottom: 15 }}
          />

          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
            <Button compact mode="outlined" onPress={() => setServerUrl('http://10.0.2.2:5000/api')}>
              Emulator
            </Button>
            <Button compact mode="outlined" onPress={() => setServerUrl('http://localhost:5000/api')}>
              Localhost
            </Button>
          </View>

          <Button mode="contained" onPress={handleSaveServer}>
            Save & Connect
          </Button>
          <Button mode="text" onPress={() => setServerModalVisible(false)} style={{ marginTop: 6 }}>
            Close
          </Button>
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  form: { paddingVertical: 20 },
  title: { fontWeight: 'bold', color: colors.primary, textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: 20, color: colors.secondary },
  demoLabel: { textAlign: 'center', color: '#666', marginBottom: 6 },
  pillRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  demoChip: { backgroundColor: colors.primaryContainer },
  input: { marginBottom: 14, backgroundColor: 'white' },
  button: { marginTop: 6, paddingVertical: 4 },
  serverHint: { marginTop: 24, padding: 8, alignItems: 'center' },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 16 }
});