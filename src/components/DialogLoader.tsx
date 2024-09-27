import useDialogsStore from "../stores/DialogStore"
import { useShallow } from "zustand/shallow"
import { useState } from "react";
import { Button, Modal, Select } from "antd";

export function DialogLoader() {
    const [dialogs, selectDialog] = useDialogsStore(useShallow((state) => [state.dialogs, state.select]));
    
    const [open, setOpen] = useState<boolean>(false);
    const [selectedDialog, setSelectedDialog] = useState<string>("");

    function close() {
        setOpen(false);
    }

    return(
        <>
            <Button onClick={() => setOpen(true)}>Загрузить существующий диалог</Button>
            <Modal
                open={open}
                onCancel={close}
                onClose={close}
                onOk={() => {
                    selectDialog(selectedDialog);
                    setOpen(false);
                }}
            >
                <div style={{width: '80%', display: 'flex', flexDirection: 'row', justifyContent: 'center'}}>
                    <Select 
                        style={{width: '100%'}}
                        onChange={(e) => setSelectedDialog(e)}
                    >
                        {dialogs.map((d, i) => (
                            <Select.Option key={i} value={d.id}>{d.name}</Select.Option>
                        ))}
                    </Select>
                </div>
            </Modal>
        </>
    )
}