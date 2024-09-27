import {create} from "zustand";
import { Dialog } from "../components/types";
import { invoke } from "@tauri-apps/api/core";


type DialogStore = {
    dialogs: Dialog[],
    current_dialog: Dialog
}

type DialogStoreActions = {
    load: () => void,
    create: (name: string, directory: string, script_name: string, speakers: string[]) => void,
    addLabel: (label: string) => void,
    select: (dialog_id: string) => void
} 

const useDialogsStore = create<DialogStore & DialogStoreActions>((set, get) => ({
    dialogs: [],
    current_dialog: {name: "", script_name: "", id: undefined, speakers_ids: [], labels: ["main"]},
    async load() {
        await invoke("load_dialogs")
            .then((v) => set({dialogs: v as Dialog[]}));
    },
    async create(name, directory, script_name, speakers) {
        await invoke("create_dialog", {
            name: name,
            scriptName: script_name,
            directory: directory,
            speakers: speakers
        }).then((v) => {
            console.log("Dialog created: ", v);
            set((state) => ({dialogs: [...state.dialogs, v as Dialog], current_dialog: v as Dialog}))
        });
    },
    async select(dialog_id) {
        await invoke("select_dialog", {dialogId: dialog_id})
            .then((v) => set(() => ({current_dialog: v as Dialog})))
    },
    async addLabel(label) {
        console.log("Here, ", get().current_dialog);
        const labels = get().current_dialog.labels;
        const updatedLabels = [...labels, label];
        set((state) => ({current_dialog: {...state.current_dialog, labels: updatedLabels}}));
        await invoke("update_labels", {dialogId: get().current_dialog.id, labels: updatedLabels});
    },
}));

export default useDialogsStore;