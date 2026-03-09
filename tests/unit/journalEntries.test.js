// Import testDatabase first to set up test environment
const { clearTestDatabase, createTestUser, getTestDatabase } = require('../setup/testDatabase');

// Now import JournalEntries which will use the same test db instance
const JournalEntries = require('../../utils/db/JournalEntries');

describe('JournalEntries Module - Unit Tests', () => {
  let testUser;
  let db;

  beforeAll(() => {
    db = getTestDatabase();
  });

  beforeEach(async () => {
    clearTestDatabase();
    testUser = await createTestUser({
      email: `journal_${Date.now()}@my.yorku.ca`,
      password: 'Test123!@#'
    });
  });

  describe('add', () => {
    it('should add a new journal entry successfully', () => {
      const entryId = 'entry_123';
      const title = 'My First Entry';
      const content = 'This is the content of my first journal entry.';
      const createdAt = new Date().toISOString();

      const result = JournalEntries.add(entryId, testUser.id, title, content, createdAt);

      expect(result.success).toBe(true);
    });

    it('should store the journal entry in the database', () => {
      const entryId = 'entry_456';
      const title = 'Test Entry';
      const content = 'Test content';
      const createdAt = new Date().toISOString();

      JournalEntries.add(entryId, testUser.id, title, content, createdAt);

      const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(entryId);
      expect(entry).toBeDefined();
      expect(entry.id).toBe(entryId);
      expect(entry.userId).toBe(testUser.id);
      expect(entry.title).toBe(title);
      expect(entry.content).toBe(content);
      expect(entry.createdAt).toBe(createdAt);
    });

    it('should fail when adding duplicate entry id', () => {
      const entryId = 'duplicate_entry';
      const createdAt = new Date().toISOString();

      JournalEntries.add(entryId, testUser.id, 'First Entry', 'Content 1', createdAt);
      const result = JournalEntries.add(entryId, testUser.id, 'Second Entry', 'Content 2', createdAt);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail when userId does not exist (foreign key constraint)', () => {
      const result = JournalEntries.add(
        'entry_nonexistent_user',
        'nonexistent_user_id',
        'Title',
        'Content',
        new Date().toISOString()
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty title and content', () => {
      const entryId = 'empty_entry';
      const createdAt = new Date().toISOString();

      const result = JournalEntries.add(entryId, testUser.id, '', '', createdAt);

      expect(result.success).toBe(true);

      const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(entryId);
      expect(entry.title).toBe('');
      expect(entry.content).toBe('');
    });

    it('should handle special characters in title and content', () => {
      const entryId = 'special_chars';
      const title = "Entry with 'quotes' and \"double quotes\"";
      const content = "Content with <html> tags & special chars: @#$%^&*()";
      const createdAt = new Date().toISOString();

      const result = JournalEntries.add(entryId, testUser.id, title, content, createdAt);

      expect(result.success).toBe(true);

      const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(entryId);
      expect(entry.title).toBe(title);
      expect(entry.content).toBe(content);
    });
  });

  describe('getUserEntries', () => {
    it('should return empty array when user has no entries', () => {
      const result = JournalEntries.getUserEntries(testUser.id);

      expect(result.success).toBe(true);
      expect(result.entries).toEqual([]);
    });

    it('should return all entries for a user', () => {
      const createdAt = new Date().toISOString();
      JournalEntries.add('entry_1', testUser.id, 'Entry 1', 'Content 1', createdAt);
      JournalEntries.add('entry_2', testUser.id, 'Entry 2', 'Content 2', createdAt);
      JournalEntries.add('entry_3', testUser.id, 'Entry 3', 'Content 3', createdAt);

      const result = JournalEntries.getUserEntries(testUser.id);

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(3);
    });

    it('should return entries ordered by createdAt descending', () => {
      JournalEntries.add('entry_old', testUser.id, 'Old Entry', 'Content', '2024-01-01T00:00:00Z');
      JournalEntries.add('entry_middle', testUser.id, 'Middle Entry', 'Content', '2024-06-01T00:00:00Z');
      JournalEntries.add('entry_new', testUser.id, 'New Entry', 'Content', '2024-12-01T00:00:00Z');

      const result = JournalEntries.getUserEntries(testUser.id);

      expect(result.success).toBe(true);
      expect(result.entries[0].id).toBe('entry_new');
      expect(result.entries[1].id).toBe('entry_middle');
      expect(result.entries[2].id).toBe('entry_old');
    });

    it('should respect the limit parameter', () => {
      const createdAt = new Date().toISOString();
      for (let i = 0; i < 10; i++) {
        JournalEntries.add(`entry_${i}`, testUser.id, `Entry ${i}`, `Content ${i}`, createdAt);
      }

      const result = JournalEntries.getUserEntries(testUser.id, 5);

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(5);
    });

    it('should use default limit of 100', () => {
      const createdAt = new Date().toISOString();
      for (let i = 0; i < 5; i++) {
        JournalEntries.add(`entry_${i}`, testUser.id, `Entry ${i}`, `Content ${i}`, createdAt);
      }

      const result = JournalEntries.getUserEntries(testUser.id);

      expect(result.success).toBe(true);
      expect(result.entries.length).toBeLessThanOrEqual(100);
    });

    it('should not return entries from other users', async () => {
      const otherUser = await createTestUser({
        email: `other_${Date.now()}@my.yorku.ca`,
        password: 'Test123!@#'
      });

      const createdAt = new Date().toISOString();
      const result1 = JournalEntries.add('entry_user1', testUser.id, 'User 1 Entry', 'Content', createdAt);
      const result2 = JournalEntries.add('entry_user2', otherUser.id, 'User 2 Entry', 'Content', createdAt);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const result = JournalEntries.getUserEntries(testUser.id);

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].id).toBe('entry_user1');
    });

    it('should return empty array for non-existent user', () => {
      const result = JournalEntries.getUserEntries('nonexistent_user');

      expect(result.success).toBe(true);
      expect(result.entries).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return entry when it exists', () => {
      const entryId = 'entry_to_find';
      const title = 'Findable Entry';
      const content = 'This entry should be found';
      const createdAt = new Date().toISOString();

      JournalEntries.add(entryId, testUser.id, title, content, createdAt);

      const result = JournalEntries.getById(entryId);

      expect(result.success).toBe(true);
      expect(result.entry).toBeDefined();
      expect(result.entry.id).toBe(entryId);
      expect(result.entry.title).toBe(title);
      expect(result.entry.content).toBe(content);
    });

    it('should return error when entry does not exist', () => {
      const result = JournalEntries.getById('nonexistent_entry');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Entry not found');
    });

    it('should return complete entry data', () => {
      const entryId = 'complete_entry';
      const title = 'Complete Entry';
      const content = 'Complete content';
      const createdAt = '2024-06-15T12:00:00Z';

      JournalEntries.add(entryId, testUser.id, title, content, createdAt);

      const result = JournalEntries.getById(entryId);

      expect(result.success).toBe(true);
      expect(result.entry.id).toBe(entryId);
      expect(result.entry.userId).toBe(testUser.id);
      expect(result.entry.title).toBe(title);
      expect(result.entry.content).toBe(content);
      expect(result.entry.createdAt).toBe(createdAt);
    });
  });

  describe('update', () => {
    it('should update entry title and content', () => {
      const entryId = 'entry_to_update';
      const createdAt = new Date().toISOString();

      JournalEntries.add(entryId, testUser.id, 'Original Title', 'Original Content', createdAt);

      const result = JournalEntries.update(entryId, testUser.id, 'Updated Title', 'Updated Content');

      expect(result.success).toBe(true);
      expect(result.changes).toBe(1);

      const updatedEntry = JournalEntries.getById(entryId);
      expect(updatedEntry.entry.title).toBe('Updated Title');
      expect(updatedEntry.entry.content).toBe('Updated Content');
    });

    it('should return 0 changes when entry does not exist', () => {
      const result = JournalEntries.update('nonexistent_entry', testUser.id, 'Title', 'Content');

      expect(result.success).toBe(true);
      expect(result.changes).toBe(0);
    });

    it('should not update entry belonging to different user', async () => {
      const otherUser = await createTestUser({
        email: `other2_${Date.now()}@my.yorku.ca`,
        password: 'Test123!@#'
      });

      const entryId = `entry_other_user_${Date.now()}`;
      const createdAt = new Date().toISOString();

      const addResult = JournalEntries.add(entryId, testUser.id, 'Original Title', 'Original Content', createdAt);
      expect(addResult.success).toBe(true);

      const result = JournalEntries.update(entryId, otherUser.id, 'Hacked Title', 'Hacked Content');

      expect(result.success).toBe(true);
      expect(result.changes).toBe(0);

      const entry = JournalEntries.getById(entryId);
      expect(entry.success).toBe(true);
      expect(entry.entry.title).toBe('Original Title');
      expect(entry.entry.content).toBe('Original Content');
    });

    it('should handle empty title and content updates', () => {
      const entryId = 'entry_empty_update';
      const createdAt = new Date().toISOString();

      JournalEntries.add(entryId, testUser.id, 'Original Title', 'Original Content', createdAt);

      const result = JournalEntries.update(entryId, testUser.id, '', '');

      expect(result.success).toBe(true);
      expect(result.changes).toBe(1);

      const entry = JournalEntries.getById(entryId);
      expect(entry.entry.title).toBe('');
      expect(entry.entry.content).toBe('');
    });

    it('should preserve createdAt timestamp after update', () => {
      const entryId = 'entry_preserve_date';
      const originalCreatedAt = '2024-01-01T00:00:00Z';

      JournalEntries.add(entryId, testUser.id, 'Original Title', 'Original Content', originalCreatedAt);

      JournalEntries.update(entryId, testUser.id, 'Updated Title', 'Updated Content');

      const entry = JournalEntries.getById(entryId);
      expect(entry.entry.createdAt).toBe(originalCreatedAt);
    });
  });

  describe('delete', () => {
    it('should delete an existing entry', () => {
      const entryId = 'entry_to_delete';
      const createdAt = new Date().toISOString();

      JournalEntries.add(entryId, testUser.id, 'To Be Deleted', 'Content', createdAt);

      const result = JournalEntries.delete(entryId, testUser.id);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(1);

      const getResult = JournalEntries.getById(entryId);
      expect(getResult.success).toBe(false);
      expect(getResult.error).toBe('Entry not found');
    });

    it('should return 0 changes when entry does not exist', () => {
      const result = JournalEntries.delete('nonexistent_entry', testUser.id);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(0);
    });

    it('should not delete entry belonging to different user', async () => {
      const otherUser = await createTestUser({
        email: `other3_${Date.now()}@my.yorku.ca`,
        password: 'Test123!@#'
      });

      const entryId = `entry_protected_${Date.now()}`;
      const createdAt = new Date().toISOString();

      const addResult = JournalEntries.add(entryId, testUser.id, 'Protected Entry', 'Content', createdAt);
      expect(addResult.success).toBe(true);

      const result = JournalEntries.delete(entryId, otherUser.id);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(0);

      const entry = JournalEntries.getById(entryId);
      expect(entry.success).toBe(true);
      expect(entry.entry.title).toBe('Protected Entry');
    });

    it('should only delete the specified entry', () => {
      const createdAt = new Date().toISOString();

      JournalEntries.add('entry_keep_1', testUser.id, 'Keep 1', 'Content', createdAt);
      JournalEntries.add('entry_delete', testUser.id, 'Delete Me', 'Content', createdAt);
      JournalEntries.add('entry_keep_2', testUser.id, 'Keep 2', 'Content', createdAt);

      JournalEntries.delete('entry_delete', testUser.id);

      const entries = JournalEntries.getUserEntries(testUser.id);
      expect(entries.entries).toHaveLength(2);
      expect(entries.entries.map(e => e.id)).not.toContain('entry_delete');
    });
  });
});
