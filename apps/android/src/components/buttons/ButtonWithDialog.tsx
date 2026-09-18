import React from "react";
import Dialog from "../dialog/Dialog";

interface ButtonContainerProps {
  dialogTitle: string;
  visible: boolean;
  isLoading?: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
  children: React.ReactNode;
  dialogButtonAction: () => void;
}

export default function ButtonWithDialog({
  dialogTitle,
  visible,
  isLoading,
  setVisible,
  dialogButtonAction,
  children,
}: ButtonContainerProps) {
  return (
    <React.Fragment>
      <Dialog
        visible={visible}
        isLoading={isLoading}
        title={dialogTitle}
        btnAction={dialogButtonAction}
        setVisible={setVisible}
        btnTitle="Confirm"
      />
      {children}
    </React.Fragment>
  );
}
