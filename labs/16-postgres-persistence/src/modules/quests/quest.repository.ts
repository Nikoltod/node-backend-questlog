import { Quest, QuestDifficulty } from "./quest.types"
import type { Pool } from "pg";

type QuestRow = {
    id: number;
    title: string;
    difficulty: QuestDifficulty;
    completed: boolean;
    created_at: Date;
    completed_at: Date | null;
};

export class QuestRepository {
    constructor(private readonly pool: Pool) { }

    async initialize() {
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS quests (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
        completed BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        completed_at TIMESTAMPTZ NULL
      );
    `);
    }

    async findAll() {
        const result = await this.pool.query<QuestRow>(`
      SELECT id, title, difficulty, completed, created_at, completed_at
      FROM quests
      ORDER BY id ASC;
    `);

        return result.rows.map(this.mapQuestRow);
    }

    async findById(id: number) {
        const result = await this.pool.query<QuestRow>(
            `
        SELECT id, title, difficulty, completed, created_at, completed_at
        FROM quests
        WHERE id = $1;
      `,
            [id]
        );

        const row = result.rows[0];

        if (!row) {
            return null;
        }

        return this.mapQuestRow(row);
    }

    async create(data: {
        title: string;
        difficulty: QuestDifficulty;
        completed: boolean;
        createdAt: string;
        completedAt: string | null;
    }) {
        const result = await this.pool.query<QuestRow>(
            `
        INSERT INTO quests (title, difficulty, completed, created_at, completed_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, title, difficulty, completed, created_at, completed_at;
      `,
            [
                data.title,
                data.difficulty,
                data.completed,
                data.createdAt,
                data.completedAt,
            ]
        );

        return this.mapQuestRow(result.rows[0]);
    }

    async save(updatedQuest: Quest) {
        const result = await this.pool.query<QuestRow>(
            `
        UPDATE quests
        SET title = $1,
            difficulty = $2,
            completed = $3,
            completed_at = $4
        WHERE id = $5
        RETURNING id, title, difficulty, completed, created_at, completed_at;
      `,
            [
                updatedQuest.title,
                updatedQuest.difficulty,
                updatedQuest.completed,
                updatedQuest.completedAt,
                updatedQuest.id,
            ]
        );

        const row = result.rows[0];

        if (!row) {
            return null;
        }

        return this.mapQuestRow(row);
    }

    private mapQuestRow(row: QuestRow): Quest {
        return {
            id: row.id,
            title: row.title,
            difficulty: row.difficulty,
            completed: row.completed,
            createdAt: row.created_at.toISOString(),
            completedAt: row.completed_at?.toISOString() ?? null,
        };
    }
}