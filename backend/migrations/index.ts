import SequelizeMain, { Sequelize, QueryInterface } from 'sequelize';

/**
 * Migration Script: Enhanced Event Schema with Hierarchy Support
 * This script migrates from the simple event structure to hierarchical tasks with subtasks
 */

class EventSchemaMigration {
	private sequelize: Sequelize;
	private queryInterface: QueryInterface;
	private backupTimestamp: number;

	constructor(sequelize: Sequelize) {
		this.sequelize = sequelize;
		this.queryInterface = sequelize.getQueryInterface();
		this.backupTimestamp = Date.now();
	}

	/**
	 * Run the complete migration
	 */
	async migrate(): Promise<void> {
		console.log('🚀 Starting Enhanced Event Schema Migration...');

		try {
			// Step 1: Backup existing data
			await this.backupExistingData();

			// Step 2: Add new columns
			await this.addNewColumns();

			// Step 3: Migrate existing data
			await this.migrateExistingData();

			// Step 4: Create indexes
			await this.createIndexes();

			// Step 5: Update constraints
			await this.updateConstraints();

			console.log('✅ Migration completed successfully!');
		} catch (error) {
			console.error('❌ Migration failed:', error);
			throw error;
		}
	}

	/**
	 * Backup existing events data
	 */
	private async backupExistingData(): Promise<void> {
		console.log('📋 Checking for existing events table before backup...');
		let eventsTableExists = false;
		try {
			await this.queryInterface.describeTable('events');
			eventsTableExists = true;
			console.log('✅ events table found.');
		} catch (error) {
			console.log('ℹ️  events table does not exist or error describing it. Skipping backup.');
		}

		if (eventsTableExists) {
			console.log('📋 Creating backup of existing events...');
			await this.queryInterface.createTable('events_backup_' + this.backupTimestamp, {
				id: { type: SequelizeMain.STRING, primaryKey: true },
				uid: { type: SequelizeMain.STRING },
				resource_id: { type: SequelizeMain.STRING },
				resourceid: { type: SequelizeMain.STRING },
				start: { type: SequelizeMain.DATE },
				end: { type: SequelizeMain.DATE }, // Fixed: was 'ending'
				ending: { type: SequelizeMain.DATE }, // Keep both in case old data uses 'ending'
				title: { type: SequelizeMain.STRING },
				time: { type: SequelizeMain.DATE },
				isdone: { type: SequelizeMain.BOOLEAN },
				is_done: { type: SequelizeMain.BOOLEAN }, // Keep both naming conventions
				description: { type: SequelizeMain.TEXT },
				assignee: { type: SequelizeMain.ARRAY(SequelizeMain.STRING) },
			});

			await this.sequelize.query(`
				INSERT INTO events_backup_${this.backupTimestamp} 
				SELECT * FROM events
			`);
			console.log('✅ Backup created successfully');
		}
	}

