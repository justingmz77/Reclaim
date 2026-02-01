// Import test database setup first - this sets up env vars and initializes the test db
const { clearTestDatabase, createTestUser, getTestDatabase } = require('../setup/testDatabase');

// Clear require cache for Habits so it uses the test database
delete require.cache[require.resolve('../../utils/db/Habits')];

// Import Habits after test database is configured
const Habits = require('../../utils/db/Habits');

describe('Habits Module - Unit Tests', () => {
  let testUser;
  let testUser2;
  let db;

  beforeAll(async () => {
    db = getTestDatabase();
  });

  beforeEach(async () => {
    clearTestDatabase();
    testUser = await createTestUser({ email: 'habits-test@my.yorku.ca' });
    testUser2 = await createTestUser({ email: 'habits-test2@my.yorku.ca' });
  });

  afterAll(() => {
    clearTestDatabase();
  });

  describe('add', () => {
    it('should add a habit successfully with all parameters', () => {
      const habitId = 'habit-1';
      const result = Habits.add(
        habitId,
        testUser.id,
        'Morning Meditation',
        'Meditate for 10 minutes every morning',
        'daily',
        'in_progress',
        new Date().toISOString(),
        0,
        null
      );

      expect(result.success).toBe(true);

      // Verify habit was added
      const verification = Habits.getById(habitId);
      expect(verification.success).toBe(true);
      expect(verification.habit.name).toBe('Morning Meditation');
      expect(verification.habit.description).toBe('Meditate for 10 minutes every morning');
      expect(verification.habit.reminderFrequency).toBe('daily');
      expect(verification.habit.status).toBe('in_progress');
      expect(verification.habit.streak).toBe(0);
    });

    it('should add a habit with done status', () => {
      const habitId = 'habit-done';
      const result = Habits.add(
        habitId,
        testUser.id,
        'Completed Habit',
        'This is done',
        'weekly',
        'done',
        new Date().toISOString(),
        5,
        '2024-01-15'
      );

      expect(result.success).toBe(true);

      const verification = Habits.getById(habitId);
      expect(verification.success).toBe(true);
      expect(verification.habit.status).toBe('done');
      expect(verification.habit.streak).toBe(5);
      expect(verification.habit.lastCompletedDate).toBe('2024-01-15');
    });

    it('should add a habit with null description', () => {
      const habitId = 'habit-no-desc';
      const result = Habits.add(
        habitId,
        testUser.id,
        'Simple Habit',
        null,
        'daily',
        'in_progress',
        new Date().toISOString(),
        0,
        null
      );

      expect(result.success).toBe(true);

      const verification = Habits.getById(habitId);
      expect(verification.success).toBe(true);
      expect(verification.habit.description).toBeNull();
    });

    it('should fail when adding a habit with duplicate id', () => {
      const habitId = 'habit-duplicate';
      Habits.add(
        habitId,
        testUser.id,
        'First Habit',
        'Description',
        'daily',
        'in_progress',
        new Date().toISOString(),
        0,
        null
      );

      const result = Habits.add(
        habitId,
        testUser.id,
        'Second Habit',
        'Another Description',
        'weekly',
        'in_progress',
        new Date().toISOString(),
        0,
        null
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail when userId references non-existent user (foreign key constraint)', () => {
      const result = Habits.add(
        'habit-invalid-user',
        'non-existent-user-id',
        'Orphan Habit',
        'Description',
        'daily',
        'in_progress',
        new Date().toISOString(),
        0,
        null
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail when status has invalid value', () => {
      const result = Habits.add(
        'habit-invalid-status',
        testUser.id,
        'Invalid Status Habit',
        'Description',
        'daily',
        'invalid_status',
        new Date().toISOString(),
        0,
        null
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getUserHabits', () => {
    beforeEach(async () => {
      // Add multiple habits for testing
      Habits.add('habit-user1-1', testUser.id, 'Habit 1', 'Desc 1', 'daily', 'in_progress', '2024-01-01T10:00:00.000Z', 0, null);
      Habits.add('habit-user1-2', testUser.id, 'Habit 2', 'Desc 2', 'weekly', 'in_progress', '2024-01-02T10:00:00.000Z', 3, null);
      Habits.add('habit-user1-3', testUser.id, 'Habit 3', 'Desc 3', 'daily', 'done', '2024-01-03T10:00:00.000Z', 10, '2024-01-15');
      Habits.add('habit-user2-1', testUser2.id, 'Other User Habit', 'Other Desc', 'daily', 'in_progress', '2024-01-04T10:00:00.000Z', 0, null);
    });

    it('should return only in-progress habits by default (excludeCompleted)', () => {
      const result = Habits.getUserHabits(testUser.id);

      expect(result.success).toBe(true);
      expect(result.habits.length).toBe(2);
      expect(result.habits.every(h => h.status !== 'done')).toBe(true);
    });

    it('should return all habits including completed when includeCompleted is true', () => {
      const result = Habits.getUserHabits(testUser.id, true);

      expect(result.success).toBe(true);
      expect(result.habits.length).toBe(3);
      expect(result.habits.some(h => h.status === 'done')).toBe(true);
    });

    it('should return habits ordered by createdAt DESC', () => {
      const result = Habits.getUserHabits(testUser.id, true);

      expect(result.success).toBe(true);
      // Most recent first
      expect(result.habits[0].name).toBe('Habit 3');
      expect(result.habits[1].name).toBe('Habit 2');
      expect(result.habits[2].name).toBe('Habit 1');
    });

    it('should not return habits from other users', () => {
      const result = Habits.getUserHabits(testUser.id, true);

      expect(result.success).toBe(true);
      expect(result.habits.every(h => h.userId === testUser.id)).toBe(true);
      expect(result.habits.some(h => h.name === 'Other User Habit')).toBe(false);
    });

    it('should return empty array for user with no habits', async () => {
      const newUser = await createTestUser({ email: 'nohabits@my.yorku.ca' });
      const result = Habits.getUserHabits(newUser.id);

      expect(result.success).toBe(true);
      expect(result.habits).toEqual([]);
    });

    it('should return empty array for non-existent user', () => {
      const result = Habits.getUserHabits('non-existent-user');

      expect(result.success).toBe(true);
      expect(result.habits).toEqual([]);
    });
  });

  describe('getById', () => {
    beforeEach(() => {
      Habits.add('habit-get-test', testUser.id, 'Get Test Habit', 'Test Description', 'daily', 'in_progress', new Date().toISOString(), 5, '2024-01-10');
    });

    it('should return habit when it exists', () => {
      const result = Habits.getById('habit-get-test');

      expect(result.success).toBe(true);
      expect(result.habit).toBeDefined();
      expect(result.habit.id).toBe('habit-get-test');
      expect(result.habit.name).toBe('Get Test Habit');
      expect(result.habit.description).toBe('Test Description');
      expect(result.habit.reminderFrequency).toBe('daily');
      expect(result.habit.status).toBe('in_progress');
      expect(result.habit.streak).toBe(5);
      expect(result.habit.lastCompletedDate).toBe('2024-01-10');
    });

    it('should return error when habit does not exist', () => {
      const result = Habits.getById('non-existent-habit');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Habit not found');
    });

    it('should return error for empty id', () => {
      const result = Habits.getById('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Habit not found');
    });

    it('should return error for null id', () => {
      const result = Habits.getById(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Habit not found');
    });

    it('should return error for undefined id', () => {
      const result = Habits.getById(undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Habit not found');
    });
  });

  describe('update', () => {
    beforeEach(() => {
      Habits.add('habit-update-test', testUser.id, 'Original Name', 'Original Description', 'daily', 'in_progress', new Date().toISOString(), 0, null);
    });

    it('should update all habit fields successfully', () => {
      const result = Habits.update(
        'habit-update-test',
        testUser.id,
        'Updated Name',
        'Updated Description',
        'weekly',
        'done',
        10,
        '2024-01-20'
      );

      expect(result.success).toBe(true);
      expect(result.changes).toBe(1);

      const verification = Habits.getById('habit-update-test');
      expect(verification.habit.name).toBe('Updated Name');
      expect(verification.habit.description).toBe('Updated Description');
      expect(verification.habit.reminderFrequency).toBe('weekly');
      expect(verification.habit.status).toBe('done');
      expect(verification.habit.streak).toBe(10);
      expect(verification.habit.lastCompletedDate).toBe('2024-01-20');
    });

    it('should update only specific fields while preserving others structure', () => {
      const result = Habits.update(
        'habit-update-test',
        testUser.id,
        'Only Name Changed',
        'Original Description',
        'daily',
        'in_progress',
        0,
        null
      );

      expect(result.success).toBe(true);
      expect(result.changes).toBe(1);

      const verification = Habits.getById('habit-update-test');
      expect(verification.habit.name).toBe('Only Name Changed');
    });

    it('should return changes=0 when habit id does not exist', () => {
      const result = Habits.update(
        'non-existent-habit',
        testUser.id,
        'Name',
        'Desc',
        'daily',
        'in_progress',
        0,
        null
      );

      expect(result.success).toBe(true);
      expect(result.changes).toBe(0);
    });

    it('should return changes=0 when userId does not match', () => {
      const result = Habits.update(
        'habit-update-test',
        testUser2.id, // Different user
        'Should Not Update',
        'Desc',
        'daily',
        'in_progress',
        0,
        null
      );

      expect(result.success).toBe(true);
      expect(result.changes).toBe(0);

      // Verify original data unchanged
      const verification = Habits.getById('habit-update-test');
      expect(verification.habit.name).toBe('Original Name');
    });

    it('should fail when updating to invalid status', () => {
      const result = Habits.update(
        'habit-update-test',
        testUser.id,
        'Name',
        'Desc',
        'daily',
        'invalid_status',
        0,
        null
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should allow updating description to null', () => {
      const result = Habits.update(
        'habit-update-test',
        testUser.id,
        'Name',
        null,
        'daily',
        'in_progress',
        0,
        null
      );

      expect(result.success).toBe(true);

      const verification = Habits.getById('habit-update-test');
      expect(verification.habit.description).toBeNull();
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      Habits.add('habit-delete-test', testUser.id, 'To Be Deleted', 'Description', 'daily', 'in_progress', new Date().toISOString(), 0, null);
      Habits.add('habit-keep', testUser.id, 'Keep This', 'Description', 'daily', 'in_progress', new Date().toISOString(), 0, null);
    });

    it('should delete habit successfully', () => {
      const result = Habits.delete('habit-delete-test', testUser.id);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(1);

      // Verify habit no longer exists
      const verification = Habits.getById('habit-delete-test');
      expect(verification.success).toBe(false);
      expect(verification.error).toBe('Habit not found');
    });

    it('should not delete other habits', () => {
      Habits.delete('habit-delete-test', testUser.id);

      const verification = Habits.getById('habit-keep');
      expect(verification.success).toBe(true);
    });

    it('should return changes=0 when habit does not exist', () => {
      const result = Habits.delete('non-existent-habit', testUser.id);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(0);
    });

    it('should return changes=0 when userId does not match', () => {
      const result = Habits.delete('habit-delete-test', testUser2.id);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(0);

      // Verify habit still exists
      const verification = Habits.getById('habit-delete-test');
      expect(verification.success).toBe(true);
    });

    it('should cascade delete associated completions', () => {
      // Add completions for the habit
      Habits.addCompletion('comp-1', 'habit-delete-test', testUser.id, '2024-01-10');
      Habits.addCompletion('comp-2', 'habit-delete-test', testUser.id, '2024-01-11');

      // Verify completions exist
      let completions = Habits.getCompletions('habit-delete-test');
      expect(completions.completions.length).toBe(2);

      // Delete habit
      Habits.delete('habit-delete-test', testUser.id);

      // Verify completions are also deleted (cascade)
      completions = Habits.getCompletions('habit-delete-test');
      expect(completions.completions.length).toBe(0);
    });
  });

  describe('addCompletion', () => {
    beforeEach(() => {
      Habits.add('habit-comp-test', testUser.id, 'Completable Habit', 'Description', 'daily', 'in_progress', new Date().toISOString(), 0, null);
    });

    it('should add completion successfully', () => {
      const result = Habits.addCompletion('completion-1', 'habit-comp-test', testUser.id, '2024-01-15');

      expect(result.success).toBe(true);

      const verification = Habits.getCompletionByDate('habit-comp-test', '2024-01-15');
      expect(verification.success).toBe(true);
      expect(verification.completion.habitId).toBe('habit-comp-test');
      expect(verification.completion.completedDate).toBe('2024-01-15');
    });

    it('should add multiple completions for same habit on different dates', () => {
      Habits.addCompletion('comp-1', 'habit-comp-test', testUser.id, '2024-01-15');
      Habits.addCompletion('comp-2', 'habit-comp-test', testUser.id, '2024-01-16');
      Habits.addCompletion('comp-3', 'habit-comp-test', testUser.id, '2024-01-17');

      const completions = Habits.getCompletions('habit-comp-test');
      expect(completions.completions.length).toBe(3);
    });

    it('should fail when adding duplicate completion for same habit and date', () => {
      Habits.addCompletion('comp-1', 'habit-comp-test', testUser.id, '2024-01-15');

      const result = Habits.addCompletion('comp-2', 'habit-comp-test', testUser.id, '2024-01-15');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail when adding completion with duplicate id', () => {
      Habits.addCompletion('same-id', 'habit-comp-test', testUser.id, '2024-01-15');

      const result = Habits.addCompletion('same-id', 'habit-comp-test', testUser.id, '2024-01-16');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail when habitId references non-existent habit (foreign key)', () => {
      const result = Habits.addCompletion('comp-orphan', 'non-existent-habit', testUser.id, '2024-01-15');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail when userId references non-existent user (foreign key)', () => {
      const result = Habits.addCompletion('comp-invalid-user', 'habit-comp-test', 'non-existent-user', '2024-01-15');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getCompletions', () => {
    beforeEach(() => {
      Habits.add('habit-completions-test', testUser.id, 'Multi Completions', 'Description', 'daily', 'in_progress', new Date().toISOString(), 0, null);
      Habits.addCompletion('comp-a', 'habit-completions-test', testUser.id, '2024-01-10');
      Habits.addCompletion('comp-b', 'habit-completions-test', testUser.id, '2024-01-12');
      Habits.addCompletion('comp-c', 'habit-completions-test', testUser.id, '2024-01-11');
    });

    it('should return all completions for a habit', () => {
      const result = Habits.getCompletions('habit-completions-test');

      expect(result.success).toBe(true);
      expect(result.completions.length).toBe(3);
    });

    it('should return completions ordered by completedDate DESC', () => {
      const result = Habits.getCompletions('habit-completions-test');

      expect(result.success).toBe(true);
      expect(result.completions[0].completedDate).toBe('2024-01-12');
      expect(result.completions[1].completedDate).toBe('2024-01-11');
      expect(result.completions[2].completedDate).toBe('2024-01-10');
    });

    it('should return empty array for habit with no completions', () => {
      Habits.add('habit-no-completions', testUser.id, 'No Completions', 'Desc', 'daily', 'in_progress', new Date().toISOString(), 0, null);

      const result = Habits.getCompletions('habit-no-completions');

      expect(result.success).toBe(true);
      expect(result.completions).toEqual([]);
    });

    it('should return empty array for non-existent habit', () => {
      const result = Habits.getCompletions('non-existent-habit');

      expect(result.success).toBe(true);
      expect(result.completions).toEqual([]);
    });

    it('should include all completion fields in results', () => {
      const result = Habits.getCompletions('habit-completions-test');

      expect(result.success).toBe(true);
      const completion = result.completions[0];
      expect(completion).toHaveProperty('id');
      expect(completion).toHaveProperty('habitId');
      expect(completion).toHaveProperty('userId');
      expect(completion).toHaveProperty('completedDate');
    });
  });

  describe('getCompletionByDate', () => {
    beforeEach(() => {
      Habits.add('habit-by-date-test', testUser.id, 'Date Test', 'Description', 'daily', 'in_progress', new Date().toISOString(), 0, null);
      Habits.addCompletion('comp-date-1', 'habit-by-date-test', testUser.id, '2024-01-15');
    });

    it('should return completion when it exists', () => {
      const result = Habits.getCompletionByDate('habit-by-date-test', '2024-01-15');

      expect(result.success).toBe(true);
      expect(result.completion).toBeDefined();
      expect(result.completion.habitId).toBe('habit-by-date-test');
      expect(result.completion.completedDate).toBe('2024-01-15');
      expect(result.completion.userId).toBe(testUser.id);
    });

    it('should return error when completion does not exist for given date', () => {
      const result = Habits.getCompletionByDate('habit-by-date-test', '2024-01-16');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Completion not found');
    });

    it('should return error when habit does not exist', () => {
      const result = Habits.getCompletionByDate('non-existent-habit', '2024-01-15');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Completion not found');
    });

    it('should return error for empty habitId', () => {
      const result = Habits.getCompletionByDate('', '2024-01-15');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Completion not found');
    });

    it('should return error for empty date', () => {
      const result = Habits.getCompletionByDate('habit-by-date-test', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Completion not found');
    });

    it('should return error for null parameters', () => {
      const result = Habits.getCompletionByDate(null, null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Completion not found');
    });

    it('should distinguish between different date formats', () => {
      // Add another completion with different date format
      Habits.addCompletion('comp-date-2', 'habit-by-date-test', testUser.id, '2024-1-16');

      const result1 = Habits.getCompletionByDate('habit-by-date-test', '2024-01-15');
      const result2 = Habits.getCompletionByDate('habit-by-date-test', '2024-1-16');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('deleteCompletion', () => {
    beforeEach(() => {
      Habits.add('habit-del-comp-test', testUser.id, 'Delete Completion Test', 'Description', 'daily', 'in_progress', new Date().toISOString(), 0, null);
      Habits.addCompletion('comp-del-1', 'habit-del-comp-test', testUser.id, '2024-01-15');
      Habits.addCompletion('comp-del-2', 'habit-del-comp-test', testUser.id, '2024-01-16');
    });

    it('should delete completion successfully', () => {
      const result = Habits.deleteCompletion('habit-del-comp-test', '2024-01-15');

      expect(result.success).toBe(true);
      expect(result.changes).toBe(1);

      // Verify completion no longer exists
      const verification = Habits.getCompletionByDate('habit-del-comp-test', '2024-01-15');
      expect(verification.success).toBe(false);
    });

    it('should not delete other completions', () => {
      Habits.deleteCompletion('habit-del-comp-test', '2024-01-15');

      const verification = Habits.getCompletionByDate('habit-del-comp-test', '2024-01-16');
      expect(verification.success).toBe(true);
    });

    it('should return changes=0 when completion does not exist', () => {
      const result = Habits.deleteCompletion('habit-del-comp-test', '2024-01-20');

      expect(result.success).toBe(true);
      expect(result.changes).toBe(0);
    });

    it('should return changes=0 when habitId does not exist', () => {
      const result = Habits.deleteCompletion('non-existent-habit', '2024-01-15');

      expect(result.success).toBe(true);
      expect(result.changes).toBe(0);
    });

    it('should delete only the completion for specific date', () => {
      Habits.deleteCompletion('habit-del-comp-test', '2024-01-15');

      const completions = Habits.getCompletions('habit-del-comp-test');
      expect(completions.completions.length).toBe(1);
      expect(completions.completions[0].completedDate).toBe('2024-01-16');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle special characters in habit name', () => {
      const result = Habits.add(
        'habit-special-chars',
        testUser.id,
        'Habit with "quotes" & <special> chars!',
        'Description with\nnewlines\tand\ttabs',
        'daily',
        'in_progress',
        new Date().toISOString(),
        0,
        null
      );

      expect(result.success).toBe(true);

      const verification = Habits.getById('habit-special-chars');
      expect(verification.habit.name).toBe('Habit with "quotes" & <special> chars!');
    });

    it('should handle very long habit names', () => {
      const longName = 'A'.repeat(1000);
      const result = Habits.add(
        'habit-long-name',
        testUser.id,
        longName,
        'Description',
        'daily',
        'in_progress',
        new Date().toISOString(),
        0,
        null
      );

      expect(result.success).toBe(true);

      const verification = Habits.getById('habit-long-name');
      expect(verification.habit.name).toBe(longName);
    });

    it('should handle unicode characters in description', () => {
      const unicodeDesc = 'Description with emojis: \ud83d\ude00\ud83c\udf89 and unicode: \u4e2d\u6587 \ud83c\uddec\ud83c\udde7';
      const result = Habits.add(
        'habit-unicode',
        testUser.id,
        'Unicode Test',
        unicodeDesc,
        'daily',
        'in_progress',
        new Date().toISOString(),
        0,
        null
      );

      expect(result.success).toBe(true);

      const verification = Habits.getById('habit-unicode');
      expect(verification.habit.description).toBe(unicodeDesc);
    });

    it('should handle large streak values', () => {
      const result = Habits.add(
        'habit-large-streak',
        testUser.id,
        'Streak Master',
        'Description',
        'daily',
        'in_progress',
        new Date().toISOString(),
        999999,
        '2024-01-15'
      );

      expect(result.success).toBe(true);

      const verification = Habits.getById('habit-large-streak');
      expect(verification.habit.streak).toBe(999999);
    });

    it('should handle ISO date strings with milliseconds', () => {
      const isoDate = '2024-01-15T14:30:45.123Z';
      const result = Habits.add(
        'habit-iso-date',
        testUser.id,
        'ISO Date Test',
        'Description',
        'daily',
        'in_progress',
        isoDate,
        0,
        null
      );

      expect(result.success).toBe(true);

      const verification = Habits.getById('habit-iso-date');
      expect(verification.habit.createdAt).toBe(isoDate);
    });

    it('should handle different reminderFrequency values', () => {
      const frequencies = ['daily', 'weekly', 'monthly', 'custom', 'never'];

      frequencies.forEach((freq, index) => {
        const result = Habits.add(
          `habit-freq-${index}`,
          testUser.id,
          `Frequency ${freq}`,
          'Description',
          freq,
          'in_progress',
          new Date().toISOString(),
          0,
          null
        );

        expect(result.success).toBe(true);

        const verification = Habits.getById(`habit-freq-${index}`);
        expect(verification.habit.reminderFrequency).toBe(freq);
      });
    });

    it('should maintain data integrity across multiple operations', () => {
      // Add habit
      Habits.add('habit-integrity', testUser.id, 'Integrity Test', 'Desc', 'daily', 'in_progress', '2024-01-01T00:00:00.000Z', 0, null);

      // Add completions
      Habits.addCompletion('ic-1', 'habit-integrity', testUser.id, '2024-01-02');
      Habits.addCompletion('ic-2', 'habit-integrity', testUser.id, '2024-01-03');

      // Update habit
      Habits.update('habit-integrity', testUser.id, 'Updated Integrity', 'Updated Desc', 'weekly', 'in_progress', 2, '2024-01-03');

      // Delete one completion
      Habits.deleteCompletion('habit-integrity', '2024-01-02');

      // Verify final state
      const habit = Habits.getById('habit-integrity');
      expect(habit.habit.name).toBe('Updated Integrity');
      expect(habit.habit.streak).toBe(2);

      const completions = Habits.getCompletions('habit-integrity');
      expect(completions.completions.length).toBe(1);
      expect(completions.completions[0].completedDate).toBe('2024-01-03');
    });

    it('should handle zero streak value', () => {
      const result = Habits.add(
        'habit-zero-streak',
        testUser.id,
        'Zero Streak',
        'Description',
        'daily',
        'in_progress',
        new Date().toISOString(),
        0,
        null
      );

      expect(result.success).toBe(true);

      const verification = Habits.getById('habit-zero-streak');
      expect(verification.habit.streak).toBe(0);
    });

    it('should handle negative streak values (edge case)', () => {
      // SQLite doesn't have constraints on negative integers
      const result = Habits.add(
        'habit-negative-streak',
        testUser.id,
        'Negative Streak',
        'Description',
        'daily',
        'in_progress',
        new Date().toISOString(),
        -5,
        null
      );

      expect(result.success).toBe(true);

      const verification = Habits.getById('habit-negative-streak');
      expect(verification.habit.streak).toBe(-5);
    });

    it('should handle empty string for name', () => {
      const result = Habits.add(
        'habit-empty-name',
        testUser.id,
        '',
        'Description',
        'daily',
        'in_progress',
        new Date().toISOString(),
        0,
        null
      );

      // This might succeed or fail depending on business rules
      // The current implementation allows it
      expect(result.success).toBe(true);
    });

    it('should handle empty string for reminderFrequency', () => {
      const result = Habits.add(
        'habit-empty-freq',
        testUser.id,
        'Test',
        'Description',
        '',
        'in_progress',
        new Date().toISOString(),
        0,
        null
      );

      expect(result.success).toBe(true);

      const verification = Habits.getById('habit-empty-freq');
      expect(verification.habit.reminderFrequency).toBe('');
    });
  });
});
