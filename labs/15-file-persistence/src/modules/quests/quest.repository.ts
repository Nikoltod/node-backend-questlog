import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Quest, QuestStore } from "./quest.types";
import { dirname } from "node:path";

const defaultStore: QuestStore = {
    nextQuestId: 1,
    quests: []
};

export class QuestRepository {
    constructor(private readonly filePath: string) { }

    async findAll() {
        const store = await this.readStore();
        return store.quests;
    }

    async findById(id: number) {
        const store = await this.readStore();
        return store.quests.find((quest) => quest.id === id) ?? null;
    }

    async create(data: Omit<Quest, "id">) {
        const store = await this.readStore();

        const quest: Quest = {
            id: store.nextQuestId,
            ...data,
        }

        store.nextQuestId++;
        store.quests.push(quest);

        await this.writeStore(store);

        return quest;
    }

    async save(udpatedQuest: Quest) {
        const store = await this.readStore();
        const index = store.quests.findIndex((quest) => quest.id === udpatedQuest.id);

        if (index === -1) {
            return null;
        }

        store.quests[index] = udpatedQuest;
        await this.writeStore(store);

        return udpatedQuest;

    }

    private async readStore(): Promise<QuestStore> {
        try {
            const file = await readFile(this.filePath, "utf8");
            return JSON.parse(file) as QuestStore;
        } catch (error) {
            await this.writeStore(defaultStore);
            return structuredClone(defaultStore);
        }
    }

    private async writeStore(store: QuestStore) {
        await mkdir(dirname(this.filePath), {
            recursive: true,
        });

        await writeFile(this.filePath, JSON.stringify(store, null, 2));
    }
}