	/**
	 * Add new columns to events table
	 */
	private async addNewColumns(): Promise<void> {
		console.log('🔧 Ensuring events table structure and adding new columns...');
		let eventsTableExists = false;
		try {
			await this.queryInterface.describeTable('events');
			eventsTableExists = true;
			console.log('✅ events table found.');
		} catch (error) {
			console.log('ℹ️  events table does not exist. It will be created.');
		}

		if (!eventsTableExists) {
			try {
				console.log('🚧 Creating base events table...');
				await this.queryInterface.createTable('events', {
					id: { type: SequelizeMain.STRING, primaryKey: true, allowNull: false },
					uid: { type: SequelizeMain.STRING, allowNull: false },
					resource_id: { type: SequelizeMain.STRING, allowNull: true },
					start: { type: SequelizeMain.DATE, allowNull: true },
					end: { type: SequelizeMain.DATE, allowNull: true }, // Fixed: was 'ending'
					title: { type: SequelizeMain.STRING, allowNull: false },
					time: { type: SequelizeMain.DATE, allowNull: true },
					isdone: { type: SequelizeMain.BOOLEAN, defaultValue: false, allowNull: true },
					description: { type: SequelizeMain.TEXT, allowNull: true }, // Fixed: TEXT instead of STRING
					assignee: {
						type: SequelizeMain.ARRAY(SequelizeMain.STRING),
						defaultValue: [],
						allowNull: true,
					},
					created_at: {
						type: SequelizeMain.DATE,
						allowNull: false,
						defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
					},
					updated_at: {
						type: SequelizeMain.DATE,
						allowNull: false,
						defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
					},
				});
				console.log('✅ Base events table created successfully.');
			} catch (creationError) {
				console.error('❌ Failed to create base events table:', creationError);
				throw creationError;
			}
		}

		console.log('🔧 Adding/Updating columns as per migration definition...');
		const newColumns = [
			// Enhanced Content - Fixed to use TEXT instead of JSON
			{
				name: 'content',
				definition: {
					type: SequelizeMain.TEXT,
					allowNull: true,
					comment: 'MDX content for rich text and components',
				},
			},
			// Missing isAllDay field - maps to is_all_day in DB
			{
				name: 'is_all_day',
				definition: {
					type: SequelizeMain.BOOLEAN,
					defaultValue: false,
					allowNull: false,
				},
			},
			// Hierarchy Fields
			{
				name: 'parent_id',
				definition: {
					type: SequelizeMain.STRING,
					allowNull: true,
					references: {
						model: 'events',
						key: 'id',
					},
					comment: 'Parent task ID for subtasks',
				},
			},
			{
				name: 'hierarchy_level',
				definition: {
					type: SequelizeMain.INTEGER,
					defaultValue: 0,
					comment: '0 = root task, 1 = subtask, 2 = sub-subtask, etc.',
				},
			},
			{
				name: 'hierarchy_path',
				definition: {
					type: SequelizeMain.STRING,
					allowNull: true,
					comment: 'Materialized path for efficient queries',
				},
			},
			{
				name: 'sort_order',
				definition: {
					type: SequelizeMain.INTEGER,
					defaultValue: 0,
					comment: 'Order within same parent/level',
				},
			},
			// Task Management Fields
			{
				name: 'priority',
				definition: {
					type: SequelizeMain.STRING,
					defaultValue: 'medium',
					comment: 'Task priority: low, medium, high, urgent',
				},
			},
			{
				name: 'status',
				definition: {
					type: SequelizeMain.STRING,
					defaultValue: 'todo',
					comment: 'Task status: todo, in_progress, review, done, cancelled',
				},
			},
			{
				name: 'estimated_hours',
				definition: {
					type: SequelizeMain.INTEGER,
					allowNull: true,
					comment: 'Estimated time in hours',
				},
			},
			{
				name: 'actual_hours',
				definition: {
					type: SequelizeMain.INTEGER,
					allowNull: true,
					comment: 'Actual time spent in hours',
				},
			},
			{
				name: 'progress_percentage',
				definition: {
					type: SequelizeMain.INTEGER,
					defaultValue: 0,
					comment: 'Progress percentage 0-100',
				},
			},
			// Dependencies
			{
				name: 'depends_on',
				definition: {
					type: SequelizeMain.ARRAY(SequelizeMain.STRING),
					defaultValue: [],
					comment: 'Array of task IDs this task depends on',
				},
			},
			{
				name: 'blocks',
				definition: {
					type: SequelizeMain.ARRAY(SequelizeMain.STRING),
					defaultValue: [],
					comment: 'Array of task IDs this task blocks',
				},
			},
			// Metadata
			{
				name: 'tags',
				definition: {
					type: SequelizeMain.ARRAY(SequelizeMain.STRING),
					defaultValue: [],
				},
			},
			{
				name: 'created_by',
				definition: {
					type: SequelizeMain.STRING,
					allowNull: true,
				},
			},
			{
				name: 'updated_by',
				definition: {
					type: SequelizeMain.STRING,
					allowNull: true,
				},
			},
			{
				name: 'archived',
				definition: {
					type: SequelizeMain.BOOLEAN,
					defaultValue: false,
				},
			},
			{
				name: 'archived_at',
				definition: {
					type: SequelizeMain.DATE,
					allowNull: true,
				},
			},
		];

		for (const column of newColumns) {
			try {
				await this.queryInterface.addColumn('events', column.name, column.definition);
				console.log(`✅ Added column: ${column.name}`);
			} catch (error) {
				console.log(`⚠️  Column ${column.name} might already exist, skipping...`);
			}
		}

		// Ensure timestamps exist (created_at, updated_at)
		const timestampColumns = [
			{
				name: 'created_at',
				definition: {
					type: SequelizeMain.DATE,
					allowNull: false,
					defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
				},
			},
			{
				name: 'updated_at',
				definition: {
					type: SequelizeMain.DATE,
					allowNull: false,
					defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
				},
			},
		];

		for (const column of timestampColumns) {
			try {
				await this.queryInterface.addColumn('events', column.name, column.definition);
				console.log(`✅ Added timestamp column: ${column.name}`);
			} catch (error) {
				console.log(`⚠️  Timestamp column ${column.name} might already exist, skipping...`);
			}
		}

		// Handle column renames/migrations
		try {
			// If 'ending' column exists, migrate data to 'end' and drop 'ending'
			const tableDescription = await this.queryInterface.describeTable('events');
			if (tableDescription.ending && !tableDescription.end) {
				console.log('🔄 Migrating "ending" column to "end"...');
				await this.queryInterface.addColumn('events', 'end', {
					type: SequelizeMain.DATE,
					allowNull: true,
				});
				await this.sequelize.query('UPDATE events SET "end" = ending WHERE ending IS NOT NULL');
				console.log('✅ Migrated "ending" to "end"');
			}

			// Migrate isdone to status if needed
			if (tableDescription.isdone && !tableDescription.status) {
				console.log('🔄 Migrating "isdone" to "status"...');
				await this.sequelize.query(`
					UPDATE events 
					SET status = CASE 
						WHEN isdone = true THEN 'done' 
						ELSE 'todo' 
					END
					WHERE status IS NULL
				`);
				console.log('✅ Migrated "isdone" to "status"');
			}
		} catch (error: any) {
			console.log('⚠️  Column migration error (might be expected):', error.message);
		}
	}

