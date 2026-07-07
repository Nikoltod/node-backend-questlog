import { Quest } from "./quest.types";

export class QuestRepository {
    private quests: Quest[] = [];
    private nextQuestId = 1;

    findAll() {
        return this.quests;
    }

    findById(id: number) {
        return this.quests.find((quest) => quest.id === id) ?? null;
    }

    create(data: Omit<Quest, "id">) {
        const quest: Quest = {
            id: this.nextQuestId,
            ...data
        };

        this.nextQuestId++
        this.quests.push(quest);

        return quest;
    }


    save(updatedQuest: Quest) {
        const index = this.quests.findIndex((quest) => quest.id === updatedQuest.id);

        if(index === -1){
            return null;
        }

        this.quests[index] = updatedQuest;
        return updatedQuest;
    }
}

