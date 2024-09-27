import { create } from "zustand";
import { Speaker, SpeakerType } from "../components/types";
import { invoke } from "@tauri-apps/api/core";

type SpeakerStore = {
    speakers: Speaker[]
}

type SpeakerStoreActions = {
    load: () => void,
    create: (name: string, script_name: string, color: string, type: SpeakerType) => void
} 

const useSpeakersStore = create<SpeakerStore & SpeakerStoreActions>((set) => ({
    speakers: [],
    async load() {
        await invoke("load_speakers")
            .then((v) => set({speakers: v as Speaker[]}));
    },
    async create(name, script_name, color, type) {
        await invoke("create_speaker", {
            name: name,
            scriptName: script_name,
            color: color,
            speakerType: type
        }).then((v) => set((state) => ({speakers: [...state.speakers, v as Speaker]})));
    },
}));

export default useSpeakersStore;