	/**
	 * Migrate existing event data to new structure
	 */
	private async migrateExistingData(): Promise<void> {
		console.log('📊 Migrating existing event data...');

		// Get all existing events
		const existingEvents = await this.sequelize.query(
			'SELECT * FROM events WHERE hierarchy_level IS NULL OR hierarchy_level = 0',
			{ type: SequelizeMain.QueryTypes.SELECT }
		);

		console.log(`Found ${existingEvents.length} events to migrate`);

		for (const event of existingEvents as any[]) {
			// Determine status from isdone
			let status = 'todo';
			let progress = 0;

			if (event.isdone === true || event.is_done === true) {
				status = 'done';
				progress = 100;
			} else if (event.status) {
				status = event.status;
			}

			// Set hierarchy path for root tasks
			const hierarchyPath = event.id;

			// Use description as content if content is empty
			let content = event.content;
			if (!content && event.description) {
				content = event.description;
			}

			await this.sequelize.query(
				`
				UPDATE events 
				SET 
					content = COALESCE(:content, description),
					hierarchy_level = COALESCE(hierarchy_level, 0),
					hierarchy_path = COALESCE(hierarchy_path, :hierarchyPath),
					status = COALESCE(status, :status),
					progress_percentage = COALESCE(progress_percentage, :progress),
					is_all_day = COALESCE(is_all_day, false),
					priority = COALESCE(priority, 'medium'),
					sort_order = COALESCE(sort_order, 0),
					depends_on = COALESCE(depends_on, ARRAY[]::text[]),
					blocks = COALESCE(blocks, ARRAY[]::text[]),
					tags = COALESCE(tags, ARRAY[]::text[]),
					assignee = COALESCE(assignee, ARRAY[]::text[]),
					archived = COALESCE(archived, false),
					created_at = COALESCE(created_at, time, CURRENT_TIMESTAMP),
					updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
				WHERE id = :eventId
			`,
				{
					replacements: {
						content,
						hierarchyPath,
						status,
						progress,
						eventId: event.id,
					},
				}
			);
		}

		console.log('✅ Event data migration completed');
	}

	/**
	 * Create necessary indexes for performance
	 */
	private async createIndexes(): Promise<void> {
		console.log('🔍 Creating indexes...');

		const indexes = [
			{
				name: 'idx_events_uid_parent',
				fields: ['uid', 'parent_id'],
			},
			{
				name: 'idx_events_hierarchy_path',
				fields: ['hierarchy_path'],
			},
			{
				name: 'idx_events_status_priority',
				fields: ['status', 'priority'],
			},
			{
				name: 'idx_events_assignee_gin',
				fields: ['assignee'],
				options: { using: 'gin' },
			},
			{
				name: 'idx_events_depends_on_gin',
				fields: ['depends_on'],
				options: { using: 'gin' },
			},
			{
				name: 'idx_events_tags_gin',
				fields: ['tags'],
				options: { using: 'gin' },
			},
			{
				name: 'idx_events_dates',
				fields: ['start', 'end'], // Fixed: was 'ending'
			},
			{
				name: 'idx_events_archived',
				fields: ['archived', 'archived_at'],
			},
		];

		for (const index of indexes) {
			try {
				await this.queryInterface.addIndex('events', index.fields, {
					name: index.name,
					...index.options,
				});
				console.log(`✅ Created index: ${index.name}`);
			} catch (error) {
				console.log(`⚠️  Index ${index.name} might already exist, skipping...`);
			}
		}
	}

