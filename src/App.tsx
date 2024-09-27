import { useState } from "react";
import { DialogCreator } from "./components/DialogCreator";
import useSpeakersStore from "./stores/SpeakersStore";
import useDialogsStore from "./stores/DialogStore";
import { VariantDispatcher } from "./components/DialogRenderer";
import { SpeakerCreator } from "./components/SpeakerCreator";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "antd";
import { DialogLoader } from "./components/DialogLoader";

enum AppState {
  NotLoaded,
  Loaded
}

function App() {

  const loadSpeakers = useSpeakersStore((state) => state.load);
  const loadDialogs = useDialogsStore((state) => state.load);

  const currentDialog = useDialogsStore((state) => state.current_dialog);

  // state of app's initialization
  const [state, setState] = useState<AppState>(AppState.NotLoaded);

  if (state == AppState.NotLoaded) {
      setState(AppState.Loaded);
      loadDialogs();
      loadSpeakers();
  }

  return (
    <div>
      <div style={{display: 'flex', flexDirection: 'row', justifyItems: 'center'}}>
        <DialogCreator/>
        <SpeakerCreator/>
        <DialogLoader/>
        <Button
          onClick={() => invoke("generate_lua_code", {dialogId : currentDialog?.id})}
        >Сгенерировать код</Button>
      </div>
        <VariantDispatcher/>
    </div>
  );
}

export default App;