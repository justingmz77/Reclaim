let database = require('../utils/db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const SEEDS_DIR = path.join(__dirname, 'seeds');

// Check for --fresh flag to clear database before seeding
const shouldClearDB = process.argv.includes('--fresh');

const SEED_RESOLVERS = {
    users: async (seedData) => {
        const hashedPassword = await bcrypt.hash(seedData.password, 10);
        return database.Users.add(seedData.id, seedData.email, hashedPassword, seedData.role, seedData.createdAt);
    }
};

function listTables() {
    return database.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
    `).all().map(row => row.name);
}

function dropTable(tableName) {
    const safeName = `"${tableName.replace(/"/g, '""')}"`;
    database.db.exec(`DROP TABLE IF EXISTS ${safeName}`);
}

async function dropAllTables() {
    const tables = listTables();
    if (!tables.length) {
        console.log('No tables to drop.');
        return;
    }

    console.log(`Dropping ${tables.length} tables...`);
    database.db.exec('PRAGMA foreign_keys = OFF');
    database.db.exec('BEGIN');
    tables.forEach(dropTable);
    database.db.exec('COMMIT');
    database.db.exec('PRAGMA foreign_keys = ON');
    database.db.exec('VACUUM');
    console.log('Tables dropped.');

    // Clear all db-related modules from cache
    const dbModulePath = path.resolve(__dirname, '../utils/db');
    Object.keys(require.cache).forEach((key) => {
        if (key.startsWith(dbModulePath)) {
            delete require.cache[key];
        }
    });

    // Reload database module to rebuild tables
    database = require('../utils/db');
    console.log('Tables rebuilt.');
}

async function seed() {
    // Clear database if --fresh flag is provided
    if (shouldClearDB) {
        await dropAllTables();
    }

    // Check if seeds directory exists
    if (!fs.existsSync(SEEDS_DIR)) {
        console.log('No seeds directory found. Skipping seeding.');
        return;
    }

    const seeds = fs.readdirSync(SEEDS_DIR).filter(file => file.endsWith('.json'));

    if (seeds.length === 0) {
        console.log('No seed files found. Skipping seeding.');
        return;
    }

    let seedCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    for (const seed of seeds) {
        const seedName = seed.split('.')[0];
        try {
        const seedData = JSON.parse(fs.readFileSync(path.join(SEEDS_DIR, seed), 'utf8'));
        const resolver = SEED_RESOLVERS[seedName];
        if (!resolver) {
            console.error(`No resolver ${seedName} found for seed: ${seed}`);
            continue;
        }

        // Handle array of seed data
        const dataArray = Array.isArray(seedData) ? seedData : [seedData];

        for (const data of dataArray) {
            try {
            const result = resolver(data);
            console.log(`✓ Seeded ${seedName}: ${result.success ? 'Success' : 'Failed'}`);
            seedCount++;
            } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                errorCount++;
                skipCount++;
            } else {
                console.error(`✗ Error seeding ${seedName}: ${error.message}`);
                errorCount++;
                continue;
            }
            }
        }
        } catch (error) {
        console.error(`✗ Error seeding ${seedName}: ${error.message}`);
        errorCount++;
        continue;
        }
    }

    console.log(`\nSeeding complete: ${seedCount} added, ${skipCount} skipped, ${errorCount} errors`);
};

async function resolveSeed(seedName, seedData) {
    const resolver = SEED_RESOLVERS[seedName];
    if (!resolver) {
        console.error(`No resolver ${seedName} found for seed: ${seed}`);
        return;
    }
    return resolver(seedData);
}

seed().catch(console.error);