	/**
	 * Update table constraints
	 */
	private async updateConstraints(): Promise<void> {
		console.log('🔒 Updating constraints...');

		// Add check constraints
		const constraints = [
			{
				name: 'chk_priority_valid',
				check: "priority IN ('low', 'medium', 'high', 'urgent')",
			},
			{
				name: 'chk_status_valid',
				check: "status IN ('todo', 'in_progress', 'review', 'done', 'cancelled')",
			},
			{
				name: 'chk_progress_percentage_range',
				check: 'progress_percentage >= 0 AND progress_percentage <= 100',
			},
			{
				name: 'chk_hierarchy_level_positive',
				check: 'hierarchy_level >= 0',
			},
		];

		for (const constraint of constraints) {
			try {
				await this.sequelize.query(`
					ALTER TABLE events 
					ADD CONSTRAINT ${constraint.name} 
					CHECK (${constraint.check})
				`);
				console.log(`✅ Added constraint: ${constraint.name}`);
			} catch (error) {
				console.log(`⚠️  Constraint ${constraint.name} might already exist, skipping...`);
			}
		}
	}

	/**
	 * Rollback migration (use with caution!)
	 */
	async rollback(): Promise<void> {
		console.log('⏪ Rolling back migration...');

		// Find the most recent backup table
		const backupTables = await this.sequelize.query(
			`
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_name LIKE 'events_backup_%'
			ORDER BY table_name DESC
			LIMIT 1
		`,
			{ type: SequelizeMain.QueryTypes.SELECT }
		);

		if (backupTables.length === 0) {
			throw new Error('No backup table found for rollback');
		}

		const backupTableName = (backupTables[0] as any).table_name;

		// Restore from backup
		await this.sequelize.query(`DROP TABLE events`);
		await this.sequelize.query(`ALTER TABLE ${backupTableName} RENAME TO events`);

		console.log('✅ Rollback completed');
	}
}

// Migration execution script
export async function runMigration(sequelize: Sequelize): Promise<void> {
	const migration = new EventSchemaMigration(sequelize);
	await migration.migrate();
}

export async function rollbackMigration(sequelize: Sequelize): Promise<void> {
	const migration = new EventSchemaMigration(sequelize);
	await migration.rollback();
}

// CLI execution
if (require.main === module) {
	const dbName = 'calendar';
	const dbUser = process.env.DB_USER || 'postgres';
	const dbPassword = process.env.DB_PASSWORD || 'password';
	const dbHost = process.env.DB_HOST || '127.0.0.1';
	const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
	const defaultPostgresDbName = 'postgres';

	const main = async () => {
		// Step 1: Ensure the target database exists
		const adminSequelizeConfig = {
			dialect: 'postgres' as const,
			logging: false,
		};
		const adminSequelize = new Sequelize(
			`postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${defaultPostgresDbName}`,
			adminSequelizeConfig
		);

		try {
			console.log(`Checking if database '${dbName}' exists...`);
			const [results]: [any[], any] = await adminSequelize.query(
				`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`
			);

			if (results.length === 0) {
				console.log(`Database '${dbName}' does not exist. Creating...`);
				await adminSequelize.query(`CREATE DATABASE ${dbName}`);
				console.log(`Database '${dbName}' created successfully.`);
			} else {
				console.log(`Database '${dbName}' already exists.`);
			}
		} catch (dbError) {
			console.error(`Error during database setup for '${dbName}':`, dbError);
			process.exit(1);
		} finally {
			await adminSequelize.close();
		}

		// Step 2: Connect to the target database for migrations/rollbacks
		const sequelizeConfig = {
			dialect: 'postgres' as const,
			logging: console.log,
		};
		const sequelize = new Sequelize(
			`postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`,
			sequelizeConfig
		);

		try {
			const command = process.argv[2];
			console.log(`Executing command: ${command || 'none'}`);

			if (command === 'migrate') {
				await runMigration(sequelize);
				console.log('🎉 Migration completed successfully!');
			} else if (command === 'rollback') {
				await rollbackMigration(sequelize);
				console.log('🎉 Rollback completed successfully!');
			} else {
				console.log('Usage: ts-node <path-to-this-file> [migrate|rollback]');
				process.exitCode = 1;
			}
		} catch (operationError) {
			console.error(`💥 Operation '${process.argv[2]}' failed:`, operationError);
			process.exitCode = 1;
		} finally {
			await sequelize.close();
			if (process.exitCode === 1) {
				process.exit(1);
			} else {
				process.exit(0);
			}
		}
	};

	main().catch(error => {
		console.error('💥 Critical error in script execution:', error);
		process.exit(1);
	});
}
