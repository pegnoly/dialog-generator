import { create } from "zustand";
import { DialogStepVariant } from "../components/types";
import { invoke } from "@tauri-apps/api/core";

type DialogStepStore = {
    inner_counter: number,
    label: string,
    text: string,
    speaker: string | undefined
}

type DialogStepActions = {
    load: (dialog_id: string) => void,
    reset: () => void,
    change_counter: (newCounter: number) => void,
    change_label: (newLabel: string) => void,
    update_text: (newText: string) => void,
    update_speaker: (newSpeaker: string) => void,
    save: (dialog_id: string) => void
}

const useVariantsStore = create<DialogStepStore & DialogStepActions>((set, get) => ({
    inner_counter: -1,
    label: "main",
    text: "",
    speaker: undefined,
    async load(dialog_id) {
        const counter = get().inner_counter;
        const label = get().label;
        await invoke("try_load_variant", {
            dialogId: dialog_id, 
            innerCounter: counter,
            label: label
        }).then((v) => {
            const variant = v as DialogStepVariant;
            set(() => ({text: variant.text, speaker: variant.speaker == "" ? undefined : variant.speaker}))
        });
    }, 
    reset() {
        set(() => ({inner_counter: 0, label: "main"}))
    },
    change_counter(newCounter) {
        set(() => ({inner_counter: newCounter}));
    },
    change_label(newLabel) {
        set(() => ({label: newLabel}));
    },
    update_text(newText) {
        set(() => ({text: newText}))
    },
    update_speaker(newSpeaker) {
        set(() => ({speaker: newSpeaker}))
    },
    async save(dialog_id) {
        await invoke("save_variant", {dialogId: dialog_id, counter: get().inner_counter, label: get().label, speaker: get().speaker, text: get().text});
    },
}))

export default useVariantsStore;