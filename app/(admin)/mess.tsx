import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Chip, ActivityIndicator, FAB, Portal, Modal, TextInput, Button, useTheme, Card, Avatar } from 'react-native-paper';
import { fetchMenu, updateMenuData, fetchFeedbackStats } from '../../src/services/api';
import MealCard from '../../src/components/cards/MealCard';
import { colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AdminMessScreen() {
  const theme = useTheme();
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Mon');
  const [feedbackStats, setFeedbackStats] = useState<any>(null);

  // Edit State
  const [modalVisible, setModalVisible] = useState(false);
  const [editData, setEditData] = useState({ Breakfast: '', Lunch: '', Snacks: '', Dinner: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [menuData, stats] = await Promise.all([
        fetchMenu(),
        fetchFeedbackStats()
      ]);
      setMenu(menuData || {});
      setFeedbackStats(stats);
    } catch (e) {
      console.error('Error loading mess data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const openEditModal = () => {
    const dayMenu = menu?.[selectedDay] || {};

    const getValue = (field: any) => {
      if (!field) return '';
      if (typeof field === 'string') return field === 'Not Set' ? '' : field;
      if (field.item) return field.item === 'Not Set' ? '' : field.item;
      return '';
    };

    setEditData({
      Breakfast: getValue(dayMenu.Breakfast),
      Lunch: getValue(dayMenu.Lunch),
      Snacks: getValue(dayMenu.Snacks),
      Dinner: getValue(dayMenu.Dinner),
    });

    setModalVisible(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      breakfast: editData.Breakfast || 'Not Set',
      lunch: editData.Lunch || 'Not Set',
      snacks: editData.Snacks || 'Not Set',
      dinner: editData.Dinner || 'Not Set',
    };

    try {
      await updateMenuData(selectedDay, payload);

      const updatedLocalMenu = {
        ...menu,
        [selectedDay]: {
          Breakfast: { item: payload.breakfast, time: '7:30 - 9:00 AM' },
          Lunch: { item: payload.lunch, time: '12:30 - 2:00 PM' },
          Snacks: { item: payload.snacks, time: '4:30 - 5:30 PM' },
          Dinner: { item: payload.dinner, time: '7:30 - 9:00 PM' }
        }
      };

      setMenu(updatedLocalMenu);
      setModalVisible(false);
    } catch (e) {
      alert('Failed to save menu changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentMenu = menu?.[selectedDay] || {};

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: colors.primary }}>
            Mess Management
          </Text>
          <Text variant="bodySmall" style={{ color: colors.secondary }}>
            Schedule & Meal Quality Control
          </Text>
        </View>
        <Ionicons name="restaurant" size={24} color={colors.primary} />
      </View>

      {/* FEEDBACK OVERVIEW BANNER */}
      {feedbackStats && (
        <Card style={styles.feedbackBanner} mode="outlined">
          <Card.Content style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                ⭐ {feedbackStats.averageRating || '4.5'} / 5.0 Rating
              </Text>
              <Text variant="bodySmall" style={{ color: '#666' }}>
                Based on {feedbackStats.totalReviews || 12} student reviews
              </Text>
            </View>
            <Chip icon="thumb-up" compact style={{ backgroundColor: '#E8F5E9' }}>
              Good Quality
            </Chip>
          </Card.Content>
        </Card>
      )}

      {/* DAY SELECTOR */}
      <View style={{ height: 48, marginBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayScroll}>
          {DAYS.map((day) => (
            <Chip
              key={day}
              selected={selectedDay === day}
              onPress={() => setSelectedDay(day)}
              style={selectedDay === day ? { backgroundColor: theme.colors.primaryContainer } : {}}
              showSelectedOverlay
            >
              {day}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* MEALS LIST */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <MealCard
          type="Breakfast"
          item={currentMenu.Breakfast?.item || 'Not Set'}
          time={currentMenu.Breakfast?.time || '7:30 - 9:00 AM'}
          icon="coffee"
        />
        <MealCard
          type="Lunch"
          item={currentMenu.Lunch?.item || 'Not Set'}
          time={currentMenu.Lunch?.time || '12:30 - 2:00 PM'}
          icon="food-variant"
        />
        <MealCard
          type="Snacks"
          item={currentMenu.Snacks?.item || 'Not Set'}
          time={currentMenu.Snacks?.time || '4:30 - 5:30 PM'}
          icon="cupcake"
        />
        <MealCard
          type="Dinner"
          item={currentMenu.Dinner?.item || 'Not Set'}
          time={currentMenu.Dinner?.time || '7:30 - 9:00 PM'}
          icon="food-turkey"
        />
      </ScrollView>

      {/* EDIT MENU FAB */}
      <FAB
        icon="pencil"
        label={`Edit ${selectedDay}`}
        style={styles.fab}
        onPress={openEditModal}
        color="white"
      />

      {/* --- EDIT MODAL --- */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="headlineSmall" style={{ fontWeight: 'bold', marginBottom: 12 }}>
              Update Menu for {selectedDay}
            </Text>

            <TextInput
              label="Breakfast (7:30 - 9:00 AM)"
              value={editData.Breakfast}
              onChangeText={(t) => setEditData((prev) => ({ ...prev, Breakfast: t }))}
              mode="outlined"
              multiline
              style={styles.input}
            />

            <TextInput
              label="Lunch (12:30 - 2:00 PM)"
              value={editData.Lunch}
              onChangeText={(t) => setEditData((prev) => ({ ...prev, Lunch: t }))}
              mode="outlined"
              multiline
              style={styles.input}
            />

            <TextInput
              label="Evening Snacks (4:30 - 5:30 PM)"
              value={editData.Snacks}
              onChangeText={(t) => setEditData((prev) => ({ ...prev, Snacks: t }))}
              mode="outlined"
              multiline
              style={styles.input}
            />

            <TextInput
              label="Dinner (7:30 - 9:00 PM)"
              value={editData.Dinner}
              onChangeText={(t) => setEditData((prev) => ({ ...prev, Dinner: t }))}
              mode="outlined"
              multiline
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={handleSave}
              loading={saving}
              style={{ marginTop: 10 }}
            >
              Save Menu
            </Button>
            <Button mode="text" onPress={() => setModalVisible(false)} style={{ marginTop: 6 }}>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, paddingTop: 48, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feedbackBanner: { margin: 16, marginBottom: 8, backgroundColor: 'white', borderRadius: 12, borderColor: '#EEE' },
  dayScroll: { paddingHorizontal: 16, gap: 8 },
  content: { padding: 16 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: colors.primary },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 16, maxHeight: '85%' },
  input: { marginBottom: 12, backgroundColor: 'white' }
});