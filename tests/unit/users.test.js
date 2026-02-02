const { clearTestDatabase, createTestUser, getTestDatabase } = require('../setup/testDatabase');

// Clear require cache and require Users module with test database
delete require.cache[require.resolve('../../utils/db/Users')];
const Users = require('../../utils/db/Users');

describe('Users Module - Unit Tests', () => {
  beforeEach(() => {
    clearTestDatabase();
  });

  describe('add', () => {
    it('should successfully add a new user', () => {
      const result = Users.add(
        'test-id-123',
        'newuser@my.yorku.ca',
        'hashedPassword123',
        'student',
        new Date().toISOString()
      );

      expect(result.success).toBe(true);
    });

    it('should add user with admin role', () => {
      const result = Users.add(
        'admin-id-456',
        'admin@my.yorku.ca',
        'hashedPassword456',
        'admin',
        new Date().toISOString()
      );

      expect(result.success).toBe(true);

      // Verify the user was added with correct role
      const fetchedUser = Users.findById('admin-id-456');
      expect(fetchedUser.success).toBe(true);
      expect(fetchedUser.user.role).toBe('admin');
    });

    it('should fail when adding user with duplicate email', async () => {
      // First user
      Users.add(
        'user-1',
        'duplicate@my.yorku.ca',
        'password1',
        'student',
        new Date().toISOString()
      );

      // Try to add another user with the same email
      const result = Users.add(
        'user-2',
        'duplicate@my.yorku.ca',
        'password2',
        'student',
        new Date().toISOString()
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail when adding user with duplicate id', () => {
      // First user
      Users.add(
        'duplicate-id',
        'user1@my.yorku.ca',
        'password1',
        'student',
        new Date().toISOString()
      );

      // Try to add another user with the same id
      const result = Users.add(
        'duplicate-id',
        'user2@my.yorku.ca',
        'password2',
        'student',
        new Date().toISOString()
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should store all user fields correctly', () => {
      const testData = {
        id: 'field-test-id',
        email: 'fieldtest@my.yorku.ca',
        password: 'testPassword!@#',
        role: 'student',
        createdAt: '2024-01-15T10:30:00.000Z'
      };

      Users.add(
        testData.id,
        testData.email,
        testData.password,
        testData.role,
        testData.createdAt
      );

      const result = Users.findById(testData.id);
      expect(result.success).toBe(true);
      expect(result.user.id).toBe(testData.id);
      expect(result.user.email).toBe(testData.email);
      expect(result.user.password).toBe(testData.password);
      expect(result.user.role).toBe(testData.role);
      expect(result.user.createdAt).toBe(testData.createdAt);
    });
  });

  describe('getByEmail', () => {
    beforeEach(async () => {
      // Add test users
      Users.add('email-test-1', 'findme@my.yorku.ca', 'password', 'student', new Date().toISOString());
      Users.add('email-test-2', 'Another@my.yorku.ca', 'password', 'admin', new Date().toISOString());
    });

    it('should find user by exact email', () => {
      const result = Users.getByEmail('findme@my.yorku.ca');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('findme@my.yorku.ca');
      expect(result.user.id).toBe('email-test-1');
    });

    it('should find user by email case-insensitively (uppercase query)', () => {
      const result = Users.getByEmail('FINDME@MY.YORKU.CA');

      expect(result.success).toBe(true);
      expect(result.user.email).toBe('findme@my.yorku.ca');
    });

    it('should find user by email case-insensitively (mixed case query)', () => {
      const result = Users.getByEmail('FindMe@My.YorkU.Ca');

      expect(result.success).toBe(true);
      expect(result.user.email).toBe('findme@my.yorku.ca');
    });

    it('should find user with uppercase email using lowercase query', () => {
      const result = Users.getByEmail('another@my.yorku.ca');

      expect(result.success).toBe(true);
      expect(result.user.email).toBe('Another@my.yorku.ca');
    });

    it('should return error when user not found', () => {
      const result = Users.getByEmail('nonexistent@my.yorku.ca');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should return all user fields when found', () => {
      const result = Users.getByEmail('findme@my.yorku.ca');

      expect(result.success).toBe(true);
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('password');
      expect(result.user).toHaveProperty('role');
      expect(result.user).toHaveProperty('createdAt');
    });
  });

  describe('findById', () => {
    beforeEach(() => {
      Users.add('find-by-id-test', 'findbyid@my.yorku.ca', 'password', 'student', new Date().toISOString());
    });

    it('should find user by id', () => {
      const result = Users.findById('find-by-id-test');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe('find-by-id-test');
      expect(result.user.email).toBe('findbyid@my.yorku.ca');
    });

    it('should return error when user not found by id', () => {
      const result = Users.findById('nonexistent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should return all user fields when found by id', () => {
      const result = Users.findById('find-by-id-test');

      expect(result.success).toBe(true);
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('password');
      expect(result.user).toHaveProperty('role');
      expect(result.user).toHaveProperty('createdAt');
    });

    it('should not find user with partial id match', () => {
      const result = Users.findById('find-by-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('all', () => {
    it('should return empty array when no users exist', () => {
      const result = Users.all();

      expect(result.success).toBe(true);
      expect(result.users).toEqual([]);
    });

    it('should return all users', () => {
      Users.add('user-1', 'user1@my.yorku.ca', 'password1', 'student', new Date().toISOString());
      Users.add('user-2', 'user2@my.yorku.ca', 'password2', 'admin', new Date().toISOString());
      Users.add('user-3', 'user3@my.yorku.ca', 'password3', 'student', new Date().toISOString());

      const result = Users.all();

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(3);
    });

    it('should return users with all fields', () => {
      Users.add('complete-user', 'complete@my.yorku.ca', 'password', 'admin', '2024-01-01T00:00:00.000Z');

      const result = Users.all();

      expect(result.success).toBe(true);
      expect(result.users[0]).toHaveProperty('id', 'complete-user');
      expect(result.users[0]).toHaveProperty('email', 'complete@my.yorku.ca');
      expect(result.users[0]).toHaveProperty('password', 'password');
      expect(result.users[0]).toHaveProperty('role', 'admin');
      expect(result.users[0]).toHaveProperty('createdAt', '2024-01-01T00:00:00.000Z');
    });

    it('should return users with different roles', () => {
      Users.add('student-user', 'student@my.yorku.ca', 'password', 'student', new Date().toISOString());
      Users.add('admin-user', 'admin@my.yorku.ca', 'password', 'admin', new Date().toISOString());

      const result = Users.all();

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(2);

      const roles = result.users.map(u => u.role);
      expect(roles).toContain('student');
      expect(roles).toContain('admin');
    });
  });

  describe('update', () => {
    beforeEach(() => {
      Users.add('update-test-id', 'updatetest@my.yorku.ca', 'password', 'student', new Date().toISOString());
    });

    it('should update user role', () => {
      const result = Users.update('update-test-id', { role: 'admin' });

      expect(result.success).toBe(true);

      // Verify the update
      const user = Users.findById('update-test-id');
      expect(user.user.role).toBe('admin');
    });

    it('should update user email', () => {
      const result = Users.update('update-test-id', { email: 'newemail@my.yorku.ca' });

      expect(result.success).toBe(true);

      // Verify the update
      const user = Users.findById('update-test-id');
      expect(user.user.email).toBe('newemail@my.yorku.ca');
    });

    it('should update both role and email simultaneously', () => {
      const result = Users.update('update-test-id', {
        role: 'admin',
        email: 'updated@my.yorku.ca'
      });

      expect(result.success).toBe(true);

      // Verify both updates
      const user = Users.findById('update-test-id');
      expect(user.user.role).toBe('admin');
      expect(user.user.email).toBe('updated@my.yorku.ca');
    });

    it('should return error when no fields to update', () => {
      const result = Users.update('update-test-id', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('No fields to update');
    });

    it('should return error when user not found', () => {
      const result = Users.update('nonexistent-id', { role: 'admin' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should not modify other fields when updating role', () => {
      const originalUser = Users.findById('update-test-id').user;

      Users.update('update-test-id', { role: 'admin' });

      const updatedUser = Users.findById('update-test-id').user;
      expect(updatedUser.email).toBe(originalUser.email);
      expect(updatedUser.password).toBe(originalUser.password);
      expect(updatedUser.createdAt).toBe(originalUser.createdAt);
    });

    it('should handle undefined values in updates object', () => {
      const result = Users.update('update-test-id', {
        role: 'admin',
        email: undefined
      });

      expect(result.success).toBe(true);

      // Only role should be updated
      const user = Users.findById('update-test-id');
      expect(user.user.role).toBe('admin');
      expect(user.user.email).toBe('updatetest@my.yorku.ca');
    });

    it('should change role from admin to student', () => {
      // First make user an admin
      Users.update('update-test-id', { role: 'admin' });

      // Then change back to student
      const result = Users.update('update-test-id', { role: 'student' });

      expect(result.success).toBe(true);

      const user = Users.findById('update-test-id');
      expect(user.user.role).toBe('student');
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      Users.add('delete-test-id', 'deletetest@my.yorku.ca', 'password', 'student', new Date().toISOString());
    });

    it('should successfully delete a user', () => {
      const result = Users.delete('delete-test-id');

      expect(result.success).toBe(true);

      // Verify user no longer exists
      const findResult = Users.findById('delete-test-id');
      expect(findResult.success).toBe(false);
      expect(findResult.error).toBe('User not found');
    });

    it('should return error when deleting nonexistent user', () => {
      const result = Users.delete('nonexistent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should only delete the specified user', () => {
      // Add another user
      Users.add('keep-this-user', 'keepme@my.yorku.ca', 'password', 'student', new Date().toISOString());

      // Delete the first user
      Users.delete('delete-test-id');

      // Verify the other user still exists
      const result = Users.findById('keep-this-user');
      expect(result.success).toBe(true);
      expect(result.user.id).toBe('keep-this-user');
    });

    it('should remove user from all() results after deletion', () => {
      // Verify user exists in all()
      let allUsers = Users.all();
      expect(allUsers.users.some(u => u.id === 'delete-test-id')).toBe(true);

      // Delete user
      Users.delete('delete-test-id');

      // Verify user no longer in all()
      allUsers = Users.all();
      expect(allUsers.users.some(u => u.id === 'delete-test-id')).toBe(false);
    });

    it('should delete admin user', () => {
      Users.add('admin-to-delete', 'admindelete@my.yorku.ca', 'password', 'admin', new Date().toISOString());

      const result = Users.delete('admin-to-delete');

      expect(result.success).toBe(true);

      const findResult = Users.findById('admin-to-delete');
      expect(findResult.success).toBe(false);
    });

    it('should not be able to delete same user twice', () => {
      // First deletion should succeed
      const firstDelete = Users.delete('delete-test-id');
      expect(firstDelete.success).toBe(true);

      // Second deletion should fail
      const secondDelete = Users.delete('delete-test-id');
      expect(secondDelete.success).toBe(false);
      expect(secondDelete.error).toBe('User not found');
    });
  });

  describe('integration scenarios', () => {
    it('should handle full user lifecycle: add, find, update, delete', () => {
      // Add user
      const addResult = Users.add(
        'lifecycle-user',
        'lifecycle@my.yorku.ca',
        'initialPassword',
        'student',
        new Date().toISOString()
      );
      expect(addResult.success).toBe(true);

      // Find by ID
      const findByIdResult = Users.findById('lifecycle-user');
      expect(findByIdResult.success).toBe(true);
      expect(findByIdResult.user.role).toBe('student');

      // Find by email
      const findByEmailResult = Users.getByEmail('lifecycle@my.yorku.ca');
      expect(findByEmailResult.success).toBe(true);

      // Update role to admin
      const updateResult = Users.update('lifecycle-user', { role: 'admin' });
      expect(updateResult.success).toBe(true);

      // Verify update
      const verifyUpdate = Users.findById('lifecycle-user');
      expect(verifyUpdate.user.role).toBe('admin');

      // Delete user
      const deleteResult = Users.delete('lifecycle-user');
      expect(deleteResult.success).toBe(true);

      // Verify deletion
      const verifyDeletion = Users.findById('lifecycle-user');
      expect(verifyDeletion.success).toBe(false);
    });

    it('should handle multiple users with different roles', () => {
      // Add multiple users
      Users.add('student-1', 'student1@my.yorku.ca', 'pass', 'student', new Date().toISOString());
      Users.add('student-2', 'student2@my.yorku.ca', 'pass', 'student', new Date().toISOString());
      Users.add('admin-1', 'admin1@my.yorku.ca', 'pass', 'admin', new Date().toISOString());

      // Get all users
      const allResult = Users.all();
      expect(allResult.users).toHaveLength(3);

      // Count by role
      const students = allResult.users.filter(u => u.role === 'student');
      const admins = allResult.users.filter(u => u.role === 'admin');
      expect(students).toHaveLength(2);
      expect(admins).toHaveLength(1);

      // Promote a student to admin
      Users.update('student-1', { role: 'admin' });

      // Recount
      const updatedAll = Users.all();
      const updatedStudents = updatedAll.users.filter(u => u.role === 'student');
      const updatedAdmins = updatedAll.users.filter(u => u.role === 'admin');
      expect(updatedStudents).toHaveLength(1);
      expect(updatedAdmins).toHaveLength(2);
    });

    it('should maintain data integrity across operations', () => {
      const createdAt = '2024-06-15T12:00:00.000Z';

      // Add user with specific data
      Users.add('integrity-test', 'integrity@my.yorku.ca', 'securePass123', 'student', createdAt);

      // Update email
      Users.update('integrity-test', { email: 'newintegrity@my.yorku.ca' });

      // Verify password and createdAt are unchanged
      const user = Users.findById('integrity-test');
      expect(user.user.password).toBe('securePass123');
      expect(user.user.createdAt).toBe(createdAt);
      expect(user.user.email).toBe('newintegrity@my.yorku.ca');
    });
  });
});
