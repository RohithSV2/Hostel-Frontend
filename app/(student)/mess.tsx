import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Chip, ActivityIndicator, useTheme, Card, Button, TextInput, Portal, Modal } from 'react-native-paper';
import { fetchMenu, submitMealFeedback } from '../../src/services/api';
import MealCard from '../../src/components/cards/MealCard';
import { colors } from '../../src/constants/colors';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function StudentMessScreen() {
  const theme = useTheme();
  const [menu, setMenu] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Default to current day
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const [selectedDay, setSelectedDay] = useState(DAYS[todayIndex] || 'Mon');

  // Feedback Modal
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner'>('Lunch');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const data = await fetchMenu();
      setMenu(data || {});
    } catch (e) {
      console.error('Failed to load menu:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMenu();
  };

  const handleSubmitRating = async () => {
    setSubmitting(true);
    try {
      await submitMealFeedback({
        day: selectedDay,
        mealType: selectedMeal,
        rating,
        comment
      });
      Alert.alert('Thank You!', 'Your meal feedback was submitted to the Mess Committee.');
      setFeedbackVisible(false);
      setComment('');
    } catch (e) {
      Alert.alert('Notice', 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentMenu = menu[selectedDay] || {
    Breakfast: { item: 'Not updated', time: '7:30 - 9:00 AM' },
    Lunch: { item: 'Not updated', time: '12:30 - 2:00 PM' },
    Snacks: { item: 'Not updated', time: '4:30 - 5:30 PM' },
    Dinner: { item: 'Not updated', time: '7:30 - 9:00 PM' }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: colors.primary }}>
          Hostel Mess Menu
        </Text>
        <Text variant="bodySmall" style={{ color: colors.secondary }}>
          Check daily meals and rate meal quality
        </Text>
      </View>

      {/* DAY SELECTOR */}
      <View style={{ height: 48, marginBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayScroll}>
          {DAYS.map((day, idx) => {
            const isToday = idx === todayIndex;
            return (
              <Chip
                key={day}
                selected={selectedDay === day}
                onPress={() => setSelectedDay(day)}
                style={[
                  selectedDay === day && { backgroundColor: theme.colors.primaryContainer }
                ]}
                showSelectedOverlay
              >
                {day} {isToday ? '(Today)' : ''}
              </Chip>
            );
          })}
        </ScrollView>
      </View>

      {/* MEALS LIST */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <MealCard
          type="Breakfast"
          item={currentMenu.Breakfast?.item}
          time={currentMenu.Breakfast?.time || '7:30 - 9:00 AM'}
          icon="coffee"
        />
        <MealCard
          type="Lunch"
          item={currentMenu.Lunch?.item}
          time={currentMenu.Lunch?.time || '12:30 - 2:00 PM'}
          icon="food-variant"
        />
        <MealCard
          type="Snacks"
          item={currentMenu.Snacks?.item}
          time={currentMenu.Snacks?.time || '4:30 - 5:30 PM'}
          icon="cupcake"
        />
        <MealCard
          type="Dinner"
          item={currentMenu.Dinner?.item}
          time={currentMenu.Dinner?.time || '7:30 - 9:00 PM'}
          icon="food-turkey"
        />

        {/* MEAL FEEDBACK CARD */}
        <Card style={styles.feedbackCard} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
              Rate Today's Meal Quality
            </Text>
            <Text variant="bodySmall" style={{ color: '#666', marginBottom: 12 }}>
              Help improve hostel food service by rating taste and hygiene
            </Text>
            <Button
              mode="contained"
              icon="star"
              onPress={() => setFeedbackVisible(true)}
            >
              Give Meal Feedback
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* --- FEEDBACK MODAL --- */}
      <Portal>
        <Modal
          visible={feedbackVisible}
          onDismiss={() => setFeedbackVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 10 }}>
            Rate {selectedDay} Meal
          </Text>

          <Text variant="labelMedium" style={{ fontWeight: 'bold', marginBottom: 4 }}>
            Select Meal:
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
            {(['Breakfast', 'Lunch', 'Snacks', 'Dinner'] as const).map((m) => (
              <Chip
                key={m}
                selected={selectedMeal === m}
                onPress={() => setSelectedMeal(m)}
                showSelectedOverlay
              >
                {m}
              </Chip>
            ))}
          </View>

          <Text variant="labelMedium" style={{ fontWeight: 'bold', marginBottom: 6 }}>
            Rating: {rating} / 5 Stars
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Button
                key={star}
                mode={rating >= star ? 'contained' : 'outlined'}
                compact
                onPress={() => setRating(star)}
              >
                {star}★
              </Button>
            ))}
          </View>

          <TextInput
            label="Comments / Suggestions"
            placeholder="e.g. Rice was well cooked, need more salt in dal..."
            value={comment}
            onChangeText={setComment}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={{ marginBottom: 15, backgroundColor: 'white' }}
          />

          <Button
            mode="contained"
            onPress={handleSubmitRating}
            loading={submitting}
          >
            Submit Feedback
          </Button>
          <Button mode="text" onPress={() => setFeedbackVisible(false)} style={{ marginTop: 6 }}>
            Cancel
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, paddingTop: 48, backgroundColor: 'white' },
  dayScroll: { paddingHorizontal: 16, gap: 8 },
  content: { padding: 16 },
  feedbackCard: { backgroundColor: 'white', borderRadius: 14, marginTop: 10, borderColor: '#EEE' },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 16 }
});