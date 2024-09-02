import { useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import Box from '@mui/material/Box';

import "./App.css";
import { Button, Stack } from "@mui/material";
import { DialogLoader } from "./components/DialogLoader";
import { Dialog, DialogCreator } from "./components/DialogCreator";
import { Speaker, SpeakerCreator } from "./components/SpeakerCreator";
import { StepRenderer } from "./components/StepRenderer";

enum AppState {
  NotLoaded,
  Loaded
}

function App() {
  // state of app's initialization
  const [state, setState] = useState<AppState>(AppState.NotLoaded);
  // all existing dialogs
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  // currently loaded dialog
  const [currentDialog, setCurrentDialog] = useState<Dialog | null>(null);
  // all existing speakers
  const [speakers, setSpeakers] = useState<Speaker[]>([]);

  if (state == AppState.NotLoaded) {
    setState(AppState.Loaded);
    invoke("load_existing_data");
  }

  listen<Dialog[]>("existing_dialogs_loaded", (event) => {
    setDialogs(event.payload)
  });

  listen<Speaker[]>("existing_speakers_loaded", (event) => {
    setSpeakers(event.payload)
  });

  function dialogCreatedCallback(newDialog: Dialog) {
    setDialogs([
      ...dialogs,
      newDialog
    ]);
    setCurrentDialog(newDialog);
  }

  function speakerCreatedCallback(newSpeaker: Speaker) {
    setSpeakers([
      ...speakers,
      newSpeaker
    ])
  }

  return (
    <div>
      <Box sx={{ minWidth: 120 }}>
        <Stack 
          direction="row" 
          spacing={5} 
          alignContent="center" 
          marginLeft={5}
        >
          <DialogCreator
            onDialogCreated={dialogCreatedCallback}
            speakersModels={speakers}
          />
          <DialogLoader 
            models={
              dialogs.map((dialog, _) => ({
                name: dialog.name, id: dialog.id
              }))
            }></DialogLoader>
          <SpeakerCreator
            onSpeakerCreated={speakerCreatedCallback}
          />
        </Stack>
        <StepRenderer
          currentDialogId={currentDialog != null ? currentDialog?.id : undefined}
          speakersModels={
            currentDialog != null ? 
            speakers.filter((sp) => currentDialog.speakers_ids.find((id) => sp.id == id)) : 
            []
          }
        />
      </Box>
      <Button
        sx={{
          position: "relative",
          top: 50,
          left: 300
        }}
        onClick={() => invoke("generate_lua_code", {dialogId : currentDialog?.id})}
      >Сгенерировать код</Button>
    </div>
  );
}

export default App;